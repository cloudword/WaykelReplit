import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, insertTransporterSchema, insertVehicleSchema, insertRideSchema, insertBidSchema, insertDocumentSchema,
  insertRoleSchema, insertUserRoleSchema, insertSavedAddressSchema, insertDriverApplicationSchema, PERMISSIONS, VEHICLE_TYPES,
  type Ride
} from "@shared/schema";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { getSpacesStorage, getDocumentStoragePath, ObjectNotFoundError as SpacesNotFoundError } from "./spacesStorage";
import { 
  authLimiter, 
  sensitiveAuthLimiter, 
  protectedLimiter, 
  bidLimiter, 
  marketplaceLimiter, 
  uploadLimiter,
  heavyOperationLimiter
} from "./rate-limiter";

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "waykel-jwt-secret-change-in-production";
const JWT_CUSTOMER_EXPIRES_IN = "1h";      // Customer portal: 1 hour
const JWT_ADMIN_EXPIRES_IN = "30m";        // Admin/Transporter: 30 minutes
const JWT_EXPIRES_IN = JWT_CUSTOMER_EXPIRES_IN; // Default for backward compatibility

// Sanitize request body to remove sensitive data before logging
const sanitizeRequestBody = (body: any): any => {
  if (!body) return null;
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
};

// Normalize phone numbers - strip +91, spaces, dashes for consistent lookup
const normalizePhone = (phone: string): string => {
  if (!phone) return phone;
  // Remove all non-digits
  let normalized = phone.replace(/\D/g, '');
  // Remove leading 91 (India country code) if number is longer than 10 digits
  if (normalized.length === 12 && normalized.startsWith('91')) {
    normalized = normalized.slice(2);
  }
  // Remove leading 0 if number is 11 digits (trunk prefix)
  if (normalized.length === 11 && normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }
  // Validate final length
  if (normalized.length !== 10) {
    throw new Error('Invalid phone number format. Must be 10 digits.');
  }
  return normalized;
};

// Extend Request type to include tokenUser
declare global {
  namespace Express {
    interface Request {
      tokenUser?: {
        id: string;
        role: string;
        isSuperAdmin?: boolean;
        transporterId?: string;
      };
    }
  }
}

// JWT Token Verification Middleware - extracts user from Bearer token if present
const extractTokenUser = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        role: string;
        isSuperAdmin?: boolean;
        transporterId?: string;
      };
      req.tokenUser = decoded;
    } catch (err) {
      // Token invalid - continue without tokenUser (may still have session)
    }
  }
  next();
};

// Helper to get current user from either session or token
const getCurrentUser = (req: Request) => {
  return req.session?.user || req.tokenUser;
};

// Authentication Middleware - supports both session and token auth
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in or provide a valid Bearer token." });
  }
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in or provide a valid Bearer token." });
  }
  if (!user.isSuperAdmin && user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const requireDriverOrTransporter = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in or provide a valid Bearer token." });
  }
  const role = user.role;
  if (role !== "driver" && role !== "transporter" && !user.isSuperAdmin) {
    return res.status(403).json({ error: "Driver or transporter access required" });
  }
  next();
};

const requireAdminOrOwner = (getOwnerId: (req: Request) => string | undefined) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required. Please log in or provide a valid Bearer token." });
    }
    const ownerId = getOwnerId(req);
    const isOwner = ownerId === user.id || ownerId === user.transporterId;
    const isAdmin = user.isSuperAdmin || user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Access denied. You can only access your own data." });
    }
    next();
  };
};

// Helper to check Spaces file access based on organized path structure
async function checkSpacesFileAccess(
  key: string,
  user: { id: string; role: string; transporterId?: string; isSuperAdmin?: boolean },
  storageInterface: typeof storage
): Promise<boolean> {
  // Normalize and validate key to prevent path traversal attacks
  const normalizedKey = key.replace(/\.\./g, '').replace(/\/+/g, '/');
  if (normalizedKey !== key) {
    return false; // Reject suspicious paths
  }

  // Admins can access all files
  if (user.isSuperAdmin || user.role === "admin") {
    return true;
  }

  // Check transporter-owned paths using safe prefix matching
  if (user.transporterId) {
    const transporterPrefix = `/transporters/${user.transporterId}/`;
    if (key.includes(transporterPrefix)) {
      return true;
    }
  }

  // Check driver-owned paths (drivers can access their own folder)
  const driverPrefix = `/drivers/${user.id}/`;
  if (key.includes(driverPrefix)) {
    return true;
  }

  // Check customer-owned paths
  const customerPrefix = `/customers/${user.id}/`;
  if (key.includes(customerPrefix)) {
    return true;
  }

  // Check trip paths - need to verify user has access to the ride
  // Handles both:
  // - trips/{rideId}/transporter/ or trips/{rideId}/customer/ (specific owner type)
  // - trips/{rideId}/ (fallback path without owner type)
  const tripMatchWithOwner = key.match(/\/trips\/([^\/]+)\/(transporter|customer)/);
  const tripMatchFallback = key.match(/\/trips\/([^\/]+)(?:\/|$)/);
  
  const tripMatch = tripMatchWithOwner || tripMatchFallback;
  if (tripMatch) {
    const rideId = tripMatch[1];
    const tripOwnerType = tripMatchWithOwner ? tripMatchWithOwner[2] : null;

    try {
      const ride = await storageInterface.getRide(rideId);
      if (ride) {
        // For owner-specific paths, check the specific ownership
        if (tripOwnerType === "transporter" && user.transporterId && ride.transporterId === user.transporterId) {
          return true;
        }
        if (tripOwnerType === "customer" && ride.createdById === user.id) {
          return true;
        }
        
        // For fallback paths (no owner type) or assigned drivers, check any valid relationship
        if (!tripOwnerType) {
          // User is the transporter who owns the ride
          if (user.transporterId && ride.transporterId === user.transporterId) {
            return true;
          }
          // User is the customer who created the ride
          if (ride.createdById === user.id) {
            return true;
          }
        }
        
        // Assigned driver can always access trip documents (any path type)
        if (ride.assignedDriverId === user.id) {
          return true;
        }
      }
    } catch {
      // Ride not found or error - deny access
    }
  }

  return false;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Apply JWT token extraction middleware to all routes
  app.use(extractTokenUser);

  // API Logging Middleware - logs all API requests
  app.use(async (req: Request, res: Response, next: NextFunction) => {
    // Skip logging for health checks and static assets
    if (req.path === '/api/health' || !req.path.startsWith('/api')) {
      return next();
    }

    const startTime = Date.now();
    const user = getCurrentUser(req);
    const origin = req.headers.origin || '';
    const isExternal = origin && !origin.includes(req.headers.host || '');
    
    // Capture original res.json to log response
    const originalJson = res.json.bind(res);
    let responseLogged = false;
    
    res.json = (body: any) => {
      if (!responseLogged) {
        responseLogged = true;
        const responseTime = Date.now() - startTime;
        
        // Log asynchronously to not block response - with error handling
        storage.createApiLog({
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          userId: user?.id || null,
          userRole: user?.role || null,
          origin: origin || null,
          userAgent: req.headers['user-agent'] || null,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          requestBody: req.method !== 'GET' ? sanitizeRequestBody(req.body) : null,
          responseTime,
          errorMessage: res.statusCode >= 400 ? (body?.error || body?.message || null) : null,
          isExternal: !!isExternal,
        }).catch(err => {
          // Don't let logging failures affect the response
          console.error('[routes] API log failed:', err instanceof Error ? err.message : 'Unknown error');
        });
      }
      return originalJson(body);
    };
    
    next();
  });

  // Health check endpoint for Docker and load balancers
  app.get("/api/health", async (req, res) => {
    try {
      // Test database connectivity
      await storage.getAllRides();
      res.json({ 
        status: "healthy", 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "connected"
      });
    } catch (error) {
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: "disconnected"
      });
    }
  });

  // Auth routes - with rate limiting
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      // Normalize phone before parsing
      if (req.body.phone) {
        req.body.phone = normalizePhone(req.body.phone);
      }
      const data = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      if (data.email) {
        const existingEmail = await storage.getUserByEmail(data.email);
        if (existingEmail) {
          return res.status(400).json({ error: "Email already registered" });
        }
      }

      const existingPhone = await storage.getUserByPhone(data.phone);
      if (existingPhone) {
        return res.status(400).json({ error: "Phone number already registered" });
      }

      let transporterId: string | undefined;
      
      // If registering as transporter, create a transporter record first
      if (data.role === "transporter") {
        const transporterData = {
          companyName: req.body.companyName || `${data.name}'s Transport`,
          ownerName: data.name,
          contact: data.phone,
          email: data.email,
          location: req.body.location || req.body.city || "India",
          baseCity: req.body.city || req.body.location || "India",
          fleetSize: req.body.fleetSize || 1,
          status: "pending_approval" as const,
          isVerified: false,
        };
        
        const transporter = await storage.createTransporter(transporterData);
        transporterId = transporter.id;
      }

      const user = await storage.createUser({ 
        ...data, 
        password: hashedPassword,
        transporterId 
      });
      const { password, ...userWithoutPassword } = user;
      
      // If an admin is already logged in (creating a user on behalf of someone),
      // don't regenerate the session - just return the new user data
      const currentUser = req.session?.user;
      if (currentUser && currentUser.isSuperAdmin) {
        return res.json(userWithoutPassword);
      }
      
      // Check if this is a cross-origin request (from customer portal)
      // In that case, return a JWT token for immediate authentication
      const origin = req.headers.origin;
      const isCrossOrigin = origin && !origin.includes(req.headers.host || '');
      
      if (isCrossOrigin) {
        // Generate JWT token for cross-origin registration (customer portal)
        const tokenPayload = {
          id: user.id,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin || false,
          transporterId: user.transporterId || undefined,
        };
        // Use role-based expiry
        const expiresIn = (user.role === "admin" || user.role === "transporter") 
          ? JWT_ADMIN_EXPIRES_IN 
          : JWT_CUSTOMER_EXPIRES_IN;
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn });
        
        return res.json({
          ...userWithoutPassword,
          token,
          tokenType: "Bearer",
          expiresIn
        });
      }
      
      // For same-origin self-registration, create a session for the new user
      req.session.user = {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        transporterId: transporterId || user.transporterId || undefined,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error during registration:", saveErr);
          return res.status(500).json({ error: "Session save failed" });
        }
        res.json({ ...userWithoutPassword, transporterId });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { password, username } = req.body;
      // Normalize phone for lookup
      const phone = req.body.phone ? normalizePhone(req.body.phone) : undefined;
      
      let user;
      if (username) {
        user = await storage.getUserByUsername(username);
      }
      if (!user && phone) {
        user = await storage.getUserByPhone(phone);
      }
      // Also try looking up by phone using the username value (for flexible login)
      if (!user && username) {
        const normalizedUsername = normalizePhone(username);
        user = await storage.getUserByPhone(normalizedUsername);
      }
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.role === "transporter" && user.transporterId) {
        const transporter = await storage.getTransporter(user.transporterId);
        if (transporter) {
          // Only block suspended transporters - pending ones can login but with limited functionality
          if (transporter.status === "suspended") {
            return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
          }
        }
      }

      // Set session user directly without regenerate (more compatible with various session stores)
      req.session.user = {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        transporterId: user.transporterId || undefined,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error during login:", saveErr);
          return res.status(500).json({ error: "Session save error: " + (saveErr.message || "Failed to save session") });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      res.status(400).json({ error: "Login failed" });
    }
  });

  // Token-based authentication endpoint for server-to-server communication
  // Returns a JWT token that can be used as Bearer token in Authorization header
  app.post("/api/auth/token", authLimiter, async (req, res) => {
    try {
      const { phone, password, username } = req.body;
      
      let user;
      if (username) {
        user = await storage.getUserByUsername(username);
      }
      if (!user && phone) {
        user = await storage.getUserByPhone(phone);
      }
      if (!user && username) {
        user = await storage.getUserByPhone(username);
      }
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.role === "transporter" && user.transporterId) {
        const transporter = await storage.getTransporter(user.transporterId);
        if (transporter) {
          // Only block suspended transporters for token auth too
          if (transporter.status === "suspended") {
            return res.status(403).json({ error: "Your account has been suspended." });
          }
        }
      }

      // Generate JWT token with role-based expiry
      const tokenPayload = {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        transporterId: user.transporterId || undefined,
      };

      // Use shorter expiry for admin/transporter users
      const expiresIn = (user.role === "admin" || user.role === "transporter") 
        ? JWT_ADMIN_EXPIRES_IN 
        : JWT_CUSTOMER_EXPIRES_IN;
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn });
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({
        token,
        expiresIn,
        tokenType: "Bearer",
        user: userWithoutPassword
      });
    } catch (error) {
      res.status(400).json({ error: "Token generation failed" });
    }
  });

  // Refresh token endpoint - get a new token using an existing valid token
  app.post("/api/auth/token/refresh", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Valid token required for refresh" });
    }

    try {
      // Get fresh user data
      const freshUser = await storage.getUser(user.id);
      if (!freshUser) {
        return res.status(401).json({ error: "User not found" });
      }

      const tokenPayload = {
        id: freshUser.id,
        role: freshUser.role,
        isSuperAdmin: freshUser.isSuperAdmin || false,
        transporterId: freshUser.transporterId || undefined,
      };

      // Use role-based expiry for token refresh
      const expiresIn = (freshUser.role === "admin" || freshUser.role === "transporter") 
        ? JWT_ADMIN_EXPIRES_IN 
        : JWT_CUSTOMER_EXPIRES_IN;
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn });
      
      res.json({
        token,
        expiresIn,
        tokenType: "Bearer"
      });
    } catch (error) {
      res.status(400).json({ error: "Token refresh failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true, message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/session", (req, res) => {
    const user = getCurrentUser(req);
    if (user) {
      res.json({ authenticated: true, user });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/auth/change-password", sensitiveAuthLimiter, async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "Not authenticated. Please log in again." });
      }

      const sessionUserId = currentUser.id;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters" });
      }

      if (!/[A-Z]/.test(newPassword)) {
        return res.status(400).json({ error: "New password must contain at least one uppercase letter" });
      }

      if (!/[0-9]/.test(newPassword)) {
        return res.status(400).json({ error: "New password must contain at least one number" });
      }

      const user = await storage.getUser(sessionUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(sessionUserId, hashedNewPassword);
      
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      res.status(400).json({ error: "Failed to change password" });
    }
  });

  // ============== CUSTOMER PORTAL ENDPOINTS ==============
  // These endpoints are specifically for the customer-facing portal (waykelconnect)
  // They use JWT Bearer token authentication for cross-domain compatibility

  // Customer registration
  app.post("/api/customer/register", authLimiter, async (req, res) => {
    try {
      const { name, phone, email, password } = req.body;
      
      if (!name || !phone || !password) {
        return res.status(400).json({ error: "Name, phone, and password are required" });
      }

      const normalizedPhone = normalizePhone(phone);
      
      // Check if phone already exists
      const existingUserByPhone = await storage.getUserByPhone(normalizedPhone);
      if (existingUserByPhone) {
        return res.status(400).json({ error: "Phone number already registered" });
      }

      // Check if email already exists (if provided)
      if (email) {
        const existingUserByEmail = await storage.getUserByEmail(email);
        if (existingUserByEmail) {
          return res.status(400).json({ error: "Email already registered" });
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      let user;
      try {
        user = await storage.createUser({
          name,
          phone: normalizedPhone,
          email: email || null,
          password: hashedPassword,
          role: "customer",
          isSuperAdmin: false,
        });
      } catch (createError: any) {
        console.error("Customer createUser error:", createError?.message, createError?.code);
        if (createError?.code === '23505') {
          if (createError?.constraint?.includes('email')) {
            return res.status(400).json({ error: "Email already registered" });
          }
          if (createError?.constraint?.includes('phone')) {
            return res.status(400).json({ error: "Phone number already registered" });
          }
        }
        throw createError;
      }

      if (!user || !user.id) {
        console.error("Customer registration: user object invalid after creation");
        return res.status(500).json({ error: "Registration failed - invalid user data" });
      }

      const { password: _, ...userWithoutPassword } = user;

      // Generate JWT token for cross-domain auth
      let token;
      try {
        const tokenPayload = {
          id: user.id,
          role: user.role,
          isSuperAdmin: false,
        };
        token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_CUSTOMER_EXPIRES_IN });
      } catch (jwtError: any) {
        console.error("Customer registration JWT error:", jwtError?.message);
        return res.status(500).json({ error: "Registration succeeded but token generation failed. Please login." });
      }

      return res.status(201).json({
        success: true,
        token,
        tokenType: "Bearer",
        expiresIn: JWT_CUSTOMER_EXPIRES_IN,
        user: userWithoutPassword,
      });
    } catch (error: any) {
      console.error("Customer registration error:", error?.message, error?.stack);
      // Handle database constraint violations with specific messages
      if (error?.code === '23505') {
        if (error?.constraint?.includes('email')) {
          return res.status(400).json({ error: "Email already registered" });
        }
        if (error?.constraint?.includes('phone')) {
          return res.status(400).json({ error: "Phone number already registered" });
        }
        return res.status(400).json({ error: "Account with this information already exists" });
      }
      return res.status(500).json({ error: "Registration failed. Please try again." });
    }
  });

  // Customer login
  app.post("/api/customer/login", authLimiter, async (req, res) => {
    try {
      const { phone, password } = req.body;
      
      if (!phone || !password) {
        return res.status(400).json({ error: "Phone and password are required" });
      }

      const normalizedPhone = normalizePhone(phone);
      const user = await storage.getUserByPhone(normalizedPhone);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Only allow customers to login through this endpoint
      if (user.role !== "customer") {
        return res.status(403).json({ error: "Please use the appropriate portal for your account type" });
      }

      const { password: _, ...userWithoutPassword } = user;

      const tokenPayload = {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
      };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_CUSTOMER_EXPIRES_IN });

      res.json({
        success: true,
        token,
        tokenType: "Bearer",
        expiresIn: JWT_CUSTOMER_EXPIRES_IN,
        user: userWithoutPassword,
      });
    } catch (error) {
      console.error("Customer login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Customer logout
  app.post("/api/customer/logout", (req, res) => {
    // For JWT-based auth, logout is handled client-side by removing the token
    res.json({ success: true, message: "Logged out successfully" });
  });

  // Customer session check
  app.get("/api/customer/session", async (req, res) => {
    const user = getCurrentUser(req);
    if (user?.id) {
      const fullUser = await storage.getUser(user.id);
      if (fullUser) {
        const { password: _, ...userWithoutPassword } = fullUser;
        return res.json({ authenticated: true, user: userWithoutPassword });
      }
    }
    res.json({ authenticated: false });
  });

  // Customer rides - get customer's own rides
  app.get("/api/customer/rides", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const rides = await storage.getCustomerRides(user.id);
      res.json(rides);
    } catch (error) {
      console.error("Failed to get customer rides:", error);
      res.status(500).json({ error: "Failed to get rides" });
    }
  });

  // Customer create ride
  app.post("/api/customer/rides", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const rideData = {
        ...req.body,
        createdById: user.id,
        status: "pending",
      };
      const ride = await storage.createRide(rideData);
      res.status(201).json(ride);
    } catch (error) {
      console.error("Failed to create ride:", error);
      res.status(500).json({ error: "Failed to create ride" });
    }
  });

  // Get bids for a customer's ride
  app.get("/api/customer/rides/:rideId/bids", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { rideId } = req.params;
      
      // Verify the ride belongs to this customer
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      if (ride.createdById !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const bids = await storage.getRideBids(rideId);
      res.json(bids);
    } catch (error) {
      console.error("Failed to get ride bids:", error);
      res.status(500).json({ error: "Failed to get bids" });
    }
  });

  // Accept a bid
  app.patch("/api/customer/bids/:bidId/accept", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { bidId } = req.params;
      
      const bid = await storage.getBid(bidId);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }

      // Verify the ride belongs to this customer
      const ride = await storage.getRide(bid.rideId);
      if (!ride || ride.createdById !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Verify transporter is still active/verified before accepting their bid
      if (bid.transporterId) {
        const transporter = await storage.getTransporter(bid.transporterId);
        if (!transporter) {
          return res.status(400).json({ error: "Transporter account not found. Cannot accept this bid." });
        }
        if (transporter.status !== "active") {
          return res.status(400).json({ error: "This transporter's account is not verified. Cannot accept their bid." });
        }
      }

      // Update bid status
      const updatedBid = await storage.updateBidStatus(bidId, "accepted");
      
      // Update ride with assigned driver/transporter
      await storage.updateRideStatus(bid.rideId, "confirmed");
      
      res.json(updatedBid);
    } catch (error) {
      console.error("Failed to accept bid:", error);
      res.status(500).json({ error: "Failed to accept bid" });
    }
  });

  // Customer addresses
  app.get("/api/customer/addresses", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const addresses = await storage.getUserSavedAddresses(user.id);
      res.json(addresses);
    } catch (error) {
      console.error("Failed to get addresses:", error);
      res.status(500).json({ error: "Failed to get addresses" });
    }
  });

  app.post("/api/customer/addresses", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const address = await storage.createSavedAddress({
        ...req.body,
        userId: user.id,
      });
      res.status(201).json(address);
    } catch (error) {
      console.error("Failed to create address:", error);
      res.status(500).json({ error: "Failed to create address" });
    }
  });

  app.patch("/api/customer/addresses/:id", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const address = await storage.getSavedAddress(id);
      
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }
      if (address.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updated = await storage.updateSavedAddress(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update address:", error);
      res.status(500).json({ error: "Failed to update address" });
    }
  });

  app.delete("/api/customer/addresses/:id", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { id } = req.params;
      const address = await storage.getSavedAddress(id);
      
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }
      if (address.userId !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      await storage.deleteSavedAddress(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete address:", error);
      res.status(500).json({ error: "Failed to delete address" });
    }
  });

  // Ride routes - with role-based access control
  app.get("/api/rides", async (req, res) => {
    const { status, driverId, transporterId, createdById } = req.query;
    const sessionUser = getCurrentUser(req);
    
    try {
      let result: any[] = [];
      
      // Role-based access control for rides
      if (sessionUser) {
        const userRole = sessionUser.role;
        const isSuperAdmin = sessionUser.isSuperAdmin;
        
        // Super Admin can access all rides
        if (isSuperAdmin) {
          if (driverId) {
            result = await storage.getDriverRides(driverId as string);
          } else if (transporterId) {
            result = await storage.getTransporterRides(transporterId as string);
          } else if (createdById) {
            result = await storage.getCustomerRides(createdById as string);
          } else if (status === "pending") {
            result = await storage.getPendingRides();
          } else if (status === "scheduled") {
            result = await storage.getScheduledRides();
          } else if (status === "active") {
            result = await storage.getActiveRides();
          } else if (status === "completed") {
            result = await storage.getCompletedRides();
          } else {
            result = await storage.getAllRides();
          }
        }
        // Transporters can only see their own rides (derived from session)
        else if (userRole === "transporter" && sessionUser.transporterId) {
          result = await storage.getTransporterRides(sessionUser.transporterId);
        }
        // Drivers can only see their own assigned rides (derived from session)
        else if (userRole === "driver") {
          result = await storage.getDriverRides(sessionUser.id);
        }
        // Customers can only see their own created rides (derived from session)
        else if (userRole === "customer") {
          result = await storage.getCustomerRides(sessionUser.id);
        }
        else {
          result = [];
        }
      } else {
        // Unauthenticated - only show pending rides for marketplace (public view)
        if (status === "pending") {
          result = await storage.getPendingRides();
        } else {
          result = [];
        }
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rides" });
    }
  });

  app.get("/api/rides/:id", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Role-based access control for single ride
      if (sessionUser) {
        const isSuperAdmin = sessionUser.isSuperAdmin;
        const userRole = sessionUser.role;
        
        // Super Admin can access any ride
        if (isSuperAdmin) {
          return res.json(ride);
        }
        
        // Transporter can only access their own rides
        if (userRole === "transporter" && sessionUser.transporterId) {
          if (ride.transporterId === sessionUser.transporterId) {
            return res.json(ride);
          }
          return res.status(403).json({ error: "Access denied" });
        }
        
        // Driver can only access assigned rides
        if (userRole === "driver") {
          if (ride.assignedDriverId === sessionUser.id) {
            return res.json(ride);
          }
          return res.status(403).json({ error: "Access denied" });
        }
        
        // Customer can only access their own created rides
        if (userRole === "customer") {
          if (ride.createdById === sessionUser.id) {
            return res.json(ride);
          }
          return res.status(403).json({ error: "Access denied" });
        }
        
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Unauthenticated - only allow viewing pending rides (marketplace)
      if (ride.status === "pending") {
        return res.json(ride);
      }
      
      return res.status(401).json({ error: "Authentication required" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ride" });
    }
  });

  app.post("/api/rides", async (req, res) => {
    try {
      const data = insertRideSchema.parse(req.body);
      
      const user = getCurrentUser(req);
      if (user?.id && !data.createdById) {
        data.createdById = user.id;
      }
      
      const ride = await storage.createRide(data);
      
      // Automatically find matching transporters and notify them
      try {
        const matches = await storage.findMatchingTransporters(ride);
        
        // Create notifications for each matching transporter
        for (const match of matches) {
          // Find the users associated with this transporter to send notification
          const transporterUsers = await storage.getUsersByTransporter(match.transporter.id);
          
          // Create notification for each user under this transporter
          for (const transporterUser of transporterUsers) {
            await storage.createNotification({
              recipientId: transporterUser.id,
              recipientTransporterId: match.transporter.id,
              type: "new_booking",
              title: "New Trip Request Available",
              message: `New trip from ${ride.pickupLocation} to ${ride.dropLocation} - ${ride.cargoType || 'General'} (${ride.weight || 'N/A'}). Budget: ₹${ride.price}`,
              rideId: ride.id,
              matchScore: match.matchScore,
              matchReason: match.matchReason,
            });
          }
          
          // Also notify owner-operator if applicable
          if (match.transporter.isOwnerOperator && match.transporter.ownerDriverUserId) {
            const existingNotification = transporterUsers.find(u => u.id === match.transporter.ownerDriverUserId);
            if (!existingNotification) {
              await storage.createNotification({
                recipientId: match.transporter.ownerDriverUserId,
                recipientTransporterId: match.transporter.id,
                type: "new_booking",
                title: "New Trip Request Available",
                message: `New trip from ${ride.pickupLocation} to ${ride.dropLocation} - ${ride.cargoType || 'General'} (${ride.weight || 'N/A'}). Budget: ₹${ride.price}`,
                rideId: ride.id,
                matchScore: match.matchScore,
                matchReason: match.matchReason,
              });
            }
          }
        }
        
        console.log(`Ride ${ride.id} created - notified ${matches.length} matching transporters`);
      } catch (matchError) {
        // Don't fail the ride creation if matching/notification fails
        console.error("Failed to notify matching transporters:", matchError);
      }
      
      res.status(201).json(ride);
    } catch (error: any) {
      console.error("Ride creation error:", error);
      if (error.errors) {
        const validationErrors = error.errors.map((e: any) => ({
          field: e.path?.join('.') || 'unknown',
          message: e.message
        }));
        return res.status(400).json({ 
          error: "Invalid ride data", 
          details: validationErrors,
          requiredFields: ["pickupLocation", "dropLocation", "pickupTime", "date", "price", "distance", "cargoType", "weight"],
          hint: "All required fields must be strings. Price should be a string like '5000.00'"
        });
      }
      res.status(400).json({ error: "Invalid ride data", message: error.message });
    }
  });

  app.patch("/api/rides/:id/status", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    // Only super admin can update ride status
    if (!sessionUser || !sessionUser.isSuperAdmin) {
      return res.status(403).json({ error: "Only administrators can update ride status" });
    }
    
    try {
      const { status } = req.body;
      await storage.updateRideStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update status" });
    }
  });

  app.patch("/api/rides/:id/assign", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    // Only super admin can assign drivers
    if (!sessionUser || !sessionUser.isSuperAdmin) {
      return res.status(403).json({ error: "Only administrators can assign drivers" });
    }
    
    try {
      const { driverId, vehicleId } = req.body;
      await storage.assignRideToDriver(req.params.id, driverId, vehicleId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to assign driver" });
    }
  });

  // Get marketplace rides for transporter with match scores
  app.get("/api/transporter/marketplace", marketplaceLimiter, async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    if (!sessionUser || sessionUser.role !== "transporter") {
      return res.status(403).json({ error: "Only transporters can access marketplace" });
    }
    
    try {
      // Get all pending rides
      const pendingRides = await storage.getPendingRides();
      
      if (!sessionUser.transporterId) {
        return res.json(pendingRides.map(ride => ({ ...ride, matchScore: 0, matchReason: "No transporter profile" })));
      }
      
      // Get transporter details
      const transporter = await storage.getTransporter(sessionUser.transporterId);
      if (!transporter) {
        return res.json(pendingRides.map(ride => ({ ...ride, matchScore: 0, matchReason: "Transporter not found" })));
      }
      
      // Get transporter's vehicles
      const vehicles = await storage.getTransporterVehicles(sessionUser.transporterId);
      
      // Calculate match scores for each ride
      const ridesWithScores = pendingRides.map(ride => {
        let score = 0;
        const reasons: string[] = [];
        
        // Check vehicle matching
        for (const vehicle of vehicles) {
          if (vehicle.status !== "active") continue;
          
          // Vehicle type match
          if (ride.requiredVehicleType && vehicle.type === ride.requiredVehicleType) {
            score += 30;
            reasons.push(`Vehicle type matches (${vehicle.type})`);
          } else if (!ride.requiredVehicleType) {
            score += 10;
          }
          
          // Capacity match
          if (ride.weightKg && vehicle.capacityKg && vehicle.capacityKg >= ride.weightKg) {
            score += 25;
            reasons.push(`Capacity sufficient (${vehicle.capacityKg}kg)`);
          } else if (!ride.weightKg) {
            score += 5;
          }
          
          // Proximity match
          if (vehicle.currentPincode && ride.pickupPincode && vehicle.currentPincode === ride.pickupPincode) {
            score += 20;
            reasons.push(`Vehicle at pickup location`);
          }
        }
        
        // Service area match
        if (transporter.servicePincodes && ride.pickupPincode) {
          if (transporter.servicePincodes.includes(ride.pickupPincode)) {
            score += 15;
            reasons.push(`In service area`);
          }
        }
        
        // Base location match
        if (transporter.basePincode && ride.pickupPincode && transporter.basePincode === ride.pickupPincode) {
          score += 10;
          reasons.push(`Near base location`);
        }
        
        // Route preference match
        if (transporter.preferredRoutes && ride.pickupLocation && ride.dropLocation) {
          const routes = transporter.preferredRoutes as string[];
          const routeKey = `${ride.pickupLocation}-${ride.dropLocation}`.toLowerCase();
          if (routes.some(r => routeKey.includes(r.toLowerCase()))) {
            score += 20;
            reasons.push(`On preferred route`);
          }
        }
        
        return {
          ...ride,
          matchScore: Math.min(score, 100),
          matchReason: reasons.length > 0 ? reasons.join(", ") : "General match",
          isMatched: score > 0
        };
      });
      
      // Sort by match score (highest first), then by date
      ridesWithScores.sort((a, b) => b.matchScore - a.matchScore);
      
      res.json(ridesWithScores);
    } catch (error) {
      console.error("Failed to fetch marketplace rides:", error);
      res.status(500).json({ error: "Failed to fetch marketplace rides" });
    }
  });

  // Transporter analytics endpoint
  app.get("/api/transporter/analytics", protectedLimiter, async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    if (!sessionUser || (sessionUser.role !== "transporter" && !sessionUser.isSuperAdmin)) {
      return res.status(403).json({ error: "Only transporters can access analytics" });
    }
    
    const transporterId = sessionUser.transporterId;
    if (!transporterId) {
      return res.status(400).json({ error: "No transporter profile found" });
    }
    
    try {
      const [transporterRides, transporterBids, transporterVehicles, transporterDrivers] = await Promise.all([
        storage.getTransporterRides(transporterId),
        storage.getTransporterBids(transporterId),
        storage.getTransporterVehicles(transporterId),
        storage.getUsersByTransporterAndRole(transporterId, "driver"),
      ]);
      
      // Calculate ride statistics
      const completedRides = transporterRides.filter(r => r.status === "completed");
      const activeRides = transporterRides.filter(r => r.status === "active" || r.status === "assigned");
      const pendingRides = transporterRides.filter(r => r.status === "pending");
      const cancelledRides = transporterRides.filter(r => r.status === "cancelled");
      
      // Calculate earnings
      const totalEarnings = completedRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
      const totalIncentives = completedRides.reduce((sum, r) => sum + parseFloat(r.incentive || "0"), 0);
      
      // Get current date info for time-based analytics
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      // Earnings this month
      const thisMonthRides = completedRides.filter(r => {
        const rideDate = r.createdAt ? new Date(r.createdAt) : null;
        return rideDate && rideDate >= thisMonthStart;
      });
      const thisMonthEarnings = thisMonthRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
      
      // Earnings last month
      const lastMonthRides = completedRides.filter(r => {
        const rideDate = r.createdAt ? new Date(r.createdAt) : null;
        return rideDate && rideDate >= lastMonthStart && rideDate <= lastMonthEnd;
      });
      const lastMonthEarnings = lastMonthRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
      
      // Earnings growth percentage
      const earningsGrowth = lastMonthEarnings > 0 
        ? ((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings * 100).toFixed(1)
        : thisMonthEarnings > 0 ? "100" : "0";
      
      // Last 7 days earnings (for chart)
      const last7DaysData: { date: string; earnings: number; rides: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayRides = completedRides.filter(r => {
          const rideDate = r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : null;
          return rideDate === dateStr;
        });
        last7DaysData.push({
          date: date.toLocaleDateString('en-IN', { weekday: 'short' }),
          earnings: dayRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0),
          rides: dayRides.length
        });
      }
      
      // Monthly earnings (last 6 months for chart)
      const monthlyData: { month: string; earnings: number; rides: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthRides = completedRides.filter(r => {
          const rideDate = r.createdAt ? new Date(r.createdAt) : null;
          return rideDate && rideDate >= monthStart && rideDate <= monthEnd;
        });
        monthlyData.push({
          month: monthStart.toLocaleDateString('en-IN', { month: 'short' }),
          earnings: monthRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0),
          rides: monthRides.length
        });
      }
      
      // Bid statistics
      const acceptedBids = transporterBids.filter(b => b.status === "accepted");
      const pendingBids = transporterBids.filter(b => b.status === "pending");
      const rejectedBids = transporterBids.filter(b => b.status === "rejected");
      const bidSuccessRate = transporterBids.length > 0 
        ? ((acceptedBids.length / transporterBids.length) * 100).toFixed(1) 
        : "0";
      
      // Average bid amount
      const avgBidAmount = transporterBids.length > 0
        ? transporterBids.reduce((sum, b) => sum + parseFloat(b.amount || "0"), 0) / transporterBids.length
        : 0;
      
      // Cargo type breakdown
      const cargoTypeBreakdown: Record<string, { count: number; earnings: number }> = {};
      completedRides.forEach(r => {
        const type = r.cargoType || "Other";
        if (!cargoTypeBreakdown[type]) {
          cargoTypeBreakdown[type] = { count: 0, earnings: 0 };
        }
        cargoTypeBreakdown[type].count++;
        cargoTypeBreakdown[type].earnings += parseFloat(r.price || "0");
      });
      
      // Route analytics (top routes)
      const routeBreakdown: Record<string, { count: number; earnings: number }> = {};
      completedRides.forEach(r => {
        const route = `${r.pickupLocation} → ${r.dropLocation}`;
        if (!routeBreakdown[route]) {
          routeBreakdown[route] = { count: 0, earnings: 0 };
        }
        routeBreakdown[route].count++;
        routeBreakdown[route].earnings += parseFloat(r.price || "0");
      });
      const topRoutes = Object.entries(routeBreakdown)
        .map(([route, data]) => ({ route, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Vehicle utilization
      const vehicleStats = transporterVehicles.map(v => {
        const vehicleRides = completedRides.filter(r => r.assignedVehicleId === v.id);
        return {
          id: v.id,
          plateNumber: v.plateNumber,
          type: v.type,
          status: v.status,
          totalRides: vehicleRides.length,
          earnings: vehicleRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0)
        };
      });
      
      // Driver performance
      const driverStats = transporterDrivers.map(d => {
        const driverRides = completedRides.filter(r => r.assignedDriverId === d.id);
        return {
          id: d.id,
          name: d.name,
          phone: d.phone,
          isOnline: d.isOnline,
          totalRides: driverRides.length,
          earnings: driverRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0),
          rating: d.rating
        };
      });
      
      // Average trip value
      const avgTripValue = completedRides.length > 0 
        ? totalEarnings / completedRides.length 
        : 0;
      
      // Average distance (extract numeric value from distance string)
      const avgDistance = completedRides.length > 0
        ? completedRides.reduce((sum, r) => {
            const distNum = parseFloat(r.distance?.replace(/[^0-9.]/g, '') || "0");
            return sum + distNum;
          }, 0) / completedRides.length
        : 0;
      
      res.json({
        summary: {
          totalRides: transporterRides.length,
          completedRides: completedRides.length,
          activeRides: activeRides.length,
          pendingRides: pendingRides.length,
          cancelledRides: cancelledRides.length,
          totalEarnings,
          totalIncentives,
          thisMonthEarnings,
          lastMonthEarnings,
          earningsGrowth: parseFloat(earningsGrowth as string),
          avgTripValue,
          avgDistance,
          totalDrivers: transporterDrivers.length,
          totalVehicles: transporterVehicles.length,
          activeVehicles: transporterVehicles.filter(v => v.status === "active").length
        },
        bidStats: {
          totalBids: transporterBids.length,
          acceptedBids: acceptedBids.length,
          pendingBids: pendingBids.length,
          rejectedBids: rejectedBids.length,
          successRate: parseFloat(bidSuccessRate),
          avgBidAmount
        },
        charts: {
          last7Days: last7DaysData,
          monthly: monthlyData,
          cargoTypes: Object.entries(cargoTypeBreakdown).map(([type, data]) => ({ type, ...data })),
          topRoutes
        },
        vehicleStats,
        driverStats
      });
    } catch (error) {
      console.error("Failed to fetch transporter analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Bid routes
  app.get("/api/bids", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    const { rideId, userId, transporterId } = req.query;
    
    try {
      let result: any[] = [];
      
      // Role-based access control for bids
      if (sessionUser) {
        const isSuperAdmin = sessionUser.isSuperAdmin;
        const userRole = sessionUser.role;
        
        // Super Admin can access all bids
        if (isSuperAdmin) {
          if (rideId) {
            result = await storage.getRideBids(rideId as string);
          } else if (userId) {
            result = await storage.getUserBids(userId as string);
          } else if (transporterId) {
            result = await storage.getTransporterBids(transporterId as string);
          } else {
            result = await storage.getAllBids();
          }
        }
        // Transporters can only see their own bids
        else if (userRole === "transporter" && sessionUser.transporterId) {
          result = await storage.getTransporterBids(sessionUser.transporterId);
        }
        // Customers can see bids on their rides
        else if (userRole === "customer" && rideId) {
          const ride = await storage.getRide(rideId as string);
          if (ride && ride.createdById === sessionUser.id) {
            result = await storage.getRideBids(rideId as string);
          }
        }
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  app.post("/api/bids", bidLimiter, async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    // Only authenticated transporters can place bids
    if (!sessionUser || (sessionUser.role !== "transporter" && !sessionUser.isSuperAdmin)) {
      return res.status(403).json({ error: "Only transporters can place bids" });
    }
    
    try {
      const data = insertBidSchema.parse(req.body);
      
      // Verify transporter is placing bid with their own transporterId
      if (!sessionUser.isSuperAdmin && sessionUser.transporterId !== data.transporterId) {
        return res.status(403).json({ error: "Cannot place bids for another transporter" });
      }
      
      // Check if bidding is still open for this ride
      const ride = await storage.getRide(data.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      if (ride.biddingStatus === "closed") {
        return res.status(400).json({ error: "Bidding is closed for this trip. A bid has already been accepted." });
      }
      
      if (ride.biddingStatus === "self_assigned") {
        return res.status(400).json({ error: "This trip has been self-assigned and is not open for bidding." });
      }
      
      // Check if transporter is verified (status = active) before allowing bids
      if (!sessionUser.isSuperAdmin && sessionUser.transporterId) {
        const transporter = await storage.getTransporter(sessionUser.transporterId);
        if (!transporter) {
          return res.status(403).json({ error: "Transporter account not found." });
        }
        if (transporter.status !== "active") {
          const statusMessages: Record<string, string> = {
            pending_verification: "Your account is pending document verification. Please upload all required documents.",
            pending_approval: "Your documents are under review. You'll be notified once approved.",
            rejected: "Your account verification was rejected. Please check the rejection reason and re-upload documents.",
            suspended: "Your account has been suspended. Please contact support."
          };
          const message = statusMessages[transporter.status || "pending_verification"] || "Your account must be verified before you can place bids.";
          return res.status(403).json({ error: message });
        }
      }
      
      const bid = await storage.createBid(data);
      
      // Update ride status to bid_placed
      await storage.updateRideStatus(data.rideId, "bid_placed");
      
      res.status(201).json(bid);
    } catch (error) {
      res.status(400).json({ error: "Invalid bid data" });
    }
  });

  app.patch("/api/bids/:id/status", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    // Only super admin can update bid status
    if (!sessionUser || !sessionUser.isSuperAdmin) {
      return res.status(403).json({ error: "Only administrators can update bid status" });
    }
    
    try {
      const { status } = req.body;
      await storage.updateBidStatus(req.params.id, status);
      
      // If bid is accepted, assign the ride
      if (status === "accepted") {
        const bid = await storage.getBid(req.params.id);
        if (bid) {
          await storage.assignRideToDriver(bid.rideId, bid.userId, bid.vehicleId);
          
          // Notify driver
          const ride = await storage.getRide(bid.rideId);
          if (ride) {
            await storage.createNotification({
              recipientId: bid.userId,
              recipientTransporterId: bid.transporterId || undefined,
              type: "bid_accepted",
              title: "Bid Accepted!",
              message: `Your bid for trip from ${ride.pickupLocation} to ${ride.dropLocation} has been accepted.`,
              rideId: bid.rideId,
              bidId: bid.id,
            });
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update bid status" });
    }
  });

  // Get cheapest bids for a ride (for customer view)
  app.get("/api/rides/:rideId/cheapest-bids", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    const { rideId } = req.params;
    
    try {
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Role-based access control
      if (sessionUser) {
        const isSuperAdmin = sessionUser.isSuperAdmin;
        const userRole = sessionUser.role;
        
        // Super admin can see all bids
        if (!isSuperAdmin) {
          // Customer can only see bids on their own rides
          if (userRole === "customer") {
            if (ride.createdById !== sessionUser.id) {
              return res.status(403).json({ error: "Access denied" });
            }
          }
          // Transporters can ONLY see bids on pending marketplace rides
          else if (userRole === "transporter") {
            if (ride.status !== "pending") {
              return res.status(403).json({ error: "Access denied - bids only visible for pending rides" });
            }
          }
          else {
            return res.status(403).json({ error: "Access denied" });
          }
        }
      } else {
        // Unauthenticated users cannot see bid details
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const limit = parseInt(req.query.limit as string) || 5;
      const bids = await storage.getCheapestRideBids(rideId, Math.min(limit, 5));
      
      // Enrich bids with transporter info
      const enrichedBids = await Promise.all(bids.map(async (bid) => {
        let transporterName = "Unknown Transporter";
        if (bid.transporterId) {
          const transporter = await storage.getTransporter(bid.transporterId);
          if (transporter) {
            transporterName = transporter.companyName;
          }
        }
        
        let vehicleInfo = null;
        if (bid.vehicleId) {
          const vehicle = await storage.getVehicle(bid.vehicleId);
          if (vehicle) {
            vehicleInfo = {
              type: vehicle.type,
              model: vehicle.model,
              plateNumber: vehicle.plateNumber
            };
          }
        }
        
        return {
          id: bid.id,
          amount: bid.amount,
          status: bid.status,
          transporterName,
          vehicle: vehicleInfo,
          createdAt: bid.createdAt
        };
      }));
      
      res.json(enrichedBids);
    } catch (error) {
      console.error("Failed to fetch cheapest bids:", error);
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // Vehicle routes
  // GET /api/vehicles - Auth required, users can view their own or transporter's
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    const { userId, transporterId } = req.query;
    const user = getCurrentUser(req)!;
    const isAdmin = user.isSuperAdmin || user.role === "admin";
    
    try {
      let result: any[] = [];
      if (userId) {
        if (!isAdmin && userId !== user.id) {
          return res.status(403).json({ error: "You can only view your own vehicles" });
        }
        result = await storage.getUserVehicles(userId as string);
      } else if (transporterId) {
        if (!isAdmin && transporterId !== user.transporterId) {
          return res.status(403).json({ error: "You can only view your own transporter vehicles" });
        }
        result = await storage.getTransporterVehicles(transporterId as string);
      } else {
        // No filter - return empty for non-admins
        if (!isAdmin) {
          return res.status(400).json({ error: "Please specify userId or transporterId filter" });
        }
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  // GET /api/vehicles/all - Admin only
  app.get("/api/vehicles/all", requireAdmin, async (req, res) => {
    try {
      const result = await storage.getAllVehicles();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all vehicles" });
    }
  });

  // POST /api/vehicles - Driver or transporter only
  app.post("/api/vehicles", requireDriverOrTransporter, async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ error: "Invalid vehicle data" });
    }
  });

  // Transporter routes
  // GET /api/transporters - Admin only
  app.get("/api/transporters", requireAdmin, async (req, res) => {
    const { status } = req.query;
    
    try {
      let result;
      if (status === "pending_approval") {
        result = await storage.getPendingTransporters();
      } else {
        result = await storage.getAllTransporters();
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transporters" });
    }
  });

  // POST /api/transporters - Public (for registration)
  app.post("/api/transporters", async (req, res) => {
    try {
      const data = insertTransporterSchema.parse(req.body);
      const transporter = await storage.createTransporter(data);
      res.status(201).json(transporter);
    } catch (error) {
      res.status(400).json({ error: "Invalid transporter data" });
    }
  });

  // PATCH /api/transporters/:id/status - Admin only
  app.patch("/api/transporters/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateTransporterStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update transporter status" });
    }
  });

  // POST /api/transporters/:id/verify - Admin only (approves and verifies transporter)
  app.post("/api/transporters/:id/verify", requireAdmin, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const transporter = await storage.getTransporter(req.params.id);
      if (!transporter) {
        return res.status(404).json({ error: "Transporter not found" });
      }
      
      // Verify the transporter (sets isVerified=true, status=active)
      await storage.verifyTransporter(req.params.id, sessionUser.id);
      
      // Get updated transporter to return
      const updatedTransporter = await storage.getTransporter(req.params.id);
      
      res.json({ 
        success: true, 
        message: "Transporter verified and approved successfully",
        transporter: updatedTransporter
      });
    } catch (error) {
      console.error("Failed to verify transporter:", error);
      res.status(400).json({ error: "Failed to verify transporter" });
    }
  });

  // POST /api/transporters/:id/approve - Admin only (explicit transporter approval)
  // IDEMPOTENT: Safe to call multiple times. Returns success if already approved.
  // STRICT TRANSITIONS: Only allows approval from pending_verification, pending_approval, rejected
  app.post("/api/transporters/:id/approve", requireAdmin, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const transporter = await storage.getTransporter(req.params.id);
      if (!transporter) {
        return res.status(404).json({ error: "Transporter not found" });
      }
      
      // IDEMPOTENT: Already approved - return success (no-op)
      if (transporter.status === "active") {
        return res.json({ 
          success: true, 
          message: "Transporter is already approved",
          transporter,
          noChange: true
        });
      }
      
      // STRICT TRANSITIONS: Only allow approval from specific states
      const allowedFromStates = ["pending_verification", "pending_approval", "rejected"];
      if (!allowedFromStates.includes(transporter.status || "")) {
        return res.status(400).json({ 
          error: `Cannot approve transporter with status '${transporter.status}'. Only pending or rejected transporters can be approved.`
        });
      }
      
      // If approving from rejected status, require explicit confirm flag
      if (transporter.status === "rejected") {
        const { confirmFromRejected } = req.body;
        if (!confirmFromRejected) {
          return res.status(400).json({ 
            error: "This transporter was previously rejected. Send confirmFromRejected: true to proceed with approval.",
            requiresConfirmation: true,
            previousRejectionReason: transporter.rejectionReason
          });
        }
      }
      
      await storage.approveTransporter(req.params.id, sessionUser.id);
      
      const updatedTransporter = await storage.getTransporter(req.params.id);
      
      res.json({ 
        success: true, 
        message: "Transporter approved successfully",
        transporter: updatedTransporter
      });
    } catch (error) {
      console.error("Failed to approve transporter:", error);
      res.status(400).json({ error: "Failed to approve transporter" });
    }
  });

  // POST /api/transporters/:id/reject - Admin only (reject transporter with reason)
  // IDEMPOTENT: Safe to call multiple times with same reason. Returns success if already rejected.
  // STRICT TRANSITIONS: Only allows rejection from pending_verification, pending_approval
  app.post("/api/transporters/:id/reject", requireAdmin, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { reason } = req.body;
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      const transporter = await storage.getTransporter(req.params.id);
      if (!transporter) {
        return res.status(404).json({ error: "Transporter not found" });
      }
      
      // IDEMPOTENT: Already rejected with same reason - return success (no-op)
      if (transporter.status === "rejected") {
        return res.json({ 
          success: true, 
          message: "Transporter is already rejected",
          transporter,
          noChange: true
        });
      }
      
      // STRICT TRANSITIONS: Cannot reject an active/approved transporter without explicit intent
      if (transporter.status === "active") {
        const { confirmFromActive } = req.body;
        if (!confirmFromActive) {
          return res.status(400).json({ 
            error: "This transporter is currently active. Send confirmFromActive: true to proceed with rejection.",
            requiresConfirmation: true
          });
        }
      }
      
      // Block rejection from suspended state - use suspend workflow instead
      if (transporter.status === "suspended") {
        return res.status(400).json({ 
          error: "Cannot reject a suspended transporter. Use the unsuspend workflow first."
        });
      }
      
      await storage.rejectTransporter(req.params.id, sessionUser.id, reason.trim());
      
      const updatedTransporter = await storage.getTransporter(req.params.id);
      
      res.json({ 
        success: true, 
        message: "Transporter rejected",
        transporter: updatedTransporter
      });
    } catch (error) {
      console.error("Failed to reject transporter:", error);
      res.status(400).json({ error: "Failed to reject transporter" });
    }
  });

  // User routes
  // GET /api/users - Admin only (or transporter can see their own users)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const { transporterId, role } = req.query;
      const user = getCurrentUser(req)!;
      const isAdmin = user.isSuperAdmin || user.role === "admin";
      
      let users;
      if (transporterId && role) {
        if (!isAdmin && transporterId !== user.transporterId) {
          return res.status(403).json({ error: "You can only view users from your own transporter" });
        }
        users = await storage.getUsersByTransporterAndRole(transporterId as string, role as string);
      } else if (transporterId) {
        if (!isAdmin && transporterId !== user.transporterId) {
          return res.status(403).json({ error: "You can only view users from your own transporter" });
        }
        users = await storage.getUsersByTransporter(transporterId as string);
      } else {
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all users" });
        }
        users = await storage.getAllUsers();
      }
      const usersWithoutPasswords = users.map(({ password, ...u }) => u);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all customers (for admin panel) with trip counts - Admin only
  app.get("/api/customers", requireAdmin, async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      const allRides = await storage.getAllRides();
      
      const customersWithStats = await Promise.all(
        customers.map(async ({ password, ...customer }) => {
          const customerRides = allRides.filter(r => r.createdById === customer.id);
          return {
            ...customer,
            totalTrips: customerRides.length,
          };
        })
      );
      
      res.json(customersWithStats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch customers" });
    }
  });

  // Get all drivers (for admin panel) - Admin only
  app.get("/api/drivers", requireAdmin, async (req, res) => {
    try {
      const drivers = await storage.getDrivers();
      const driversWithoutPasswords = drivers.map(({ password, ...driver }) => driver);
      res.json(driversWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch drivers" });
    }
  });

  // API Logs - Admin only
  app.get("/api/admin/logs", requireAdmin, async (req, res) => {
    try {
      const { limit = "100", offset = "0", path } = req.query;
      
      let logs;
      if (path) {
        logs = await storage.getApiLogsByPath(path as string);
      } else {
        logs = await storage.getApiLogs(parseInt(limit as string), parseInt(offset as string));
      }
      
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API logs" });
    }
  });

  // API Logs Stats - Admin only
  app.get("/api/admin/logs/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getApiLogStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API log stats" });
    }
  });

  // Admin dashboard stats - Admin only
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const [drivers, transporters, customers, vehicles, rides, bids] = await Promise.all([
        storage.getDrivers(),
        storage.getAllTransporters(),
        storage.getCustomers(),
        storage.getAllVehicles(),
        storage.getAllRides(),
        storage.getAllBids(),
      ]);

      const activeVehicles = vehicles.filter(v => v.status === "active");
      const completedRides = rides.filter(r => r.status === "completed");
      const activeRides = rides.filter(r => r.status === "active" || r.status === "assigned");
      const pendingRides = rides.filter(r => r.status === "pending");
      
      // Transporter verification counts
      const pendingVerifications = transporters.filter(t => t.status === "pending_verification").length;
      const pendingApprovals = transporters.filter(t => t.status === "pending_approval").length;

      const totalRevenue = completedRides.reduce((sum, ride) => {
        return sum + parseFloat(ride.price || "0");
      }, 0);

      const recentRides = rides
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 10);

      res.json({
        totalDrivers: drivers.length,
        totalTransporters: transporters.length,
        totalCustomers: customers.length,
        totalVehicles: vehicles.length,
        activeVehicles: activeVehicles.length,
        totalRides: rides.length,
        completedRides: completedRides.length,
        activeRides: activeRides.length,
        pendingRides: pendingRides.length,
        totalBids: bids.length,
        totalRevenue,
        pendingVerifications,
        pendingApprovals,
        recentRides: recentRides.map(r => ({
          id: r.id,
          pickupLocation: r.pickupLocation,
          dropLocation: r.dropLocation,
          status: r.status,
          createdAt: r.createdAt,
        })),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Update user details (admin only)
  app.patch("/api/users/:id", async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser?.isSuperAdmin) {
        return res.status(403).json({ error: "Only Super Admin can update user details" });
      }
      
      const { name, email, phone, role } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;
      if (role !== undefined && ["driver", "transporter", "admin", "customer"].includes(role)) {
        updates.role = role;
      }
      
      const updatedUser = await storage.updateUser(req.params.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(400).json({ error: "Failed to update user" });
    }
  });

  // Admin reset password for any user
  app.post("/api/users/:id/reset-password", requireAdmin, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser?.isSuperAdmin) {
        return res.status(403).json({ error: "Only Super Admin can reset passwords" });
      }
      
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.params.id, hashedPassword);
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Failed to reset password:", error);
      res.status(400).json({ error: "Failed to reset password" });
    }
  });

  // PATCH /api/users/:id/online-status - Owner or admin
  app.patch("/api/users/:id/online-status", requireAuth, async (req, res) => {
    try {
      const user = getCurrentUser(req)!;
      const isAdmin = user.isSuperAdmin || user.role === "admin";
      
      if (!isAdmin && req.params.id !== user.id) {
        return res.status(403).json({ error: "You can only update your own status" });
      }
      
      const { isOnline } = req.body;
      await storage.updateUserOnlineStatus(req.params.id, isOnline);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update online status" });
    }
  });

  // ===========================================
  // GLOBAL DOCUMENT ROUTES (INTERNAL ONLY)
  // ===========================================
  // These routes are for driver/vehicle/transporter document verification.
  // Do NOT use these for trip-related documents.
  // Use /api/trips/:tripId/documents instead for trip documents.
  // See docs/API_CONTRACT_CANONICAL.md for the canonical API contract.

  // GET /api/documents - Auth required, users can only see their own
  app.get("/api/documents", requireAuth, async (req, res) => {
    const { userId, vehicleId, transporterId } = req.query;
    const user = getCurrentUser(req);
    // Warn if customer tries to use global document API
    if (user?.role === 'customer') {
      console.warn('[DEPRECATED] Customer used global document API. Use trip-scoped APIs: /api/trips/:tripId/documents');
    }
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const isAdmin = user.isSuperAdmin || user.role === "admin";
    
    try {
      let result;
      if (userId) {
        if (!isAdmin && userId !== user.id) {
          return res.status(403).json({ error: "You can only view your own documents" });
        }
        result = await storage.getUserDocuments(userId as string);
      } else if (vehicleId) {
        // Allow if admin or owner of vehicle (check is done at storage level for simplicity)
        result = await storage.getVehicleDocuments(vehicleId as string);
      } else if (transporterId) {
        if (!isAdmin && transporterId !== user.transporterId) {
          return res.status(403).json({ error: "You can only view your own transporter documents" });
        }
        result = await storage.getTransporterDocuments(transporterId as string);
      } else {
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all documents" });
        }
        result = await storage.getAllDocuments();
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", uploadLimiter, async (req, res) => {
    const sessionUser = getCurrentUser(req);
    if (!sessionUser?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const data = insertDocumentSchema.parse(req.body);
      
      // Always set userId from session for audit trail (who uploaded the document)
      if (!data.userId) {
        data.userId = sessionUser.id;
      }
      
      // For transporters, enforce that transporterId matches session
      if (sessionUser.transporterId) {
        if (data.transporterId && data.transporterId !== sessionUser.transporterId) {
          return res.status(403).json({ error: "Cannot create document for another transporter" });
        }
        // Auto-set transporterId from session if not provided
        if (!data.transporterId) {
          data.transporterId = sessionUser.transporterId;
        }
      }
      
      // AUTOMATIC DOCUMENT REPLACEMENT - Enforce ONE document per type per entity
      // If a document of the same type exists (not already replaced), automatically replace it
      const entityId = data.entityType === "driver" ? data.userId :
                       data.entityType === "vehicle" ? data.vehicleId : data.transporterId;
      
      if (entityId) {
        const existingDoc = await storage.findActiveDocumentByType(data.entityType, entityId, data.type);
        if (existingDoc) {
          // Mark the existing document as replaced
          await storage.updateDocumentStatus(existingDoc.id, "replaced" as any, sessionUser.id, null);
        }
      }
      
      const document = await storage.createDocument(data);
      res.status(201).json(document);
    } catch (error) {
      console.error("Document creation error:", error);
      res.status(400).json({ error: "Invalid document data" });
    }
  });

  // POST /api/documents/upload - Combined file upload + document creation (atomic)
  app.post("/api/documents/upload", uploadLimiter, async (req, res) => {
    const sessionUser = getCurrentUser(req);
    if (!sessionUser?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const { 
        fileData, 
        fileName, 
        contentType,
        entityType,
        type,
        entityId,
        expiryDate,
        replaceDocumentId
      } = req.body;

      if (!fileData || !fileName || !contentType || !entityType || !type || !entityId) {
        return res.status(400).json({ error: "fileData, fileName, contentType, entityType, type, and entityId are required" });
      }

      // Determine IDs based on entityType
      let userId: string | undefined;
      let vehicleId: string | undefined;
      let transporterId = sessionUser.transporterId;

      if (entityType === "driver") {
        userId = entityId;
      } else if (entityType === "vehicle") {
        vehicleId = entityId;
      } else if (entityType === "transporter") {
        transporterId = entityId;
      }

      // AUTOMATIC DOCUMENT REPLACEMENT - Enforce ONE document per type per entity
      // If a document of the same type exists (not already replaced), automatically replace it
      let autoReplaceDocumentId: string | undefined = replaceDocumentId;
      
      if (!autoReplaceDocumentId) {
        // Find existing active document of same type for this entity
        const existingEntityId = entityType === "driver" ? userId :
                                  entityType === "vehicle" ? vehicleId : transporterId;
        
        if (existingEntityId) {
          const existingDoc = await storage.findActiveDocumentByType(entityType, existingEntityId, type);
          if (existingDoc) {
            // Automatically set this document to be replaced
            autoReplaceDocumentId = existingDoc.id;
          }
        }
      } else {
        // Validate explicit replaceDocumentId - ensure it exists and belongs to the same entity
        const existingDoc = await storage.getDocumentById(autoReplaceDocumentId);
        if (!existingDoc) {
          return res.status(404).json({ error: "Document to replace not found" });
        }
        
        // Verify ownership based on entity type
        const ownsDocument = 
          (entityType === "driver" && existingDoc.userId === userId) ||
          (entityType === "vehicle" && existingDoc.vehicleId === vehicleId) ||
          (entityType === "transporter" && existingDoc.transporterId === transporterId);
        
        if (!ownsDocument) {
          return res.status(403).json({ error: "Not authorized to replace this document" });
        }
        
        // Verify the document type matches
        if (existingDoc.type !== type) {
          return res.status(400).json({ error: "Document type mismatch" });
        }
      }

      // Upload file to storage
      const spacesStorage = getSpacesStorage();
      const isReplit = process.env.REPL_ID !== undefined;
      let fileUrl: string;
      
      if (spacesStorage) {
        // Use DigitalOcean Spaces
        const storagePath = getDocumentStoragePath({
          entityType,
          transporterId,
          vehicleId,
          userId: userId || sessionUser.id,
        });

        const buffer = Buffer.from(fileData, "base64");
        const { key } = await spacesStorage.uploadPrivateFile(
          buffer,
          fileName,
          contentType,
          storagePath
        );
        fileUrl = key;
      } else if (isReplit) {
        // Use Replit Object Storage
        const objectStorageService = new ObjectStorageService();
        const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL(fileName);
        
        // Upload file directly
        const buffer = Buffer.from(fileData, "base64");
        const uploadResponse = await fetch(uploadURL, {
          method: "PUT",
          body: buffer,
          headers: { "Content-Type": contentType },
        });
        
        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to storage");
        }

        // Set ACL
        const ownerId = transporterId || sessionUser.id;
        await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
          owner: ownerId,
          visibility: "private",
        });
        
        fileUrl = objectPath;
      } else {
        return res.status(503).json({ error: "No storage configured" });
      }

      // If replacing (either explicitly or automatically), mark the old document as "replaced"
      if (autoReplaceDocumentId) {
        await storage.updateDocumentStatus(autoReplaceDocumentId, "replaced" as any, sessionUser.id, null);
      }

      // Create document record
      const docLabel = type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const document = await storage.createDocument({
        type,
        url: fileUrl,
        entityType,
        userId: userId || sessionUser.id,
        vehicleId,
        transporterId,
        expiryDate: expiryDate || undefined,
        documentName: docLabel,
        status: "pending",
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upload document" });
    }
  });

  // PATCH /api/documents/:id/status - Admin only (to verify/reject documents)
  app.patch("/api/documents/:id/status", protectedLimiter, requireAdmin, async (req, res) => {
    try {
      const adminUser = getCurrentUser(req);
      if (!adminUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const { status, rejectionReason } = req.body;
      
      if (status === "rejected" && !rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }
      
      // Clear rejection reason when approving
      const reason = status === "verified" ? null : rejectionReason;
      await storage.updateDocumentStatus(req.params.id, status, adminUser.id, reason);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update document status" });
    }
  });

  // ===========================================
  // TRIP-SCOPED DOCUMENT APIs
  // ===========================================

  // Helper to check trip access for documents
  const checkTripDocumentAccess = async (tripId: string, user: any): Promise<{ ride: Ride | undefined; hasAccess: boolean; error?: string }> => {
    const ride = await storage.getRide(tripId);
    if (!ride) {
      return { ride: undefined, hasAccess: false, error: "Trip not found" };
    }

    // Admin has full access
    if (user.isSuperAdmin || user.role === "admin") {
      return { ride, hasAccess: true };
    }

    // Customer can access their own trips
    if (user.role === "customer" && ride.createdById === user.id) {
      return { ride, hasAccess: true };
    }

    // Transporter can access assigned trips
    if (user.role === "transporter" && user.transporterId && ride.transporterId === user.transporterId) {
      return { ride, hasAccess: true };
    }

    // Driver can access their assigned trips
    if (user.role === "driver" && ride.assignedDriverId === user.id) {
      return { ride, hasAccess: true };
    }

    return { ride, hasAccess: false, error: "Access denied to this trip" };
  };

  // GET /api/trips/:tripId/documents - List documents for a trip
  app.get("/api/trips/:tripId/documents", requireAuth, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { tripId } = req.params;
      const { hasAccess, error } = await checkTripDocumentAccess(tripId, sessionUser);

      if (!hasAccess) {
        return res.status(error === "Trip not found" ? 404 : 403).json({ error });
      }

      const documents = await storage.getTripDocuments(tripId);
      res.json(documents);
    } catch (error) {
      console.error("Failed to get trip documents:", error);
      res.status(500).json({ error: "Failed to get trip documents" });
    }
  });

  // POST /api/trips/:tripId/documents/upload-url - Get upload URL for trip document
  app.post("/api/trips/:tripId/documents/upload-url", requireAuth, uploadLimiter, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { tripId } = req.params;
      const { hasAccess, ride, error } = await checkTripDocumentAccess(tripId, sessionUser);

      if (!hasAccess) {
        return res.status(error === "Trip not found" ? 404 : 403).json({ error });
      }

      const { fileName, contentType } = req.body;
      if (!fileName) {
        return res.status(400).json({ error: "fileName is required" });
      }

      // Check if running on Replit
      const isReplit = process.env.REPL_ID !== undefined;
      
      if (isReplit) {
        // Use Replit Object Storage
        const objectStorageService = new ObjectStorageService();
        const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL(fileName);
        res.json({ uploadURL, objectPath, storageType: "replit" });
      } else {
        // Use DigitalOcean Spaces - return info about how to upload
        const spacesStorage = getSpacesStorage();
        if (!spacesStorage) {
          return res.status(503).json({ error: "Storage not configured" });
        }

        // Build the storage path for trip documents
        const storagePath = getDocumentStoragePath({
          entityType: "trip",
          rideId: tripId,
          transporterId: ride?.transporterId || undefined,
        });

        res.json({ 
          useSpacesApi: true, 
          storagePath,
          message: "Use POST /api/spaces/upload with this storagePath",
          storageType: "spaces"
        });
      }
    } catch (error) {
      console.error("Failed to get upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // POST /api/trips/:tripId/documents - Create document record for trip
  app.post("/api/trips/:tripId/documents", requireAuth, uploadLimiter, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { tripId } = req.params;
      const { hasAccess, ride, error } = await checkTripDocumentAccess(tripId, sessionUser);

      if (!hasAccess) {
        return res.status(error === "Trip not found" ? 404 : 403).json({ error });
      }

      const { type, url, storagePath, documentName, expiryDate } = req.body;

      if (!type || !url || !documentName) {
        return res.status(400).json({ error: "type, url, and documentName are required" });
      }

      // Determine IDs based on who is uploading
      let customerId: string | undefined;
      let transporterId: string | undefined;

      if (sessionUser.role === "customer") {
        customerId = sessionUser.id;
      } else if (sessionUser.transporterId) {
        transporterId = sessionUser.transporterId;
      }

      const document = await storage.createDocument({
        type,
        url,
        storagePath,
        documentName,
        expiryDate,
        entityType: "trip",
        rideId: tripId,
        userId: sessionUser.id,
        customerId,
        transporterId: transporterId || ride?.transporterId,
        status: "pending",
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Failed to create trip document:", error);
      res.status(500).json({ error: "Failed to create trip document" });
    }
  });

  // DELETE /api/trips/:tripId/documents/:documentId - Soft delete trip document
  app.delete("/api/trips/:tripId/documents/:documentId", requireAuth, async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { tripId, documentId } = req.params;
      const { hasAccess, error } = await checkTripDocumentAccess(tripId, sessionUser);

      if (!hasAccess) {
        return res.status(error === "Trip not found" ? 404 : 403).json({ error });
      }

      // Get the document and verify it belongs to this trip
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.rideId !== tripId) {
        return res.status(403).json({ error: "Document does not belong to this trip" });
      }

      // Only allow deletion if user uploaded it or is admin
      const isAdmin = sessionUser.isSuperAdmin || sessionUser.role === "admin";
      const isOwner = document.userId === sessionUser.id;

      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "You can only delete your own documents" });
      }

      // Soft delete - preserve history
      await storage.softDeleteDocument(documentId, sessionUser.id);

      res.json({ success: true, message: "Document deleted" });
    } catch (error) {
      console.error("Failed to delete trip document:", error);
      res.status(500).json({ error: "Failed to delete trip document" });
    }
  });

  // PATCH /api/trips/:tripId/documents/:documentId/status - Admin verify/reject trip document
  app.patch("/api/trips/:tripId/documents/:documentId/status", requireAdmin, protectedLimiter, async (req, res) => {
    try {
      const adminUser = getCurrentUser(req);
      if (!adminUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { tripId, documentId } = req.params;
      const { status, rejectionReason } = req.body;

      // Verify trip exists
      const ride = await storage.getRide(tripId);
      if (!ride) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Get the document and verify it belongs to this trip
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.rideId !== tripId) {
        return res.status(403).json({ error: "Document does not belong to this trip" });
      }

      // Validate status
      const validStatuses = ["verified", "pending", "rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }

      if (status === "rejected" && !rejectionReason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      const reason = status === "verified" ? null : rejectionReason;
      await storage.updateDocumentStatus(documentId, status, adminUser.id, reason);

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to update trip document status:", error);
      res.status(500).json({ error: "Failed to update document status" });
    }
  });

  // File upload routes for document storage (requires authentication)
  // Note: This route only works on Replit. For DigitalOcean, use /api/spaces/upload instead
  app.post("/api/objects/upload", async (req, res) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Check if running on Replit - ObjectStorageService only works there
    const isReplit = process.env.REPL_ID !== undefined;
    if (!isReplit) {
      // On non-Replit environments, check if Spaces is configured and redirect
      const spacesStorage = getSpacesStorage();
      if (spacesStorage) {
        return res.status(400).json({ 
          error: "Use /api/spaces/upload for file uploads on this server",
          useSpacesApi: true
        });
      }
      return res.status(503).json({ error: "Object storage not configured for this environment" });
    }
    
    try {
      const { fileName } = req.body;
      const objectStorageService = new ObjectStorageService();
      const { uploadURL, objectPath } = await objectStorageService.getObjectEntityUploadURL(fileName);
      res.json({ uploadURL, objectPath });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve uploaded files (authenticated users with ACL access)
  // Note: This route only works on Replit. For DigitalOcean, use /api/spaces/download/:key instead
  app.get("/objects/:objectPath(*)", requireAuth, async (req, res) => {
    const user = getCurrentUser(req)!;
    
    // Check if running on Replit - ObjectStorageService only works there
    const isReplit = process.env.REPL_ID !== undefined;
    if (!isReplit) {
      return res.status(503).json({ 
        error: "Object storage not available. Use /api/spaces/download/:key for file downloads.",
        useSpacesApi: true
      });
    }
    
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Super admins can access all documents
      if (user.isSuperAdmin || user.role === "admin") {
        return objectStorageService.downloadObject(objectFile, res);
      }
      
      // Check if user has permission to access this file
      const userId = user.transporterId || user.id;
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId,
        requestedPermission: ObjectPermission.READ,
      });
      
      if (!canAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error fetching object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Confirm file upload and set ACL (requires authentication)
  // Note: This route only works on Replit. For DigitalOcean, Spaces uploads don't need confirmation
  app.post("/api/objects/confirm", requireAuth, async (req, res) => {
    const user = getCurrentUser(req)!;
    
    // Check if running on Replit - ObjectStorageService only works there
    const isReplit = process.env.REPL_ID !== undefined;
    if (!isReplit) {
      // On Spaces, uploads don't need confirmation - ACL is set during upload
      return res.status(200).json({ 
        message: "Spaces uploads do not require confirmation",
        useSpacesApi: true
      });
    }
    
    try {
      const { objectPath } = req.body;
      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }
      
      // Use session user's transporterId if available, otherwise their userId
      const ownerId = user.transporterId || user.id;
      
      const objectStorageService = new ObjectStorageService();
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        objectPath,
        {
          owner: ownerId,
          visibility: "private", // Private by default - only owner and admins can access
        }
      );
      
      res.json({ objectPath: normalizedPath });
    } catch (error) {
      console.error("Error confirming upload:", error);
      res.status(500).json({ error: "Failed to confirm upload" });
    }
  });

  // ===========================================
  // DIGITALOCEAN SPACES FILE STORAGE
  // ===========================================

  // Upload document to DigitalOcean Spaces with organized folder structure
  app.post("/api/spaces/upload", uploadLimiter, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(503).json({ error: "Spaces storage not configured" });
      }

      const { 
        fileData, 
        fileName, 
        contentType,
        entityType,
        transporterId,
        vehicleId,
        userId,
        customerId,
        rideId
      } = req.body;

      if (!fileData || !fileName || !contentType || !entityType) {
        return res.status(400).json({ error: "fileData, fileName, contentType, and entityType are required" });
      }

      // Validate entityType
      const validEntityTypes = ["driver", "vehicle", "transporter", "customer", "trip"];
      if (!validEntityTypes.includes(entityType)) {
        return res.status(400).json({ error: `Invalid entityType. Must be one of: ${validEntityTypes.join(", ")}` });
      }

      // Resolve IDs - use request body values or fall back to session user
      const resolvedTransporterId = transporterId || user.transporterId;
      const resolvedUserId = userId || user.id;
      const resolvedCustomerId = customerId || (user.role === "customer" ? user.id : undefined);

      // Early validation for required IDs based on entityType
      if (entityType === "transporter" && !resolvedTransporterId) {
        return res.status(400).json({ error: "transporterId is required for transporter documents. Please re-login." });
      }
      if (entityType === "driver" && (!resolvedTransporterId || !resolvedUserId)) {
        return res.status(400).json({ error: "transporterId and userId are required for driver documents" });
      }
      if (entityType === "vehicle" && (!resolvedTransporterId || !vehicleId)) {
        return res.status(400).json({ error: "transporterId and vehicleId are required for vehicle documents" });
      }
      if (entityType === "customer" && !resolvedCustomerId && !resolvedUserId) {
        return res.status(400).json({ error: "customerId or userId is required for customer documents" });
      }
      if (entityType === "trip" && !rideId) {
        return res.status(400).json({ error: "rideId is required for trip documents" });
      }

      // Get organized storage path based on entity type
      const storagePath = getDocumentStoragePath({
        entityType,
        transporterId: resolvedTransporterId,
        vehicleId,
        userId: resolvedUserId,
        customerId: resolvedCustomerId,
        rideId
      });

      // Decode base64 file data
      const buffer = Buffer.from(fileData, "base64");

      // Upload to Spaces with organized path
      const { key } = await spacesStorage.uploadPrivateFile(
        buffer,
        fileName,
        contentType,
        storagePath
      );

      res.json({ 
        key, 
        storagePath,
        message: "File uploaded successfully" 
      });
    } catch (error: any) {
      console.error("Spaces upload error:", error);
      res.status(500).json({ error: error.message || "Failed to upload file" });
    }
  });

  // Download document from DigitalOcean Spaces
  app.get("/api/spaces/download/:key(*)", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(503).json({ error: "Spaces storage not configured" });
      }

      const key = req.params.key;
      
      // Super admins can access all documents
      if (user.isSuperAdmin || user.role === "admin") {
        return spacesStorage.downloadObject(key, res);
      }

      // Check if user has access to this file based on path
      // Path formats: 
      // - private/transporters/{transporterId}/...
      // - private/transporters/{transporterId}/drivers/{userId}/...
      // - private/transporters/{transporterId}/vehicles/{vehicleId}/...
      // - private/customers/{userId}/...
      // - private/trips/{rideId}/transporter/...
      // - private/trips/{rideId}/customer/...
      const hasAccess = await checkSpacesFileAccess(key, user, storage);

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      await spacesStorage.downloadObject(key, res);
    } catch (error) {
      if (error instanceof SpacesNotFoundError) {
        return res.status(404).json({ error: "File not found" });
      }
      console.error("Spaces download error:", error);
      res.status(500).json({ error: "Failed to download file" });
    }
  });

  // Get signed URL for temporary access to a Spaces file
  app.post("/api/spaces/signed-url", async (req, res) => {
    const user = getCurrentUser(req);
    if (!user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(503).json({ error: "Spaces storage not configured" });
      }

      const { key, expiresIn } = req.body;
      if (!key) {
        return res.status(400).json({ error: "key is required" });
      }

      // Check access permissions (same logic as download)
      const isAdmin = user.isSuperAdmin || user.role === "admin";
      const hasAccess = isAdmin || await checkSpacesFileAccess(key, user, storage);

      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const signedUrl = await spacesStorage.getSignedUrl(key, expiresIn || 3600);
      res.json({ signedUrl, expiresIn: expiresIn || 3600 });
    } catch (error) {
      console.error("Signed URL error:", error);
      res.status(500).json({ error: "Failed to generate signed URL" });
    }
  });

  // ===========================================
  // BOOKING FLOW - Matching & Notifications
  // ===========================================

  // Find matching transporters for a ride (for admin/customer to see who can fulfill)
  app.get("/api/rides/:rideId/matches", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const ride = await storage.getRide(req.params.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Only super admin or the customer who created the ride can see matches
      if (!sessionUser.isSuperAdmin && ride.createdById !== sessionUser.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const matches = await storage.findMatchingTransporters(ride);
      res.json(matches);
    } catch (error) {
      console.error("Failed to find matches:", error);
      res.status(500).json({ error: "Failed to find matching transporters" });
    }
  });

  // Notify matching transporters about a new ride (creates notifications for all matches)
  app.post("/api/rides/:rideId/notify-transporters", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    // Only super admin or customer who created the ride can send notifications
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const ride = await storage.getRide(req.params.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      if (!sessionUser.isSuperAdmin && sessionUser.role !== "customer") {
        return res.status(403).json({ error: "Only admin or customers can send booking notifications" });
      }
      
      if (!sessionUser.isSuperAdmin && ride.createdById !== sessionUser.id) {
        return res.status(403).json({ error: "You can only notify transporters for your own rides" });
      }
      
      // Find matching transporters
      const matches = await storage.findMatchingTransporters(ride);
      
      // Create notifications for each matching transporter
      const notificationPromises = matches.map(async (match) => {
        // Find the user associated with this transporter to send notification
        const transporterUsers = await storage.getUsersByTransporter(match.transporter.id);
        
        // Create notification for each user under this transporter
        for (const user of transporterUsers) {
          await storage.createNotification({
            recipientId: user.id,
            recipientTransporterId: match.transporter.id,
            type: "new_booking",
            title: "New Booking Request",
            message: `New trip from ${ride.pickupLocation} to ${ride.dropLocation} - ${ride.cargoType} (${ride.weight}). Budget: ₹${ride.price}`,
            rideId: ride.id,
            matchScore: match.matchScore,
            matchReason: match.matchReason,
          });
        }
        
        // Also notify owner-operator if applicable
        if (match.transporter.isOwnerOperator && match.transporter.ownerDriverUserId) {
          await storage.createNotification({
            recipientId: match.transporter.ownerDriverUserId,
            recipientTransporterId: match.transporter.id,
            type: "new_booking",
            title: "New Booking Request",
            message: `New trip from ${ride.pickupLocation} to ${ride.dropLocation} - ${ride.cargoType} (${ride.weight}). Budget: ₹${ride.price}`,
            rideId: ride.id,
            matchScore: match.matchScore,
            matchReason: match.matchReason,
          });
        }
      });
      
      await Promise.all(notificationPromises);
      
      res.json({ 
        success: true, 
        message: `Notified ${matches.length} transporters`,
        matchesCount: matches.length
      });
    } catch (error) {
      console.error("Failed to notify transporters:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const { unreadOnly } = req.query;
      let notifications;
      
      if (unreadOnly === "true") {
        notifications = await storage.getUnreadNotifications(sessionUser.id);
      } else {
        notifications = await storage.getUserNotifications(sessionUser.id);
      }
      
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      await storage.markNotificationRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/mark-all-read", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      await storage.markAllNotificationsRead(sessionUser.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Accept bid route - allows BOTH super admin AND customer to accept bids
  app.post("/api/bids/:bidId/accept", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const bid = await storage.getBid(req.params.bidId);
      if (!bid) {
        return res.status(404).json({ error: "Bid not found" });
      }
      
      const ride = await storage.getRide(bid.rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      // Check if bidding is already closed
      if (ride.biddingStatus === "closed") {
        return res.status(400).json({ error: "A bid has already been accepted for this trip" });
      }
      
      // Check authorization - super admin can accept any, customer can only accept on their rides
      const isSuperAdmin = sessionUser.isSuperAdmin;
      const isRideOwner = ride.createdById === sessionUser.id;
      
      if (!isSuperAdmin && !isRideOwner) {
        return res.status(403).json({ error: "Only the ride owner or admin can accept bids" });
      }
      
      // Verify transporter is still active/verified before accepting their bid
      if (bid.transporterId) {
        const transporter = await storage.getTransporter(bid.transporterId);
        if (!transporter) {
          return res.status(400).json({ error: "Transporter account not found. Cannot accept this bid." });
        }
        if (transporter.status !== "active") {
          return res.status(400).json({ error: "This transporter's account is not verified. Cannot accept their bid." });
        }
      }
      
      // Update bid status to accepted
      await storage.updateBidStatus(bid.id, "accepted");
      
      // Update ride with accepted bid and transporter, and close bidding
      await storage.updateRideAcceptedBid(ride.id, bid.id, bid.transporterId || "");
      
      // Close bidding and record who accepted
      await storage.closeBidding(ride.id, sessionUser.id);
      
      // Assign driver and vehicle if available
      if (bid.userId && bid.vehicleId) {
        await storage.assignRideToDriver(ride.id, bid.userId, bid.vehicleId);
      }
      
      // Reject all other pending bids for this ride
      const allBids = await storage.getRideBids(ride.id);
      for (const otherBid of allBids) {
        if (otherBid.id !== bid.id && otherBid.status === "pending") {
          await storage.updateBidStatus(otherBid.id, "rejected");
          
          // Notify rejected bidders that bidding is closed
          if (otherBid.userId) {
            await storage.createNotification({
              recipientId: otherBid.userId,
              recipientTransporterId: otherBid.transporterId || undefined,
              type: "bid_rejected",
              title: "Bidding Closed",
              message: `Bidding for trip ${ride.pickupLocation} to ${ride.dropLocation} has closed. Another bid was selected.`,
              rideId: ride.id,
              bidId: otherBid.id,
            });
          }
        }
      }
      
      // Notify the winner
      if (bid.userId) {
        await storage.createNotification({
          recipientId: bid.userId,
          recipientTransporterId: bid.transporterId || undefined,
          type: "bid_accepted",
          title: "Bid Accepted!",
          message: `Your bid of ₹${bid.amount} for trip ${ride.pickupLocation} to ${ride.dropLocation} has been accepted!`,
          rideId: ride.id,
          bidId: bid.id,
        });
      }
      
      // Notify the customer that bid was accepted (if super admin accepted it)
      if (isSuperAdmin && ride.createdById) {
        await storage.createNotification({
          recipientId: ride.createdById,
          type: "ride_assigned",
          title: "Trip Assigned",
          message: `Your trip from ${ride.pickupLocation} to ${ride.dropLocation} has been assigned. Bid amount: ₹${bid.amount}`,
          rideId: ride.id,
          bidId: bid.id,
        });
      }
      
      // If customer accepted the bid, notify them about the assignment
      if (!isSuperAdmin && isRideOwner) {
        await storage.createNotification({
          recipientId: sessionUser.id,
          type: "ride_assigned",
          title: "Trip Confirmed",
          message: `You accepted the bid of ₹${bid.amount} for your trip. A transporter has been assigned.`,
          rideId: ride.id,
          bidId: bid.id,
        });
      }
      
      res.json({ success: true, message: "Bid accepted and trip assigned. Bidding is now closed." });
    } catch (error) {
      console.error("Failed to accept bid:", error);
      res.status(500).json({ error: "Failed to accept bid" });
    }
  });

  // ============== ROLES MANAGEMENT ==============
  
  // Get all available permissions
  app.get("/api/permissions", requireAdmin, async (req: Request, res: Response) => {
    res.json(PERMISSIONS);
  });

  // Get all roles - Admin only
  app.get("/api/roles", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allRoles = await storage.getAllRoles();
      res.json(allRoles);
    } catch (error) {
      console.error("Failed to get roles:", error);
      res.status(500).json({ error: "Failed to get roles" });
    }
  });

  // Create a new role - Admin only
  app.post("/api/roles", requireAdmin, async (req: Request, res: Response) => {
    try {
      const parseResult = insertRoleSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid role data", details: parseResult.error.errors });
      }
      const newRole = await storage.createRole(parseResult.data);
      res.status(201).json(newRole);
    } catch (error: any) {
      console.error("Failed to create role:", error);
      if (error.message?.includes("unique")) {
        return res.status(400).json({ error: "Role name already exists" });
      }
      res.status(500).json({ error: "Failed to create role" });
    }
  });

  // Update a role - Admin only
  app.patch("/api/roles/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const role = await storage.getRole(id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      if (role.isSystem) {
        return res.status(403).json({ error: "Cannot modify system roles" });
      }
      const updated = await storage.updateRole(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update role:", error);
      res.status(500).json({ error: "Failed to update role" });
    }
  });

  // Delete a role - Admin only
  app.delete("/api/roles/:id", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const role = await storage.getRole(id);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      if (role.isSystem) {
        return res.status(403).json({ error: "Cannot delete system roles" });
      }
      await storage.deleteRole(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete role:", error);
      res.status(500).json({ error: "Failed to delete role" });
    }
  });

  // Get user's roles
  app.get("/api/users/:userId/roles", requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const sessionUser = getCurrentUser(req);
      
      // Allow users to see their own roles, admins can see anyone's
      if (sessionUser.id !== userId && !sessionUser.isSuperAdmin && sessionUser.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const userRolesList = await storage.getUserRoles(userId);
      res.json(userRolesList);
    } catch (error) {
      console.error("Failed to get user roles:", error);
      res.status(500).json({ error: "Failed to get user roles" });
    }
  });

  // Assign role to user - Admin only
  app.post("/api/users/:userId/roles", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      
      if (!roleId) {
        return res.status(400).json({ error: "roleId is required" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const role = await storage.getRole(roleId);
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
      
      const sessionUser = getCurrentUser(req);
      const userRole = await storage.assignRoleToUser({
        userId,
        roleId,
        assignedBy: sessionUser.id
      });
      
      res.status(201).json(userRole);
    } catch (error: any) {
      console.error("Failed to assign role:", error);
      if (error.message?.includes("duplicate") || error.message?.includes("unique")) {
        return res.status(400).json({ error: "User already has this role" });
      }
      res.status(500).json({ error: "Failed to assign role" });
    }
  });

  // Remove role from user - Admin only
  app.delete("/api/users/:userId/roles/:roleId", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, roleId } = req.params;
      await storage.removeRoleFromUser(userId, roleId);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove role:", error);
      res.status(500).json({ error: "Failed to remove role" });
    }
  });

  // ============== SAVED ADDRESSES ==============

  // Get transporter's saved addresses
  app.get("/api/saved-addresses", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      
      if (!sessionUser.transporterId) {
        return res.status(400).json({ error: "No transporter associated with this user" });
      }
      
      const addresses = await storage.getTransporterSavedAddresses(sessionUser.transporterId);
      res.json(addresses);
    } catch (error) {
      console.error("Failed to get saved addresses:", error);
      res.status(500).json({ error: "Failed to get saved addresses" });
    }
  });

  // Create saved address
  app.post("/api/saved-addresses", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      
      if (!sessionUser.transporterId) {
        return res.status(400).json({ error: "No transporter associated with this user" });
      }
      
      const parseResult = insertSavedAddressSchema.safeParse({
        ...req.body,
        transporterId: sessionUser.transporterId,
        userId: sessionUser.id
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid address data", details: parseResult.error.errors });
      }
      
      const newAddress = await storage.createSavedAddress(parseResult.data);
      res.status(201).json(newAddress);
    } catch (error) {
      console.error("Failed to create saved address:", error);
      res.status(500).json({ error: "Failed to create saved address" });
    }
  });

  // Update saved address
  app.patch("/api/saved-addresses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionUser = getCurrentUser(req);
      
      const address = await storage.getSavedAddress(id);
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }
      
      if (address.transporterId !== sessionUser.transporterId && !sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateSavedAddress(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update saved address:", error);
      res.status(500).json({ error: "Failed to update saved address" });
    }
  });

  // Delete saved address
  app.delete("/api/saved-addresses/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionUser = getCurrentUser(req);
      
      const address = await storage.getSavedAddress(id);
      if (!address) {
        return res.status(404).json({ error: "Address not found" });
      }
      
      if (address.transporterId !== sessionUser.transporterId && !sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteSavedAddress(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete saved address:", error);
      res.status(500).json({ error: "Failed to delete saved address" });
    }
  });

  // ============== DRIVER APPLICATIONS ==============

  // Get all driver applications - Admin or Transporter
  app.get("/api/driver-applications", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      
      if (sessionUser.isSuperAdmin || sessionUser.role === "admin") {
        const applications = await storage.getAllDriverApplications();
        res.json(applications);
      } else if (sessionUser.role === "transporter" && sessionUser.transporterId) {
        // Transporters can only see active applications
        const applications = await storage.getActiveDriverApplications();
        res.json(applications);
      } else {
        return res.status(403).json({ error: "Access denied" });
      }
    } catch (error) {
      console.error("Failed to get driver applications:", error);
      res.status(500).json({ error: "Failed to get driver applications" });
    }
  });

  // Get driver application with full driver details
  app.get("/api/driver-applications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionUser = getCurrentUser(req);
      
      const application = await storage.getDriverApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      // Get driver details
      const driver = await storage.getUser(application.driverId);
      
      // Get driver documents
      const documents = await storage.getUserDocuments(application.driverId);
      
      res.json({
        ...application,
        driver,
        documents
      });
    } catch (error) {
      console.error("Failed to get driver application:", error);
      res.status(500).json({ error: "Failed to get driver application" });
    }
  });

  // Get my driver application (for drivers)
  app.get("/api/my-driver-application", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      
      if (sessionUser.role !== "driver") {
        return res.status(400).json({ error: "Only drivers can have applications" });
      }
      
      const application = await storage.getDriverApplicationByDriverId(sessionUser.id);
      res.json(application || null);
    } catch (error) {
      console.error("Failed to get my driver application:", error);
      res.status(500).json({ error: "Failed to get driver application" });
    }
  });

  // Create driver application (drivers only)
  app.post("/api/driver-applications", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      
      if (sessionUser.role !== "driver") {
        return res.status(400).json({ error: "Only drivers can create job applications" });
      }
      
      // Check if already has a transporter
      const user = await storage.getUser(sessionUser.id);
      if (user?.transporterId) {
        return res.status(400).json({ error: "You are already associated with a transporter" });
      }
      
      // Check if already has an active application
      const existingApplication = await storage.getDriverApplicationByDriverId(sessionUser.id);
      if (existingApplication && existingApplication.status === "active") {
        return res.status(400).json({ error: "You already have an active job application" });
      }
      
      const parseResult = insertDriverApplicationSchema.safeParse({
        ...req.body,
        driverId: sessionUser.id,
        documentsComplete: user?.documentsComplete || false,
        status: "active"
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid application data", details: parseResult.error.errors });
      }
      
      const newApplication = await storage.createDriverApplication(parseResult.data);
      res.status(201).json(newApplication);
    } catch (error) {
      console.error("Failed to create driver application:", error);
      res.status(500).json({ error: "Failed to create driver application" });
    }
  });

  // Update driver application
  app.patch("/api/driver-applications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionUser = getCurrentUser(req);
      
      const application = await storage.getDriverApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      // Only the driver who created it can update it
      if (application.driverId !== sessionUser.id && !sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateDriverApplication(id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Failed to update driver application:", error);
      res.status(500).json({ error: "Failed to update driver application" });
    }
  });

  // Withdraw driver application
  app.post("/api/driver-applications/:id/withdraw", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionUser = getCurrentUser(req);
      
      const application = await storage.getDriverApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      if (application.driverId !== sessionUser.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updated = await storage.updateDriverApplication(id, { status: "withdrawn" });
      res.json({ success: true, application: updated });
    } catch (error) {
      console.error("Failed to withdraw application:", error);
      res.status(500).json({ error: "Failed to withdraw application" });
    }
  });

  // Hire a driver - Transporter only
  app.post("/api/driver-applications/:id/hire", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const sessionUser = getCurrentUser(req);
      
      if (sessionUser.role !== "transporter" && !sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Only transporters can hire drivers" });
      }
      
      if (!sessionUser.transporterId && !sessionUser.isSuperAdmin) {
        return res.status(400).json({ error: "No transporter associated with this user" });
      }
      
      const application = await storage.getDriverApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }
      
      if (application.status !== "active") {
        return res.status(400).json({ error: "This application is no longer active" });
      }
      
      // For admin, use transporterId from request body, otherwise use session transporterId
      const transporterId = sessionUser.isSuperAdmin ? req.body.transporterId : sessionUser.transporterId;
      
      if (!transporterId) {
        return res.status(400).json({ error: "transporterId is required" });
      }
      
      await storage.hireDriver(id, transporterId);
      
      // Get driver for notification
      const driver = await storage.getUser(application.driverId);
      const transporter = await storage.getTransporter(transporterId);
      
      // Notify the driver
      await storage.createNotification({
        recipientId: application.driverId,
        type: "general",
        title: "You've Been Hired!",
        message: `Congratulations! ${transporter?.companyName || "A transporter"} has hired you. You are now part of their team.`,
      });
      
      res.json({ success: true, message: "Driver hired successfully" });
    } catch (error) {
      console.error("Failed to hire driver:", error);
      res.status(500).json({ error: "Failed to hire driver" });
    }
  });

  // Get vehicle types for driver applications
  app.get("/api/vehicle-types", async (req: Request, res: Response) => {
    res.json(VEHICLE_TYPES);
  });

  // ============== ADMIN STORAGE MANAGEMENT ==============

  // List all files in Spaces storage (super admin only)
  app.get("/api/admin/storage", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(400).json({ error: "Storage not configured" });
      }

      const { prefix = "", maxKeys = "100" } = req.query;
      const keys = await spacesStorage.listObjects(prefix as string, parseInt(maxKeys as string, 10));
      
      // Get file details for each key
      const files = await Promise.all(
        keys.map(async (key) => {
          try {
            const { contentType, contentLength } = await spacesStorage.getObject(key);
            return {
              key,
              contentType,
              size: contentLength,
              isImage: contentType?.startsWith("image/") || false,
            };
          } catch {
            return { key, contentType: "unknown", size: 0, isImage: false };
          }
        })
      );

      res.json({ files, prefix, total: files.length });
    } catch (error) {
      console.error("Failed to list storage files:", error);
      res.status(500).json({ error: "Failed to list storage files" });
    }
  });

  // Get file details and signed URL (super admin only)
  app.get("/api/admin/storage/file", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(400).json({ error: "Storage not configured" });
      }

      const { key } = req.query;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "File key is required" });
      }

      const exists = await spacesStorage.objectExists(key);
      if (!exists) {
        return res.status(404).json({ error: "File not found" });
      }

      const { contentType, contentLength } = await spacesStorage.getObject(key);
      const signedUrl = await spacesStorage.getSignedUrl(key, 3600);

      res.json({
        key,
        contentType,
        size: contentLength,
        signedUrl,
        isImage: contentType?.startsWith("image/") || false,
      });
    } catch (error) {
      console.error("Failed to get file details:", error);
      res.status(500).json({ error: "Failed to get file details" });
    }
  });

  // Delete a file from Spaces storage (super admin only)
  app.delete("/api/admin/storage/file", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(400).json({ error: "Storage not configured" });
      }

      const { key } = req.query;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ error: "File key is required" });
      }

      await spacesStorage.deleteObject(key);

      res.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      console.error("Failed to delete file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Get storage directories/prefixes (super admin only)
  app.get("/api/admin/storage/directories", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      if (!sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Super admin access required" });
      }

      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(400).json({ error: "Storage not configured" });
      }

      // List top-level directories
      const allKeys = await spacesStorage.listObjects("", 1000);
      const directories = new Set<string>();
      
      allKeys.forEach((key) => {
        const parts = key.split("/");
        if (parts.length > 1) {
          directories.add(parts[0]);
        }
      });

      res.json({
        directories: Array.from(directories).sort(),
        totalFiles: allKeys.length,
      });
    } catch (error) {
      console.error("Failed to list directories:", error);
      res.status(500).json({ error: "Failed to list directories" });
    }
  });

  // ============== TRANSPORTER TRIP POSTING ==============

  // Create a trip with self-assign option
  app.post("/api/transporter/trips", requireAuth, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      
      if (sessionUser.role !== "transporter" && !sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Only transporters can post trips" });
      }
      
      if (!sessionUser.transporterId && !sessionUser.isSuperAdmin) {
        return res.status(400).json({ error: "No transporter associated with this user" });
      }
      
      // Check transporter verification
      const transporter = await storage.getTransporter(sessionUser.transporterId);
      if (transporter && !transporter.isVerified) {
        return res.status(403).json({ error: "Transporter must be verified to post trips" });
      }
      
      const { selfAssign, assignedDriverId, assignedVehicleId, ...rideData } = req.body;
      
      const parseResult = insertRideSchema.safeParse({
        ...rideData,
        createdById: sessionUser.id,
        transporterId: selfAssign ? sessionUser.transporterId : undefined,
        assignedDriverId: selfAssign ? assignedDriverId : undefined,
        assignedVehicleId: selfAssign ? assignedVehicleId : undefined,
        status: selfAssign ? "assigned" : "pending",
        biddingStatus: selfAssign ? "self_assigned" : "open",
        isSelfAssigned: selfAssign || false
      });
      
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid trip data", details: parseResult.error.errors });
      }
      
      const newRide = await storage.createRide(parseResult.data);
      
      res.status(201).json(newRide);
    } catch (error) {
      console.error("Failed to create trip:", error);
      res.status(500).json({ error: "Failed to create trip" });
    }
  });

  return httpServer;
}
