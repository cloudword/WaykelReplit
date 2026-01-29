import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema, insertTransporterSchema, insertVehicleSchema, insertRideSchema, insertBidSchema, insertDocumentSchema,
  insertRoleSchema, insertUserRoleSchema, insertSavedAddressSchema, insertDriverApplicationSchema, PERMISSIONS, VEHICLE_TYPES,
  type Ride
} from "@shared/schema";
import { normalizePhone } from "@shared/utils";
import { z } from "zod";
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
import { createRoleAwareNotification, createSimpleNotification } from "./notifications";
import { assertRideTransition, RideTransitionError, isValidStatus, type RideStatus } from "./rideLifecycle";
import { lockTripFinancialsAtomic, computeTripFinancials, computeTripFinancialsWithSettings, settingsToFeeConfig } from "./tripFinancials";
import { sendTransactionalSms, SmsEvent } from "./sms/smsService";
import crypto from "crypto";

// JWT Configuration
const envJwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
const JWT_SECRET = envJwtSecret || (() => {
  const generated = crypto.randomBytes(64).toString("hex");
  console.warn("[jwt] JWT_SECRET not set. Using a randomly generated secret for this process only.");
  return generated;
})();
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


// Role-based serializer to prevent PII leakage
const serializeRide = (ride: Ride, user?: any) => {
  const base = {
    id: ride.id,
    entityId: (ride as any).entityId,
    customerEntityId: (ride as any).customerEntityId,
    pickupLocation: ride.pickupLocation,
    dropLocation: ride.dropLocation,
    pickupPincode: ride.pickupPincode,
    dropPincode: ride.dropPincode,
    pickupTime: ride.pickupTime,
    dropTime: ride.dropTime,
    date: ride.date,
    status: ride.status,
    price: ride.price,
    distance: ride.distance,
    cargoType: ride.cargoType,
    weight: ride.weight,
    weightKg: ride.weightKg,
    weightTons: ride.weightTons,
    weightUnit: ride.weightUnit,
    requiredVehicleType: ride.requiredVehicleType,
    requiredVehicleCategory: ride.requiredVehicleCategory,
    biddingStatus: ride.biddingStatus,
    bidCount: (ride as any).bidCount,
    createdAt: ride.createdAt,
  };

  // If no user, return minimal public view
  if (!user) return base;

  const isAdmin = user.isSuperAdmin || user.role === "admin";

  // Robust owner check - handle phone normalization to prevent data vanishing after status changes
  const normalizedUserPhone = user.phone ? normalizePhone(user.phone) : null;
  const normalizedRidePhone = ride.customerPhone ? normalizePhone(ride.customerPhone) : null;

  const isOwner =
    ride.createdById === user.id ||
    ride.customerId === user.id ||
    (normalizedUserPhone && normalizedRidePhone && normalizedUserPhone === normalizedRidePhone);

  const isAssignedTransporter = user.transporterId && (ride.transporterId === user.transporterId);
  const isAssignedDriver = ride.assignedDriverId === user.id;

  // Show PII only to Admins, Owners, or Assigned parties
  if (isAdmin || isOwner || isAssignedTransporter || isAssignedDriver) {
    return {
      ...base,
      customerName: ride.customerName,
      customerPhone: ride.customerPhone,
      incentive: ride.incentive,
      transporterId: ride.transporterId,
      assignedDriverId: ride.assignedDriverId,
      assignedVehicleId: ride.assignedVehicleId,
      acceptedBidId: ride.acceptedBidId,
      createdById: ride.createdById,
      customerId: ride.customerId,
      acceptedByUserId: ride.acceptedByUserId,
      acceptedAt: ride.acceptedAt,
      isSelfAssigned: ride.isSelfAssigned,
      pickupCompleted: ride.pickupCompleted,
      pickupCompletedAt: ride.pickupCompletedAt,
      deliveryCompleted: ride.deliveryCompleted,
      deliveryCompletedAt: ride.deliveryCompletedAt,
      finalPrice: ride.finalPrice,
      platformFee: ride.platformFee,
      transporterEarning: ride.transporterEarning,
      platformFeePercent: ride.platformFeePercent,
      paymentStatus: ride.paymentStatus,
    };
  }

  return base;
};

const REQUIRED_TRANSPORTER_DOCS = ["gst_certificate", "business_registration"] as const;

// Check if required documents are present and verified
const checkRequiredDocs = (documents: any[], requiredTypes: readonly string[]) => {
  const missing: string[] = [];
  const pending: string[] = [];
  const verified: string[] = [];

  requiredTypes.forEach(type => {
    const docs = documents.filter(d => d.type === type);
    if (docs.length === 0) {
      missing.push(type);
    } else if (docs.some(d => d.status === "verified")) {
      verified.push(type);
    } else if (docs.some(d => d.status === "pending")) {
      pending.push(type);
    } else {
      missing.push(type); // All rejected
    }
  });

  return { missing, pending, verified, allVerified: missing.length === 0 && pending.length === 0 };
};

// Extend Request type to include tokenUser
declare global {
  namespace Express {
    interface Request {
      tokenUser?: {
        id: string;
        role: string;
        isSuperAdmin?: boolean;
        transporterId?: string | null;
        entityId?: string | null;
        isSelfDriver?: boolean;
        name?: string;
        phone?: string;
      };
    }
  }
}

// Global session interface extension
declare module "express-session" {
  interface SessionData {
    user: {
      id: string;
      role: string;
      isSuperAdmin: boolean;
      isSelfDriver: boolean;
      transporterId?: string | null;
      entityId?: string | null;
      transporterEntityId?: string | null;
      phone?: string;
    };
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
        isSelfDriver?: boolean;
        transporterId?: string;
        phone?: string;
      };
      req.tokenUser = decoded;
    } catch (err) {
      // Token invalid - continue without tokenUser (may still have session)
    }
  }
  next();
};

// Self-Driver Identity Resolution
// Rule: IF user.role === "transporter" AND user.isSelfDriver === true THEN user can act as a driver
interface DriverIdentity {
  isDriver: boolean;
  isSelfDriver: boolean;
  driverId: string | null;
  transporterId: string | null;
  canAccessDriverRoutes: boolean;
  canAccessTransporterRoutes: boolean;
}

const resolveDriverIdentity = (user: {
  id: string;
  role: string;
  isSuperAdmin?: boolean;
  isSelfDriver?: boolean;
  transporterId?: string | null;
}): DriverIdentity => {
  // Admin has full access
  if (user.isSuperAdmin || user.role === "admin") {
    return {
      isDriver: false,
      isSelfDriver: false,
      driverId: null,
      transporterId: null,
      canAccessDriverRoutes: true,
      canAccessTransporterRoutes: true,
    };
  }

  // Regular driver
  if (user.role === "driver") {
    return {
      isDriver: true,
      isSelfDriver: false,
      driverId: user.id,
      transporterId: user.transporterId || null,
      canAccessDriverRoutes: true,
      canAccessTransporterRoutes: false,
    };
  }

  // Transporter who also drives (self-driver)
  if (user.role === "transporter" && user.isSelfDriver === true) {
    return {
      isDriver: true,
      isSelfDriver: true,
      driverId: user.id, // Use transporter's user ID as driver ID for self-driver
      transporterId: user.transporterId || null,
      canAccessDriverRoutes: true,
      canAccessTransporterRoutes: true,
    };
  }

  // Regular transporter (not a self-driver)
  if (user.role === "transporter") {
    return {
      isDriver: false,
      isSelfDriver: false,
      driverId: null,
      transporterId: user.transporterId || null,
      canAccessDriverRoutes: false,
      canAccessTransporterRoutes: true,
    };
  }

  // Customer or other roles
  return {
    isDriver: false,
    isSelfDriver: false,
    driverId: null,
    transporterId: null,
    canAccessDriverRoutes: false,
    canAccessTransporterRoutes: false,
  };
};

// Execution Policy Types
type ExecutionPolicy = "SELF_ONLY" | "ASSIGNED_DRIVER_ONLY" | "ANY_DRIVER";

// Helper to validate driver assignment based on transporter's execution policy
interface ExecutionPolicyCheck {
  allowed: boolean;
  error?: string;
}

const checkExecutionPolicy = async (
  transporter: { id: string; executionPolicy?: ExecutionPolicy | null; isOwnerOperator?: boolean | null; ownerDriverUserId?: string | null },
  driverId: string
): Promise<ExecutionPolicyCheck> => {
  // Get effective policy (default based on isOwnerOperator if not set)
  const effectivePolicy: ExecutionPolicy = transporter.executionPolicy ||
    (transporter.isOwnerOperator ? "SELF_ONLY" : "ASSIGNED_DRIVER_ONLY");

  // Fetch the driver info
  const driver = await storage.getUser(driverId);
  if (!driver) {
    return { allowed: false, error: "Driver not found" };
  }

  switch (effectivePolicy) {
    case "SELF_ONLY":
      // Only the transporter owner (self-driver) can execute
      // Check if driver is the owner-operator of this transporter
      const isOwnerOperator = transporter.ownerDriverUserId === driverId ||
        (driver.isSelfDriver && driver.transporterId === transporter.id);
      if (!isOwnerOperator) {
        return { allowed: false, error: "This transporter only allows self-execution. Owner must be the driver." };
      }
      return { allowed: true };

    case "ASSIGNED_DRIVER_ONLY":
      // The driver must belong to this transporter (or be the owner-operator)
      if (driver.transporterId !== transporter.id && transporter.ownerDriverUserId !== driverId) {
        return { allowed: false, error: "Driver must belong to this transporter" };
      }
      return { allowed: true };

    case "ANY_DRIVER":
      // Any driver under the transporter can execute (or the owner-operator)
      if (driver.transporterId !== transporter.id && transporter.ownerDriverUserId !== driverId) {
        return { allowed: false, error: "Driver must belong to this transporter" };
      }
      return { allowed: true };

    default:
      return { allowed: true };
  }
};

// Helper to get current user from either session or token
const getCurrentUser = (req: Request): any => {
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

// Middleware to verify transporter session consistency
// This provides defense-in-depth against stale session transporterId
// For admins: Bypass (they use query params in handlers, not session transporterId)
// For transporters: Verify session transporterId matches database and auto-fix mismatches
const requireTransporterWithVerification = async (req: Request, res: Response, next: NextFunction) => {
  const sessionUser = getCurrentUser(req);
  if (!sessionUser?.id) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const isAdmin = sessionUser.isSuperAdmin || sessionUser.role === "admin";

  // Admins bypass this middleware - they access transporter data via query params
  // The handlers already have logic to use query params for admins
  if (isAdmin) {
    return next();
  }

  // For non-admins, must be transporter
  if (sessionUser.role !== "transporter") {
    return res.status(403).json({ error: "Transporter access required" });
  }

  if (!sessionUser.transporterId) {
    console.warn(`[SECURITY] Transporter user ${sessionUser.id} has no transporterId in session`);
    return res.status(403).json({ error: "Transporter association required" });
  }

  // CRITICAL SECURITY: Verify the session transporterId matches the database
  // This prevents cross-tenant data leakage from stale sessions
  try {
    const dbUser = await storage.getUser(sessionUser.id);
    if (!dbUser) {
      console.warn(`[SECURITY] Session user ${sessionUser.id} not found in database`);
      req.session.destroy(() => { });
      return res.status(401).json({ error: "Session invalid - please log in again" });
    }

    if (dbUser.transporterId !== sessionUser.transporterId) {
      console.error(`[SECURITY ALERT] Session transporterId mismatch for user ${sessionUser.id}: session=${sessionUser.transporterId}, db=${dbUser.transporterId}`);
      // Fix the session with correct data from database
      req.session.user = {
        ...sessionUser,
        transporterId: dbUser.transporterId ?? undefined
      };
      // The getCurrentUser() call in handlers will now return the corrected value
    }
  } catch (error) {
    console.error("[SECURITY] Failed to verify transporter session:", error);
    // Allow request to proceed with session data in case of DB error
  }

  next();
};

const requireDriverOrTransporter = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in or provide a valid Bearer token." });
  }
  const identity = resolveDriverIdentity(user);
  if (!identity.canAccessDriverRoutes && !identity.canAccessTransporterRoutes) {
    return res.status(403).json({ error: "Driver or transporter access required" });
  }
  next();
};

// Middleware for driver-only routes - allows self-drivers (transporters with isSelfDriver=true)
const requireDriver = (req: Request, res: Response, next: NextFunction) => {
  const user = getCurrentUser(req);
  if (!user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in or provide a valid Bearer token." });
  }
  const identity = resolveDriverIdentity(user);
  if (!identity.canAccessDriverRoutes) {
    return res.status(403).json({ error: "Driver access required. Self-drivers (transporters who drive) are also allowed." });
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
  user: { id: string; role: string; transporterId?: string | null; isSuperAdmin?: boolean },
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

  const parsePagination = (req: Request, options?: { maxLimit?: number }) => {
    const maxLimit = options?.maxLimit ?? 200;
    const limitParam = req.query.limit as string | undefined;
    const offsetParam = req.query.offset as string | undefined;

    const limit = limitParam ? Math.min(parseInt(limitParam, 10), maxLimit) : undefined;
    const offset = offsetParam ? Math.max(parseInt(offsetParam, 10), 0) : undefined;

    return {
      limit: Number.isFinite(limit as number) ? (limit as number) : undefined,
      offset: Number.isFinite(offset as number) ? (offset as number) : undefined,
    };
  };

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
  // IMPORTANT: Must NOT await DB, must NOT return 503, must NOT throw
  // DigitalOcean App Platform uses this to determine if the app is healthy
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "waykel-api",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Separate endpoint for database connectivity check (not used by DigitalOcean)
  app.get("/api/health/db", async (_req, res) => {
    try {
      await storage.getAllRides();
      res.json({ database: "connected", timestamp: new Date().toISOString() });
    } catch {
      res.json({ database: "disconnected", timestamp: new Date().toISOString() });
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
      let transporterEntityId: string | undefined;

      // If registering as transporter, create a transporter record first
      if (data.role === "transporter") {
        // Get transporter type (business or individual) from request
        const transporterType = req.body.transporterType === "business" ? "business" : "individual";

        const transporterData = {
          companyName: req.body.companyName || `${data.name}'s Transport`,
          ownerName: data.name,
          contact: data.phone,
          email: data.email,
          location: req.body.location || req.body.city || "India",
          baseCity: req.body.city || req.body.location || "India",
          fleetSize: req.body.fleetSize || 1,
          status: "pending_verification" as const,
          verificationStatus: 'unverified',
          transporterType, // Set entity type (business/individual)
          onboardingStatus: "incomplete" as const,
        };

        const transporter = await storage.createTransporter(transporterData);
        transporterId = transporter.id;
        transporterEntityId = transporter.entityId || undefined;
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
          isSelfDriver: user.isSelfDriver || false,
          transporterId: user.transporterId || undefined,
          entityId: (user.entityId || transporterEntityId || undefined) as string | undefined,
          transporterEntityId: transporterEntityId || undefined,
          phone: user.phone,
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
        isSelfDriver: user.isSelfDriver || false,
        transporterId: (transporterId || user.transporterId || undefined) as string | undefined,
        entityId: (user.entityId || transporterEntityId || undefined) as string | undefined,
        transporterEntityId: (transporterEntityId || undefined) as string | undefined,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error during registration:", saveErr);
          return res.status(500).json({ error: "Session save failed" });
        }
        res.json({ ...userWithoutPassword, transporterId });
      });
    } catch (error: any) {
      console.error("[auth/register] Registration error:", error);

      // Handle Zod validation errors
      if (error?.name === 'ZodError' || error?.issues) {
        const fieldErrors = error.issues?.map((issue: any) => ({
          field: issue.path?.join('.') || 'unknown',
          message: issue.message
        })) || [];
        return res.status(400).json({
          error: "Validation failed",
          details: fieldErrors.length > 0
            ? fieldErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ')
            : error.message
        });
      }

      // Handle database constraint errors
      if (error?.code === '23505') {
        if (error?.constraint?.includes('email')) {
          return res.status(400).json({ error: "Email already registered" });
        }
        if (error?.constraint?.includes('phone')) {
          return res.status(400).json({ error: "Phone number already registered" });
        }
      }

      res.status(400).json({ error: "Registration failed", details: error?.message || "Invalid data" });
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

      let transporterEntityId: string | undefined;
      if (user.role === "transporter" && user.transporterId) {
        const transporter = await storage.getTransporter(user.transporterId);
        if (transporter) {
          transporterEntityId = transporter.entityId || undefined;
          if (!user.entityId && transporterEntityId) {
            await storage.updateUserEntityId(user.id, transporterEntityId);
            user.entityId = transporterEntityId as any;
          }
          // Only block suspended transporters - pending ones can login but with limited functionality
          if (transporter.status === "suspended") {
            return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
          }
        }
      }

      // Regenerate session to prevent session fixation attacks
      // This creates a new session ID while preserving user data
      const sessionData = {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        isSelfDriver: user.isSelfDriver || false,
        transporterId: user.transporterId || undefined,
        entityId: (user.entityId || transporterEntityId || undefined) as string | undefined,
        transporterEntityId: transporterEntityId || undefined,
      };

      // Regenerate session to prevent session fixation - CRITICAL for security
      req.session.regenerate((regenerateErr) => {
        if (regenerateErr) {
          console.error("[SECURITY] Session regenerate failed, destroying old session:", regenerateErr.message);
          // Destroy old session completely and create fresh
          req.session.destroy((destroyErr) => {
            if (destroyErr) {
              console.error("[SECURITY] Failed to destroy session:", destroyErr.message);
              return res.status(500).json({ error: "Session error - please try again" });
            }
            // Cannot set user on destroyed session - client must retry
            return res.status(503).json({ error: "Session refresh required - please retry login" });
          });
          return;
        }

        req.session.user = sessionData;
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error during login:", saveErr);
            return res.status(500).json({ error: "Session save error: " + (saveErr.message || "Failed to save session") });
          }
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
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
        isSelfDriver: user.isSelfDriver || false,
        transporterId: user.transporterId || undefined,
        phone: user.phone,
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
        isSelfDriver: freshUser.isSelfDriver || false,
        transporterId: freshUser.transporterId || undefined,
        phone: freshUser.phone,
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

  // ============== OTP AUTHENTICATION ==============

  app.post("/api/auth/request-otp", authLimiter, async (req, res) => {
    try {
      const { phone, purpose = "login" } = req.body;

      if (!phone) {
        return res.status(400).json({ error: "Phone number is required" });
      }

      const validPurposes = ["login", "forgot_password", "verify_phone"];
      if (!validPurposes.includes(purpose)) {
        return res.status(400).json({ error: "Invalid OTP purpose" });
      }

      let normalizedPhone: string;
      try {
        normalizedPhone = normalizePhone(phone);
      } catch (e) {
        return res.status(400).json({ error: "Invalid phone number format. Must be 10 digits." });
      }

      const user = await storage.getUserByPhone(normalizedPhone);
      if (!user && purpose !== "verify_phone") {
        return res.status(404).json({ error: "No account found with this phone number" });
      }

      await storage.invalidateOtpCodes(normalizedPhone, purpose);

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpHash = await bcrypt.hash(otp, 10);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.createOtpCode({
        phone: normalizedPhone,
        otpHash,
        purpose,
        expiresAt,
        attempts: 0,
        verified: false
      });

      const { sendOtpSms } = await import("./sms/smsService");
      await sendOtpSms(normalizedPhone, otp);


      res.json({
        success: true,
        message: "OTP sent successfully",
        expiresIn: 600
      });
    } catch (error) {
      console.error("OTP request error:", error);
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-otp", authLimiter, async (req, res) => {
    try {
      const { phone, otp, purpose = "login" } = req.body;

      if (!phone || !otp) {
        return res.status(400).json({ error: "Phone and OTP are required" });
      }

      let normalizedPhone: string;
      try {
        normalizedPhone = normalizePhone(phone);
      } catch (e) {
        return res.status(400).json({ error: "Invalid phone number format. Must be 10 digits." });
      }

      const otpRecord = await storage.getActiveOtpCode(normalizedPhone, purpose);

      if (!otpRecord) {
        return res.status(400).json({ error: "OTP expired or not found. Please request a new one." });
      }

      if ((otpRecord.attempts || 0) >= 3) {
        return res.status(400).json({ error: "Too many attempts. Please request a new OTP." });
      }

      await storage.incrementOtpAttempts(otpRecord.id);

      const isValid = await bcrypt.compare(otp, otpRecord.otpHash);

      if (!isValid) {
        const remainingAttempts = 2 - (otpRecord.attempts || 0);
        return res.status(400).json({
          error: "Invalid OTP",
          remainingAttempts: Math.max(0, remainingAttempts)
        });
      }

      await storage.markOtpVerified(otpRecord.id);

      const user = await storage.getUserByPhone(normalizedPhone);

      if (!user) {
        return res.json({
          success: true,
          verified: true,
          message: "Phone verified successfully"
        });
      }

      if (purpose === "forgot_password") {
        const resetToken = jwt.sign(
          { userId: user.id, purpose: "password_reset" },
          JWT_SECRET,
          { expiresIn: "15m" }
        );
        return res.json({
          success: true,
          verified: true,
          resetToken,
          message: "OTP verified. Use the reset token to set a new password."
        });
      }

      req.session.user = {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        isSelfDriver: user.isSelfDriver || false,
        transporterId: user.transporterId || undefined,
        phone: user.phone,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error during OTP login:", saveErr);
          return res.status(500).json({ error: "Session save failed" });
        }
        const { password: _, ...userWithoutPassword } = user;
        res.json({
          success: true,
          verified: true,
          user: userWithoutPassword,
          message: "Logged in successfully"
        });
      });
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json({ error: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/reset-password-with-token", sensitiveAuthLimiter, async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: "Reset token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      let decoded: { userId: string; purpose: string };
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET) as { userId: string; purpose: string };
      } catch (err) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      if (decoded.purpose !== "password_reset") {
        return res.status(400).json({ error: "Invalid reset token" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(decoded.userId, hashedPassword);

      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
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

  // Profile update endpoint - allows users to update their profile settings
  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const currentUser = getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const { isSelfDriver, name, email } = req.body;
      const updates: { name?: string; email?: string; isSelfDriver?: boolean } = {};

      // Only transporters can set isSelfDriver
      if (isSelfDriver !== undefined) {
        if (currentUser.role !== "transporter") {
          return res.status(403).json({ error: "Only transporters can set self-driver status" });
        }
        updates.isSelfDriver = Boolean(isSelfDriver);
      }

      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No valid fields to update" });
      }

      const updatedUser = await storage.updateUser(currentUser.id, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log(`[Self-Driver] User ${currentUser.id} updated isSelfDriver to ${updates.isSelfDriver}`);

      // Update session with new isSelfDriver value if changed
      if (req.session?.user) {
        req.session.user = {
          id: updatedUser.id,
          role: updatedUser.role,
          isSuperAdmin: updatedUser.isSuperAdmin || false,
          isSelfDriver: updatedUser.isSelfDriver || false,
          transporterId: updatedUser.transporterId || undefined,
          phone: updatedUser.phone,
        };
      }

      const { password: _, ...userWithoutPassword } = updatedUser;

      // Generate fresh JWT token with updated isSelfDriver
      const tokenPayload = {
        id: updatedUser.id,
        role: updatedUser.role,
        isSuperAdmin: updatedUser.isSuperAdmin || false,
        isSelfDriver: updatedUser.isSelfDriver || false,
        transporterId: updatedUser.transporterId || undefined,
        phone: updatedUser.phone,
      };
      const expiresIn = (updatedUser.role === "admin" || updatedUser.role === "transporter")
        ? JWT_ADMIN_EXPIRES_IN
        : JWT_CUSTOMER_EXPIRES_IN;
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn });

      // Save session and respond
      req.session.save((err) => {
        if (err) console.error("Session save error:", err);
        res.json({
          success: true,
          user: userWithoutPassword,
          token,
          tokenType: "Bearer",
          expiresIn
        });
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(400).json({ error: "Failed to update profile" });
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
          isSelfDriver: user.isSelfDriver || false,
          phone: user.phone,
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
        isSelfDriver: user.isSelfDriver || false,
        phone: user.phone,
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
    const sessionUser = getCurrentUser(req);
    if (!sessionUser?.id) {
      console.warn("[Customer PORTAL] Unauthorized access attempt to /rides");
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      console.log(`[Customer PORTAL] Fetching rides for user ID: ${sessionUser.id}, phone: ${sessionUser.phone}`);
      const rides = await storage.getCustomerRides(sessionUser.id);
      console.log(`[Customer PORTAL] Found ${rides.length} rides for user ${sessionUser.id}`);
      res.json(rides.map(r => serializeRide(r as any, sessionUser)));
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
      const {
        pickupLocation, dropLocation, pickupTime, date, price, distance, cargoType, weight,
        weightKg, weightTons, weightUnit, requiredVehicleType, requiredVehicleCategory
      } = req.body;

      // Validate required fields
      if (!pickupLocation || !dropLocation) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "pickupLocation and dropLocation are required"
        });
      }
      if (!pickupTime || !date) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "pickupTime and date are required"
        });
      }
      if (!price) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "price is required"
        });
      }

      // Handle weight conversion - accept weightKg/weightTons or legacy weight field
      let finalWeightKg = weightKg;
      let finalWeightTons = weightTons;
      let finalWeight = weight;

      if (weightKg || weightTons) {
        // New format: dual weight fields
        finalWeightKg = weightKg ? parseFloat(weightKg) : null;
        finalWeightTons = weightTons ? parseFloat(weightTons) : null;

        // Auto-convert if only one is provided
        if (finalWeightKg && !finalWeightTons) {
          finalWeightTons = Math.round(finalWeightKg / 1000 * 100) / 100;
        } else if (finalWeightTons && !finalWeightKg) {
          finalWeightKg = Math.round(finalWeightTons * 1000);
        }

        // Generate display weight from unit preference
        if (weightUnit === "tons" && finalWeightTons) {
          finalWeight = `${finalWeightTons} Tons`;
        } else if (finalWeightKg) {
          finalWeight = `${finalWeightKg} Kg`;
        }
      }

      const rideData = {
        ...req.body,
        createdById: user.id,
        customerId: user.id,
        customerName: user.name,
        customerPhone: user.phone ? normalizePhone(user.phone) : null,
        customerEntityId: user.entityId,
        status: "pending",
        // Provide defaults for fields that may not be sent by customer portal
        distance: distance || "TBD",
        cargoType: cargoType || "General",
        weight: finalWeight || "N/A",
        weightKg: finalWeightKg || null,
        weightTons: finalWeightTons || null,
        requiredVehicleType: requiredVehicleType || null,
        requiredVehicleCategory: requiredVehicleCategory || null,
      };

      const ride = await storage.createRide(rideData);
      const sessionUser = getCurrentUser(req);
      res.status(201).json(serializeRide(ride as any, sessionUser));
    } catch (error: any) {
      console.error("[customer/rides] Failed to create ride:", error);
      res.status(500).json({
        error: "Failed to create ride",
        details: error?.message || "Unknown error"
      });
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
      if (ride.customerId !== user.id && ride.createdById !== user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const bids = await storage.getRideBids(rideId);
      // Mask transporter info if this is the customer viewing their own bids before acceptance
      const maskedBids = bids.map(bid => ({
        id: bid.id,
        entityId: (bid as any).entityId,
        amount: bid.amount,
        status: bid.status,
        createdAt: bid.createdAt,
        // Mask specific details if not accepted
        transporterId: bid.status === "accepted" ? bid.transporterId : null,
        userId: bid.status === "accepted" ? bid.userId : null,
        vehicleId: bid.status === "accepted" ? bid.vehicleId : null,
      }));
      res.json(maskedBids);
    } catch (error) {
      console.error("Failed to get ride bids:", error);
      res.status(500).json({ error: "Failed to get bids" });
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
  // POLLING-SAFE: Idempotent, no side effects, safe for 30s refresh
  // Covers: customer/trips (customer role), transporter/rides (transporter role), and driver/assigned-rides
  app.get("/api/rides", async (req, res) => {
    const { status, driverId, transporterId, createdById } = req.query;
    const { limit, offset } = parsePagination(req, { maxLimit: 200 });
    const sessionUser = getCurrentUser(req);

    try {
      let result: any[] = [];

      // Handle unauthenticated marketplace view (pending rides only)
      if (!sessionUser) {
        if (status === "pending") {
          const pending = await storage.getPendingRides();
          const sessionUser = getCurrentUser(req);
          result = pending.map(r => serializeRide(r as any, sessionUser));
        } else {
          result = [];
        }
      }
      // Handle authenticated access
      else {
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
            result = await storage.getAllRides(limit, offset);
          }
        }
        // Logic for Transporters and Drivers
        else if (userRole === "transporter" || userRole === "driver") {
          // If explicitly asking for pending rides, show marketplace (even for logged in users)
          if (status === "pending") {
            result = await storage.getPendingRides();
          }
          // Otherwise show their own rides
          else if (userRole === "transporter" && sessionUser.transporterId) {
            const rides = await storage.getTransporterRides(sessionUser.transporterId);
            result = rides.map(r => serializeRide(r as any, sessionUser));
          } else if (userRole === "driver") {
            const rides = await storage.getDriverRides(sessionUser.id);
            result = rides.map(r => serializeRide(r as any, sessionUser));
          }
        }
        // Customers can only see their own created rides
        else if (userRole === "customer") {
          const rides = await storage.getCustomerRides(sessionUser.id);
          result = rides.map(r => serializeRide(r as any, sessionUser));
        }
      }

      // Cache for 10s to reduce DB load during polling
      res.set('Cache-Control', 'private, max-age=10');
      res.json(result || []);
    } catch (error) {
      console.error("[GET /api/rides] Error:", error);
      res.json([]);
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
          if (ride.customerId === sessionUser.id || ride.createdById === sessionUser.id) {
            return res.json(ride);
          }
          return res.status(403).json({ error: "Access denied" });
        }

        // For other roles (e.g. transporters), if trip is open, show redacted view
        if (ride.status === "pending") {
          return res.json(serializeRide(ride as any, sessionUser));
        }

        return res.status(403).json({ error: "Access denied" });
      }

      // Unauthenticated - only allow viewing marketplace rides with redaction
      if (ride.status === "pending") {
        return res.json(serializeRide(ride as any, undefined));
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
      if (user?.id) {
        data.createdById ??= user.id;
        data.customerId ??= user.id;
        if (user.entityId) {
          data.customerEntityId ??= user.entityId;
        }
      }

      // Ensure customerPhone is normalized and link user by phone if ID is missing
      if (data.customerPhone) {
        try {
          data.customerPhone = normalizePhone(data.customerPhone);
          if (!data.createdById || !data.customerId) {
            const userByPhone = await storage.getUserByPhone(data.customerPhone);
            if (userByPhone) {
              data.createdById ??= userByPhone.id;
              data.customerId ??= userByPhone.id;
              if (userByPhone.entityId) {
                data.customerEntityId ??= userByPhone.entityId;
              }
            }
          }
        } catch (e) {
          // Keep original phone if normalization fails, but it usually shouldn't
        }
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

      // Notify super admins about new trip
      try {
        const superAdmins = await storage.getSuperAdmins();
        for (const admin of superAdmins) {
          await storage.createNotification({
            recipientId: admin.id,
            type: "new_booking",
            title: "New Trip Created",
            message: `New trip from ${ride.pickupLocation} to ${ride.dropLocation} - ₹${ride.price}`,
            rideId: ride.id,
          });
        }
      } catch (adminNotifyError) {
        console.error("Failed to notify admins:", adminNotifyError);
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

    if (!sessionUser || !sessionUser.isSuperAdmin) {
      return res.status(403).json({ error: "Only administrators can update ride status" });
    }

    try {
      const { status } = req.body;
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      try {
        assertRideTransition(ride.status, status, ride.id);
      } catch (e) {
        if (e instanceof RideTransitionError) {
          return res.status(400).json({
            error: "Invalid status transition",
            from: ride.status,
            to: status
          });
        }
        throw e;
      }

      await storage.updateRideStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update status" });
    }
  });

  app.patch("/api/rides/:id/assign", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    // Only super admin or transporter can assign drivers
    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isSuperAdmin = sessionUser.isSuperAdmin;
    const isTransporter = sessionUser.role === "transporter";

    if (!isSuperAdmin && !isTransporter) {
      return res.status(403).json({ error: "Only administrators or transporters can assign drivers" });
    }

    try {
      const { driverId, vehicleId } = req.body;

      if (!driverId || !vehicleId) {
        return res.status(400).json({ error: "driverId and vehicleId are required" });
      }

      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      try {
        assertRideTransition(ride.status, "assigned", ride.id);
      } catch (e) {
        if (e instanceof RideTransitionError) {
          return res.status(400).json({
            error: "Cannot assign driver from current status",
            from: ride.status,
            to: "assigned"
          });
        }
        throw e;
      }

      if (isTransporter && !isSuperAdmin) {
        if (ride.transporterId !== sessionUser.transporterId) {
          return res.status(403).json({ error: "You can only assign drivers to your own trips" });
        }

        const transporter = await storage.getTransporter(sessionUser.transporterId!);
        if (transporter) {
          const policyCheck = await checkExecutionPolicy(transporter, driverId);
          if (!policyCheck.allowed) {
            return res.status(403).json({ error: policyCheck.error || "Driver assignment not allowed by transporter policy" });
          }
        }

        // Validate vehicle belongs to transporter and is active
        const vehicle = await storage.getVehicle(vehicleId);
        if (!vehicle) {
          return res.status(404).json({ error: "Vehicle not found" });
        }
        if (vehicle.status !== "active") {
          return res.status(400).json({ error: "Selected vehicle is not active/verified" });
        }
        if (vehicle.transporterId !== sessionUser.transporterId) {
          return res.status(403).json({ error: "This vehicle does not belong to your transporter account" });
        }
      }

      const effectiveTransporterId = isSuperAdmin
        ? (req.body.transporterId || ride.transporterId)
        : sessionUser.transporterId;

      await storage.assignRideToDriver(req.params.id, driverId, vehicleId, effectiveTransporterId);

      // Send SMS to assigned driver
      const driver = await storage.getUser(driverId);
      if (driver?.phone) {
        sendTransactionalSms(driver.phone, SmsEvent.TRIP_ASSIGNED, {
          pickup: ride.pickupLocation,
          drop: ride.dropLocation,
          date: ride.date
        }).catch(err => console.error("[SMS:ERROR] Failed to send TRIP_ASSIGNED SMS:", err));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to assign driver:", error);
      res.status(400).json({ error: "Failed to assign driver" });
    }
  });

  // Driver: Mark pickup complete
  app.patch("/api/rides/:id/pickup-complete", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      const identity = resolveDriverIdentity(sessionUser);
      if (ride.assignedDriverId !== identity.driverId) {
        return res.status(403).json({ error: "Not authorized for this ride" });
      }

      try {
        assertRideTransition(ride.status, "pickup_done", ride.id);
      } catch (e) {
        if (e instanceof RideTransitionError) {
          return res.status(400).json({
            error: "Cannot mark pickup complete from current status",
            from: ride.status,
            to: "pickup_done"
          });
        }
        throw e;
      }

      await storage.markRidePickupComplete(req.params.id);
      res.json({ success: true, message: "Pickup marked as complete" });
    } catch (error) {
      console.error("Mark pickup complete error:", error);
      res.status(400).json({ error: "Failed to update pickup status" });
    }
  });

  // Driver: Mark delivery complete
  app.patch("/api/rides/:id/delivery-complete", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      const identity = resolveDriverIdentity(sessionUser);
      if (ride.assignedDriverId !== identity.driverId) {
        return res.status(403).json({ error: "Not authorized for this ride" });
      }

      try {
        assertRideTransition(ride.status, "delivery_done", ride.id);
      } catch (e) {
        if (e instanceof RideTransitionError) {
          return res.status(400).json({
            error: "Cannot mark delivery complete from current status",
            from: ride.status,
            to: "delivery_done"
          });
        }
        throw e;
      }

      await storage.markRideDeliveryComplete(req.params.id);

      // Send SMS for delivery completion
      if (ride.customerPhone) {
        sendTransactionalSms(ride.customerPhone, SmsEvent.DELIVERY_COMPLETED, {
          pickup: ride.pickupLocation,
          drop: ride.dropLocation
        }).catch(err => console.error("[SMS:ERROR] Failed to send DELIVERY_COMPLETED SMS:", err));
      }

      res.json({ success: true, message: "Delivery marked as complete" });
    } catch (error) {
      console.error("Mark delivery complete error:", error);
      res.status(400).json({ error: "Failed to update delivery status" });
    }
  });

  // Driver: Start trip (change status from assigned to active)
  app.patch("/api/rides/:id/start", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      const identity = resolveDriverIdentity(sessionUser);
      if (ride.assignedDriverId !== identity.driverId) {
        return res.status(403).json({ error: "Not authorized for this ride" });
      }

      try {
        assertRideTransition(ride.status, "active", ride.id);
      } catch (e) {
        if (e instanceof RideTransitionError) {
          return res.status(400).json({
            error: "Trip cannot be started from current status",
            from: ride.status,
            to: "active"
          });
        }
        throw e;
      }

      if (ride.transporterId && identity.driverId) {
        const transporter = await storage.getTransporter(ride.transporterId);
        if (transporter) {
          const policyCheck = await checkExecutionPolicy(transporter, identity.driverId);
          if (!policyCheck.allowed) {
            return res.status(403).json({ error: policyCheck.error || "Trip start not allowed by transporter policy" });
          }
        }
      }

      await storage.updateRideStatus(req.params.id, "active");
      res.json({ success: true, message: "Trip started" });
    } catch (error) {
      console.error("Start trip error:", error);
      res.status(400).json({ error: "Failed to start trip" });
    }
  });

  // Driver: Accept trip (confirms driver will execute the assigned trip)
  app.post("/api/rides/:id/accept", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Trip not found" });
      }

      // Check if driver is assigned to this ride
      const identity = resolveDriverIdentity(sessionUser);
      if (!identity.canAccessDriverRoutes) {
        return res.status(403).json({ error: "Driver access required" });
      }
      if (ride.assignedDriverId !== identity.driverId) {
        return res.status(403).json({ error: "You are not assigned to this trip" });
      }

      if (ride.status !== "assigned") {
        return res.status(400).json({ error: "Trip cannot be accepted from current status" });
      }

      // Check if already accepted
      if (ride.acceptedAt) {
        return res.status(400).json({ error: "Trip has already been accepted" });
      }

      // Enforce execution policy before accepting trip
      if (ride.transporterId && identity.driverId) {
        const transporter = await storage.getTransporter(ride.transporterId);
        if (transporter) {
          const policyCheck = await checkExecutionPolicy(transporter, identity.driverId);
          if (!policyCheck.allowed) {
            return res.status(403).json({ error: policyCheck.error || "Trip acceptance not allowed by transporter policy" });
          }
        }
      }

      await storage.driverAcceptTrip(req.params.id, identity.driverId!);
      res.json({ success: true, message: "Trip accepted successfully" });
    } catch (error) {
      console.error("Accept trip error:", error);
      res.status(400).json({ error: "Failed to accept trip" });
    }
  });

  // Driver: Complete trip
  app.patch("/api/rides/:id/complete", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }

      const identity = resolveDriverIdentity(sessionUser);
      if (ride.assignedDriverId !== identity.driverId) {
        return res.status(403).json({ error: "Not authorized for this ride" });
      }

      try {
        assertRideTransition(ride.status, "completed", ride.id);
      } catch (e) {
        if (e instanceof RideTransitionError) {
          return res.status(400).json({
            error: "Trip cannot be completed from current status",
            from: ride.status,
            to: "completed"
          });
        }
        throw e;
      }

      await storage.updateRideStatus(req.params.id, "completed");
      res.json({ success: true, message: "Trip completed" });
    } catch (error) {
      console.error("Complete trip error:", error);
      res.status(400).json({ error: "Failed to complete trip" });
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
        if (transporter.servicePincodes && Array.isArray(transporter.servicePincodes) && ride.pickupPincode) {
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
        if (transporter.preferredRoutes && Array.isArray(transporter.preferredRoutes) && ride.pickupLocation && ride.dropLocation) {
          const routes = transporter.preferredRoutes as string[];
          const routeKey = `${ride.pickupLocation}-${ride.dropLocation}`.toLowerCase();
          if (routes.some(r => r && typeof r === 'string' && routeKey.includes(r.toLowerCase()))) {
            score += 20;
            reasons.push(`On preferred route`);
          }
        }

        const serializedRide = serializeRide(ride as any, sessionUser);
        return {
          ...serializedRide,
          matchScore: Math.min(score, 100),
          matchReason: reasons.length > 0 ? reasons.join(", ") : "General match",
          isMatched: score > 0
        };
      });

      // Sort by match score (highest first), then by date
      ridesWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

      res.json(ridesWithScores);
    } catch (error) {
      console.error("Failed to fetch marketplace rides:", error);
      res.status(500).json({ error: "Failed to fetch marketplace rides", details: error instanceof Error ? error.message : "Unknown error" });
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

  // PHASE F: Transporter drivers management
  // GET /api/transporter/drivers - Get all drivers for current transporter
  app.get("/api/transporter/drivers", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isAdmin = user.isSuperAdmin || user.role === "admin";

    try {
      if (isAdmin) {
        // Admin can optionally filter by transporterId
        const { transporterId } = req.query;
        if (transporterId) {
          const drivers = await storage.getUsersByTransporterAndRole(transporterId as string, "driver");
          const driversWithoutPasswords = drivers.map(({ password, ...d }) => d);
          return res.json(driversWithoutPasswords);
        }
        // Admin without filter - return empty (use /api/drivers for all)
        return res.json([]);
      }

      // Non-admin: must have transporterId
      if (!user.transporterId) {
        return res.status(403).json({ error: "You must be associated with a transporter" });
      }

      const drivers = await storage.getUsersByTransporterAndRole(user.transporterId, "driver");
      const driversWithoutPasswords = drivers.map(({ password, ...d }) => d);
      res.json(driversWithoutPasswords);
    } catch (error) {
      console.error("[GET /api/transporter/drivers] Error:", error);
      // PHASE G/H: Return empty array, never throw on empty
      res.json([]);
    }
  });

  // POST /api/transporter/drivers - Create a new driver for current transporter
  // PHASE F: Driver creation with auto-attached transporterId
  app.post("/api/transporter/drivers", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const isAdmin = user.isSuperAdmin || user.role === "admin";

    try {
      // Get transporterId from session (not from payload for non-admins)
      const transporterId = isAdmin
        ? (req.body.transporterId || user.transporterId)
        : user.transporterId;

      if (!transporterId) {
        return res.status(403).json({
          error: "You must be associated with a transporter to add drivers"
        });
      }

      const { name, phone, password, email } = req.body;

      // Validate required fields
      if (!name || !phone || !password) {
        return res.status(400).json({
          error: "Missing required fields",
          details: "name, phone, and password are required"
        });
      }

      // Normalize phone number
      let normalizedPhone: string;
      try {
        normalizedPhone = normalizePhone(phone);
      } catch (e: any) {
        return res.status(400).json({ error: e.message });
      }

      // Check if phone already exists
      const existingUser = await storage.getUserByPhone(normalizedPhone);
      if (existingUser) {
        return res.status(400).json({ error: "A user with this phone number already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create driver user with auto-attached transporterId
      const driver = await storage.createUser({
        name,
        phone: normalizedPhone,
        password: hashedPassword,
        email: email || null,
        role: "driver",
        transporterId,
        documentsComplete: false,
        profileComplete: false,
      });

      // Return driver without password
      const { password: _, ...driverWithoutPassword } = driver;
      res.status(201).json(driverWithoutPassword);
    } catch (error: any) {
      console.error("[POST /api/transporter/drivers] Error:", error);
      res.status(400).json({ error: error?.message || "Failed to create driver" });
    }
  });

  // PHASE E: Get transporter's active vehicles for bidding
  // GET /api/transporter/vehicles/active - Returns only active vehicles for bid selection
  app.get("/api/transporter/vehicles/active", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      if (!user.transporterId) {
        return res.status(403).json({ error: "You must be associated with a transporter" });
      }

      const vehicles = await storage.getTransporterVehicles(user.transporterId);
      // PHASE E: Only return active vehicles for bidding
      const activeVehicles = vehicles.filter(v => v.status === "active");
      res.json(activeVehicles);
    } catch (error) {
      console.error("[GET /api/transporter/vehicles/active] Error:", error);
      res.json([]);
    }
  });

  // GET /api/transporter/vehicles - Get all vehicles for current transporter (including pending)
  // PHASE D: Show ALL vehicles including pending ones
  // POLLING-SAFE: Idempotent, no side effects, safe for 30s refresh
  app.get("/api/transporter/vehicles", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      if (!user.transporterId) {
        return res.status(403).json({ error: "You must be associated with a transporter" });
      }

      // Return ALL vehicles - pending, active, inactive
      const vehicles = await storage.getTransporterVehicles(user.transporterId);
      // Cache for 10s to reduce DB load during polling
      res.set('Cache-Control', 'private, max-age=10');
      res.json(vehicles);
    } catch (error) {
      console.error("[GET /api/transporter/vehicles] Error:", error);
      res.json([]);
    }
  });

  // GET /api/transporter/permissions - Marketplace + bidding feature flags for logged-in transporters
  app.get("/api/transporter/permissions", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user.transporterId) {
      return res.status(403).json({ error: "Transporter access required" });
    }

    try {
      const eligibility = await computeTransporterEligibility(user.transporterId);

      res.json({
        canBid: eligibility.canBid,
        blockingReason: eligibility.reason,
        canViewMarketplace: true,
        onboardingStatus: eligibility.status.toLowerCase(),
        overallStatus: eligibility.status,
        verificationStatus: eligibility.verificationStatus ?? "unknown",
        transporterStatus: eligibility.transporterStatus ?? "unknown",
        requireBusinessDocs: eligibility.transporterType === "business" && !eligibility.hasBusinessDocs,
      });
    } catch (error) {
      console.error("[GET /api/transporter/permissions] Error:", error);
      res.status(200).json({
        canBid: false,
        blockingReason: "Bidding eligibility could not be verified.",
        canViewMarketplace: true,
        onboardingStatus: "unknown"
      });
    }
  });

  // ===== TRANSPORTER ONBOARDING API =====
  const deriveOverallStatus = (flags: {
    transporterStatus?: string;
    verificationStatus?: string;
    businessOk: boolean;
    vehiclesOk: boolean;
    driversOk: boolean;
  }): "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED" => {
    const { transporterStatus, verificationStatus, businessOk, vehiclesOk, driversOk } = flags;

    if (transporterStatus && transporterStatus !== "active") return "BLOCKED";
    if (verificationStatus && verificationStatus !== "approved") return "BLOCKED";
    if (businessOk && vehiclesOk && driversOk) return "COMPLETED";
    if (businessOk || vehiclesOk || driversOk) return "IN_PROGRESS";
    return "NOT_STARTED";
  };

  // GET /api/transporter/onboarding-status - Get current onboarding status
  app.get("/api/transporter/onboarding-status", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user.transporterId) {
      console.warn(`[GET /api/transporter/onboarding-status] User ${user?.id} has no transporterId in session`);
      return res.status(403).json({ error: "Transporter access required" });
    }

    try {
      // STRICT ISOLATION: Always use session transporterId
      console.log(`[GET /api/transporter/onboarding-status] Fetching status for transporter ${user.transporterId} (user: ${user.id})`);

      const [status, transporter] = await Promise.all([
        storage.getTransporterOnboardingStatus(user.transporterId),
        storage.getTransporter(user.transporterId)
      ]);

      if (!status || !transporter) {
        console.warn(`[GET /api/transporter/onboarding-status] Transporter ${user.transporterId} not found in database`);
        return res.status(404).json({ error: "Transporter not found" });
      }

      // Calculate onboarding steps completion
      const isBusiness = status.transporterType === "business";
      const steps = {
        businessVerification: {
          required: isBusiness,
          completed: isBusiness ? status.hasBusinessDocs : true,
          label: "Business Verification",
          description: isBusiness ? "Upload GST Certificate or MSME Certificate" : "Not required for individual transporters"
        },
        addVehicle: {
          required: true,
          completed: status.hasApprovedVehicle,
          label: "Add Vehicle",
          description: status.vehicleCount === 0
            ? "Add at least one vehicle with RC document"
            : status.hasApprovedVehicle
              ? `${status.approvedVehicleCount} vehicle(s) verified`
              : `${status.pendingVehicleDocCount} document(s) pending verification`
        },
        addDriver: {
          required: true,
          completed: status.hasApprovedDriver,
          label: "Add Driver",
          description: status.driverCount === 0
            ? "Add at least one driver with Driving License"
            : status.hasApprovedDriver
              ? `${status.approvedDriverCount} driver(s) verified`
              : `${status.pendingDriverDocCount} document(s) pending verification`
        }
      };

      // Calculate overall completion (derived, not relying on stored onboardingStatus)
      const requiredSteps = Object.values(steps).filter(s => s.required);
      const completedSteps = requiredSteps.filter(s => s.completed);
      const overallStatusCode = deriveOverallStatus({
        transporterStatus: transporter.status,
        verificationStatus: transporter.verificationStatus || "unverified",
        businessOk: steps.businessVerification.completed,
        vehiclesOk: steps.addVehicle.completed,
        driversOk: steps.addDriver.completed,
      });

      const allComplete = overallStatusCode === "COMPLETED";
      const overallStatus = overallStatusCode.toLowerCase();

      res.json({
        transporterType: status.transporterType,
        onboardingStatus: overallStatus,
        overallStatus: overallStatusCode,
        transporterStatus: transporter.status,
        verificationStatus: (transporter.verificationStatus || "unverified") as string,
        steps,
        completedCount: completedSteps.length,
        totalCount: requiredSteps.length,
        isComplete: allComplete,
        canBid: allComplete,
      });
    } catch (error) {
      console.error("[GET /api/transporter/onboarding-status] Error:", error);
      res.status(500).json({ error: "Failed to fetch onboarding status" });
    }
  });

  // PUT /api/transporter/transporter-type - Set transporter type (business/individual)
  app.put("/api/transporter/transporter-type", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user.transporterId) {
      return res.status(403).json({ error: "Transporter access required" });
    }

    try {
      const { transporterType } = req.body;
      if (!["business", "individual"].includes(transporterType)) {
        return res.status(400).json({ error: "Invalid transporter type. Must be 'business' or 'individual'" });
      }

      await storage.updateTransporterType(user.transporterId, transporterType);
      res.json({ success: true, transporterType });
    } catch (error) {
      console.error("[PUT /api/transporter/transporter-type] Error:", error);
      res.status(500).json({ error: "Failed to update transporter type" });
    }
  });

  // POST /api/transporter/complete-onboarding - Mark onboarding as complete (after all steps done)
  app.post("/api/transporter/complete-onboarding", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user.transporterId) {
      return res.status(403).json({ error: "Transporter access required" });
    }

    try {
      const status = await storage.getTransporterOnboardingStatus(user.transporterId);
      if (!status) {
        return res.status(404).json({ error: "Transporter not found" });
      }

      const isBusiness = status.transporterType === "business";
      const businessDocOk = isBusiness ? status.hasBusinessDocs : true;

      if (!businessDocOk) {
        return res.status(400).json({ error: "Business documents not verified yet" });
      }
      if (!status.hasApprovedVehicle) {
        return res.status(400).json({ error: "No verified vehicle found. Please add a vehicle and wait for document verification." });
      }
      if (!status.hasApprovedDriver) {
        return res.status(400).json({ error: "No verified driver found. Please add a driver and wait for document verification." });
      }

      await storage.updateTransporterOnboardingStatus(user.transporterId, "completed");
      res.json({ success: true, onboardingStatus: "completed" });
    } catch (error) {
      console.error("[POST /api/transporter/complete-onboarding] Error:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  const normalizeTransporterType = (raw?: string | null): "business" | "individual" => raw === "business" ? "business" : "individual";

  type EligibilityReason =
    | "not_verified"
    | "missing_vehicle"
    | "missing_driver"
    | "business_docs_required"
    | "suspended";

  interface TransporterEligibility {
    canBid: boolean;
    status: "eligible" | "blocked";
    reason?: EligibilityReason;
    transporterStatus: string;
    verificationStatus: string;
    transporterType: "business" | "individual";
    hasBusinessDocs: boolean;
    hasApprovedVehicle: boolean;
    hasApprovedDriver: boolean;
    vehicleCount: number;
    driverCount: number;
    approvedVehicleCount: number;
    approvedDriverCount: number;
  }

  const computeTransporterEligibility = async (transporterId: string): Promise<TransporterEligibility> => {
    const [transporter, onboarding] = await Promise.all([
      storage.getTransporter(transporterId),
      storage.getTransporterOnboardingStatus(transporterId),
    ]);

    const transporterType = normalizeTransporterType(onboarding?.transporterType || transporter?.transporterType);
    const hasBusinessDocs = onboarding?.hasBusinessDocs === true;
    const hasApprovedVehicle = onboarding?.hasApprovedVehicle === true;
    const hasApprovedDriver = onboarding?.hasApprovedDriver === true;

    const transporterStatus = transporter?.status || "not_found";
    const verificationStatus = transporter?.verificationStatus || "unverified";

    let status: "eligible" | "blocked" = "blocked";
    let reason: EligibilityReason | undefined = "not_verified";

    if (!transporter) {
      reason = "not_verified";
    } else if (transporterStatus === "suspended" || transporterStatus === "rejected") {
      reason = "suspended";
    } else if (transporterStatus !== "active") {
      reason = "not_verified";
    } else if (verificationStatus !== "approved") {
      reason = "not_verified";
    } else if (transporterType === "business" && !hasBusinessDocs) {
      reason = "business_docs_required";
    } else if (!hasApprovedVehicle) {
      reason = "missing_vehicle";
    } else if (!hasApprovedDriver) {
      reason = "missing_driver";
    } else {
      status = "eligible";
      reason = undefined;
    }

    return {
      canBid: status === "eligible",
      status,
      reason,
      transporterStatus,
      verificationStatus,
      transporterType,
      hasBusinessDocs,
      hasApprovedVehicle,
      hasApprovedDriver,
      vehicleCount: onboarding?.vehicleCount ?? 0,
      driverCount: onboarding?.driverCount ?? 0,
      approvedVehicleCount: onboarding?.approvedVehicleCount ?? 0,
      approvedDriverCount: onboarding?.approvedDriverCount ?? 0,
    };
  };

  // GET /api/transporter/bidding-eligibility - Check if transporter can bid
  app.get("/api/transporter/bidding-eligibility", requireAuth, requireTransporterWithVerification, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user || !user.transporterId) {
      return res.status(403).json({ error: "Transporter access required" });
    }

    try {
      const eligibility = await computeTransporterEligibility(user.transporterId);
      res.json({
        ...eligibility,
        eligible: eligibility.canBid,
        reason: eligibility.reason,
      });
    } catch (error) {
      console.error("[GET /api/transporter/bidding-eligibility] Error:", error);
      res.status(500).json({ error: "Failed to check bidding eligibility" });
    }
  });

  // GET /api/transporters/:id/bid-eligibility - Admins or the transporter themselves
  app.get("/api/transporters/:id/bid-eligibility", requireAuth, async (req, res) => {
    const sessionUser = getCurrentUser(req);
    const requestedTransporterId = req.params.id;

    const isAdmin = sessionUser?.isSuperAdmin || sessionUser?.role === "admin";
    const isSelf = sessionUser?.transporterId === requestedTransporterId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Access denied. You can only view your transporter eligibility." });
    }

    try {
      const eligibility = await computeTransporterEligibility(requestedTransporterId);
      res.json({
        ...eligibility,
        eligible: eligibility.canBid,
        reason: eligibility.reason,
      });
    } catch (error) {
      console.error("[GET /api/transporters/:id/bid-eligibility] Error:", error);
      res.status(500).json({ error: "Failed to fetch bid eligibility" });
    }
  });

  // GET /api/transporters/:id/eligibility - Single source of truth for frontend gating
  app.get("/api/transporters/:id/eligibility", requireAuth, async (req, res) => {
    const sessionUser = getCurrentUser(req);
    const requestedTransporterId = req.params.id;

    const isAdmin = sessionUser?.isSuperAdmin || sessionUser?.role === "admin";
    const isSelf = sessionUser?.transporterId === requestedTransporterId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Access denied. You can only view your transporter eligibility." });
    }

    try {
      const eligibility = await computeTransporterEligibility(requestedTransporterId);
      res.json(eligibility);
    } catch (error) {
      console.error("[GET /api/transporters/:id/eligibility] Error:", error);
      res.status(500).json({ error: "Failed to fetch transporter eligibility" });
    }
  });

  // Bid routes
  // POLLING-SAFE: Idempotent, no side effects, safe for 30s refresh
  app.get("/api/bids", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    const { rideId, userId, transporterId } = req.query;
    const { limit, offset } = parsePagination(req, { maxLimit: 200 });

    try {
      let result: any[] = [];

      // Role-based access control for bids
      if (sessionUser) {
        const isSuperAdmin = sessionUser.isSuperAdmin;
        const userRole = sessionUser.role;
        const isAdmin = isSuperAdmin || userRole === "admin";

        // Admins and Super Admins can access all bids with optional filters
        if (isAdmin) {
          if (rideId) {
            result = await storage.getRideBids(rideId as string);
          } else if (userId) {
            result = await storage.getUserBids(userId as string);
          } else if (transporterId) {
            result = await storage.getTransporterBids(transporterId as string);
          } else {
            result = await storage.getAllBids(limit, offset);
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

      // Cache for 10s to reduce DB load during polling
      res.set('Cache-Control', 'private, max-age=10');

      // Map joined results into a consistent format with serialized ride details
      const formattedBids = result.map(item => {
        // Handle cases where result might still be a flat Bid array (getAllBids fallback)
        if (item.bid && item.ride) {
          return {
            ...item.bid,
            ride: serializeRide(item.ride, sessionUser)
          };
        }
        return item;
      });

      res.json(formattedBids);
    } catch (error) {
      // PHASE G/H: Return empty array on error for polling resilience
      console.error("[GET /api/bids] Error:", error);
      res.json([]);
    }
  });

  // POST /api/bids - PHASE A/C: Ownership enforcement + Verification gates
  app.post("/api/bids", bidLimiter, async (req, res) => {
    const sessionUser = getCurrentUser(req);

    // Only authenticated transporters can place bids
    if (!sessionUser || (sessionUser.role !== "transporter" && !sessionUser.isSuperAdmin)) {
      return res.status(403).json({ error: "Only transporters can place bids" });
    }

    try {
      const data = insertBidSchema.parse(req.body);

      // PHASE A: OWNERSHIP ENFORCEMENT - Auto-attach transporterId from session
      // Never accept transporterId from frontend payload for non-admins
      const effectiveTransporterId = sessionUser.isSuperAdmin
        ? (data.transporterId || sessionUser.transporterId)
        : sessionUser.transporterId;

      if (!effectiveTransporterId) {
        return res.status(403).json({ error: "You must be associated with a transporter to place bids" });
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

      // PHASE C: VERIFICATION GATES - Comprehensive checks before allowing bid
      if (!sessionUser.isSuperAdmin) {
        const [eligibility, vehicles] = await Promise.all([
          computeTransporterEligibility(effectiveTransporterId),
          storage.getTransporterVehicles(effectiveTransporterId),
        ]);

        if (!eligibility.canBid) {
          return res.status(403).json({
            error: "Transporter is not eligible to bid",
            reason: eligibility.reason,
            eligibility,
          });
        }

        // PHASE E: Verify the selected vehicle belongs to this transporter and is active
        const selectedVehicle = vehicles.find(v => v.id === data.vehicleId);
        if (!selectedVehicle) {
          return res.status(403).json({
            error: "The selected vehicle does not belong to your transporter."
          });
        }
        if (selectedVehicle.status !== "active") {
          return res.status(403).json({
            error: "The selected vehicle is not active. Only verified active vehicles can be used for bidding."
          });
        }
      }

      // Create bid with enforced transporterId from session
      const bidData = {
        ...data,
        transporterId: effectiveTransporterId,
        userId: sessionUser.id,
      };
      const bid = await storage.createBid(bidData);

      if (ride.status === "pending") {
        try {
          assertRideTransition(ride.status, "bidding", ride.id);
          await storage.updateRideStatus(data.rideId, "bidding");
        } catch (e) {
          if (e instanceof RideTransitionError) {
            console.warn(`[Bid] Could not transition ride ${ride.id} to bidding from ${ride.status}`);
          } else {
            throw e;
          }
        }
      }

      // Notify the customer that a bid was placed on their trip
      try {
        if (ride.createdById) {
          const transporter = effectiveTransporterId ? await storage.getTransporter(effectiveTransporterId) : null;
          const transporterName = transporter?.companyName || sessionUser.name || "A transporter";
          await createRoleAwareNotification({
            recipientId: ride.createdById,
            recipientRole: "customer",
            eventType: "bid_created",
            notificationType: "bid",
            actionType: "action_required",
            entityType: "bid",
            entityId: bid.id,
            rideId: ride.id,
            bidId: bid.id,
            context: {
              transporterName,
              bidAmount: data.amount,
              pickupLocation: ride.pickupLocation,
              dropLocation: ride.dropLocation
            }
          });
        }
      } catch (notifyError) {
        console.error("Failed to notify customer about new bid:", notifyError);
      }

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
          const ride = await storage.getRide(bid.rideId);
          if (!ride) {
            return res.status(404).json({ error: "Ride not found" });
          }

          try {
            assertRideTransition(ride.status, "assigned", ride.id);
          } catch (e) {
            if (e instanceof RideTransitionError) {
              return res.status(400).json({
                error: "Cannot assign driver from current ride status",
                from: ride.status,
                to: "assigned"
              });
            }
            throw e;
          }

          await storage.assignRideToDriver(bid.rideId, bid.userId, bid.vehicleId, bid.transporterId, bid.id);

          const transporter = bid.transporterId ? await storage.getTransporter(bid.transporterId) : null;
          const contextData = {
            bidAmount: bid.amount,
            pickupLocation: ride.pickupLocation,
            dropLocation: ride.dropLocation,
            transporterName: transporter?.companyName || "Transporter"
          };

          await createRoleAwareNotification({
            recipientId: bid.userId,
            recipientTransporterId: bid.transporterId || undefined,
            recipientRole: "transporter",
            eventType: "bid_accepted",
            notificationType: "bid",
            actionType: "success",
            entityType: "trip",
            entityId: ride.id,
            rideId: bid.rideId,
            bidId: bid.id,
            context: contextData
          });

          if (ride.createdById) {
            await createRoleAwareNotification({
              recipientId: ride.createdById,
              recipientRole: "customer",
              eventType: "bid_accepted",
              notificationType: "trip",
              actionType: "info",
              entityType: "trip",
              entityId: ride.id,
              rideId: ride.id,
              context: contextData
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
        let verificationStatus = "unverified";
        if (bid.transporterId) {
          const transporter = await storage.getTransporter(bid.transporterId);
          if (transporter) {
            transporterName = transporter.companyName;
            verificationStatus = transporter.verificationStatus || "pending";
          }
        }

        let vehicleInfo = null;
        if (bid.vehicleId) {
          const vehicle = await storage.getVehicle(bid.vehicleId);
          if (vehicle) {
            // Mask plate number and details before acceptance
            const isAccepted = bid.status === "accepted";
            vehicleInfo = {
              type: vehicle.type,
              model: isAccepted ? vehicle.model : "Masked",
              plateNumber: isAccepted ? vehicle.plateNumber : "Masked"
            };
          }
        }

        return {
          id: bid.id,
          entityId: (bid as any).entityId,
          amount: bid.amount,
          status: bid.status,
          transporterName,
          verificationStatus,
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
  // PHASE B/D: Auto-scope based on role, show ALL vehicles including pending
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    const user = getCurrentUser(req)!;
    const isAdmin = user.isSuperAdmin || user.role === "admin";
    const isTransporter = user.role === "transporter";

    // Accept either transporterId (legacy) or entityId (new onboarding flows)
    const transporterId = req.query.transporterId as string | undefined;
    const entityId = req.query.entityId as string | undefined;

    try {
      console.log(`[GET /api/vehicles] User: ${user.id}, Role: ${user.role}, SessionTransporterId: ${user.transporterId}, QueryTransporterId: ${transporterId}, QueryEntityId: ${entityId}`);

      // If nothing is provided and the requester is not a transporter, require a parameter
      if (!transporterId && !entityId && !isTransporter && !isAdmin && user.role !== "driver") {
        return res.status(400).json({ error: "transporterId or entityId is required" });
      }

      let vehicles: any[] = [];

      if (entityId) {
        // Entity-based lookup (preferred for new onboarding flows)
        vehicles = await storage.getVehiclesByEntity(entityId);
      } else {
        // Determine the target transporter id: either provided or session (for transporters)
        const targetTransporterId = transporterId || (isTransporter ? user.transporterId : undefined);
        if (!targetTransporterId) {
          if (user.role === "driver") {
            vehicles = await storage.getUserVehicles(user.id);
          } else {
            vehicles = [];
          }
        } else {
          vehicles = await storage.getTransporterVehicles(targetTransporterId);
        }
      }

      res.json(vehicles ?? []);
    } catch (error) {
      console.error("[GET /api/vehicles] Error:", error);
      res.json([]);
    }
  });

  // GET /api/vehicles/all - Admin only
  app.get("/api/vehicles/all", requireAdmin, async (req, res) => {
    try {
      const { limit, offset } = parsePagination(req, { maxLimit: 200 });
      const result = await storage.getAllVehicles(limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all vehicles" });
    }
  });

  // POST /api/vehicles - Driver or transporter only
  // PHASE A: Auto-attach transporterId from session, never trust frontend
  app.post("/api/vehicles", requireDriverOrTransporter, async (req, res) => {
    const user = getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const data = insertVehicleSchema.parse(req.body);

      // OWNERSHIP ENFORCEMENT: Auto-attach transporterId from session
      // Never accept transporterId from frontend payload for non-admins
      const isAdmin = user.isSuperAdmin || user.role === "admin";

      let vehicleData = { ...data };
      if (!isAdmin) {
        // Force transporterId from session
        if (!user.transporterId) {
          return res.status(403).json({
            error: "You must be associated with a transporter to add vehicles"
          });
        }
        vehicleData.transporterId = user.transporterId;

        // If transporter is creating vehicle for a driver, allow specifying userId
        // But if no userId provided, default to current user
        if (!vehicleData.userId) {
          vehicleData.userId = user.id;
        } else {
          // Validate that the specified userId belongs to this transporter
          const targetUser = await storage.getUser(vehicleData.userId);
          if (!targetUser || targetUser.transporterId !== user.transporterId) {
            return res.status(403).json({
              error: "You can only assign vehicles to drivers in your transporter"
            });
          }
        }
      }

      const vehicle = await storage.createVehicle(vehicleData);
      if (!vehicle?.entityId) {
        console.error("[POST /api/vehicles] entityId generation failed", { vehicleId: vehicle?.id, transporterId: vehicleData.transporterId });
        return res.status(500).json({ error: "Vehicle entityId generation failed" });
      }

      res.status(201).json(vehicle);
    } catch (error: any) {
      console.error("[POST /api/vehicles] Error:", error);
      res.status(400).json({ error: error?.message || "Invalid vehicle data" });
    }
  });

  // DELETE /api/vehicles/:id - Remove vehicle when onboarding flow fails (owner or admin only)
  app.post("/api/auth/register", authLimiter, async (req, res) => {
    try {
      // Normalize phone before parsing
      if (req.body.phone) {
        req.body.phone = normalizePhone(req.body.phone);
      }

      // Enforce role safety: default to customer; only super-admins can create admins/super-admins
      const requestedRole = req.body.role || "customer";
      const sessionUser = req.session?.user;
      const allowedSelfServeRoles: Array<"customer" | "driver" | "transporter"> = ["customer", "driver", "transporter"];

      const isSuperAdminRequest = Boolean(req.body.isSuperAdmin);
      const isPrivilegedRole = requestedRole === "admin" || isSuperAdminRequest;

      if (isPrivilegedRole && !(sessionUser?.isSuperAdmin)) {
        return res.status(403).json({ error: "Only super admins can create admin accounts" });
      }

      if (!allowedSelfServeRoles.includes(requestedRole as any) && !sessionUser?.isSuperAdmin) {
        return res.status(400).json({ error: "Invalid role" });
      }

      // Strip unsafe fields before validation
      const { isSuperAdmin: _ignoredIsSuperAdmin, role: _incomingRole, ...rest } = req.body;
      const parsedBody = { ...rest, role: sessionUser?.isSuperAdmin ? requestedRole : (requestedRole as any) };

      const data = insertUserSchema.parse(parsedBody);
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
        // Get transporter type (business or individual) from request
        const transporterType = req.body.transporterType === "business" ? "business" : "individual";

        const transporterData = {
          companyName: req.body.companyName || `${data.name}'s Transport`,
          ownerName: data.name,
          contact: data.phone,
          email: data.email,
          location: req.body.location || req.body.city || "India",
          baseCity: req.body.city || req.body.location || "India",
          fleetSize: req.body.fleetSize || 1,
          status: "pending_verification" as const,
          verificationStatus: 'unverified',
          transporterType, // Set entity type (business/individual)
          onboardingStatus: "incomplete" as const,
        };

        const transporter = await storage.createTransporter(transporterData);
        transporterId = transporter.id;
      }

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
        transporterId,
        isSuperAdmin: sessionUser?.isSuperAdmin ? Boolean(req.body.isSuperAdmin) : false,
      });
      const { password, ...userWithoutPassword } = user;

      // If an admin is already logged in (creating a user on behalf of someone),
      // don't regenerate the session - just return the new user data
      if (sessionUser?.isSuperAdmin) {
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
          isSelfDriver: user.isSelfDriver || false,
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
        isSelfDriver: user.isSelfDriver || false,
        transporterId: transporterId || user.transporterId || undefined,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("Session save error during registration:", saveErr);
          return res.status(500).json({ error: "Session save failed" });
        }
        res.json({ ...userWithoutPassword, transporterId });
      });
    } catch (error: any) {
      console.error("[auth/register] Registration error:", error);

      // Handle Zod validation errors
      if (error?.name === 'ZodError' || error?.issues) {
        return res.status(400).json({ error: "Invalid input", details: error.issues });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // GET /api/transporters - Admin-only list with optional filters
  app.get("/api/transporters", requireAdmin, async (req, res) => {
    try {
      const { status, search } = req.query as { status?: string; search?: string };
      const { limit, offset } = parsePagination(req, { maxLimit: 200 });

      const all = await storage.getAllTransporters();

      let filtered = all;
      if (status && status !== "all") {
        filtered = filtered.filter(t => t.status === status);
      }
      if (search) {
        const needle = search.toLowerCase();
        filtered = filtered.filter(t =>
          [
            t.companyName,
            t.ownerName,
            t.contact,
            t.email || "",
            t.location || "",
            t.baseCity || ""
          ]
            .some(val => (val || "").toLowerCase().includes(needle))
        );
      }

      if (typeof limit === "number" || typeof offset === "number") {
        const start = offset || 0;
        const end = typeof limit === "number" ? start + limit : undefined;
        filtered = filtered.slice(start, end);
      }

      res.json(filtered);
    } catch (error) {
      console.error("[GET /api/transporters] Error:", error);
      res.status(500).json({ error: "Failed to fetch transporters" });
    }
  });

  // POST /api/transporters - Admin-only create
  app.post("/api/transporters", requireAdmin, async (req, res) => {
    try {
      const data = insertTransporterSchema.parse(req.body);
      const transporter = await storage.createTransporter(data);
      res.status(201).json(transporter);
    } catch (error: any) {
      console.error("[POST /api/transporters] Error:", error);

      if (error?.name === "ZodError" || error?.issues) {
        return res.status(400).json({ error: "Invalid transporter data", details: error.issues });
      }

      res.status(400).json({ error: error?.message || "Failed to create transporter" });
    }
  });

  // GET /api/transporters/:id - Get single transporter (admin or owner/transporter)
  app.get('/api/transporters/:id', requireAdminOrOwner(req => req.params.id), async (req, res) => {
    try {
      const transporter = await storage.getTransporter(req.params.id);
      if (!transporter) return res.status(404).json({ error: 'Transporter not found' });
      res.json(transporter);
    } catch (error) {
      console.error('[GET /api/transporters/:id] Error:', error);
      res.status(500).json({ error: 'Failed to fetch transporter' });
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

      // Approve and verify transporter (sets verificationStatus=approved, status=active, logs audit)
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

      // Notify all users under this transporter about approval
      try {
        const transporterUsers = await storage.getUsersByTransporter(req.params.id);
        for (const user of transporterUsers) {
          await createRoleAwareNotification({
            recipientId: user.id,
            recipientTransporterId: req.params.id,
            recipientRole: "transporter",
            eventType: "transporter_approved",
            notificationType: "account",
            actionType: "success",
            context: { companyName: transporter.companyName }
          });

          // Send SMS notification for transporter approval
          if (user.phone) {
            sendTransactionalSms(user.phone, SmsEvent.TRANSPORTER_APPROVED, {
              companyName: transporter.companyName
            }).catch(err => console.error("[SMS:ERROR] Failed to send TRANSPORTER_APPROVED SMS:", err));
          }
        }
      } catch (notifyError) {
        console.error("Failed to notify transporter users about approval:", notifyError);
      }

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

      // Notify all users under this transporter about rejection
      try {
        const transporterUsers = await storage.getUsersByTransporter(req.params.id);
        for (const user of transporterUsers) {
          await createRoleAwareNotification({
            recipientId: user.id,
            recipientTransporterId: req.params.id,
            recipientRole: "transporter",
            eventType: "transporter_rejected",
            notificationType: "account",
            actionType: "warning",
            context: { companyName: transporter.companyName, reason: reason.trim() }
          });

          // Send SMS notification for transporter rejection
          if (user.phone) {
            sendTransactionalSms(user.phone, SmsEvent.TRANSPORTER_REJECTED, {
              companyName: transporter.companyName,
              reason: reason.trim()
            }).catch(err => console.error("[SMS:ERROR] Failed to send TRANSPORTER_REJECTED SMS:", err));
          }
        }
      } catch (notifyError) {
        console.error("Failed to notify transporter users about rejection:", notifyError);
      }

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
      const { transporterId: queryTransporterId, role } = req.query;
      const { limit, offset } = parsePagination(req, { maxLimit: 200 });
      const user = getCurrentUser(req)!;
      const isAdmin = user.isSuperAdmin || user.role === "admin";
      const isTransporter = user.role === "transporter";

      // STRICT DATA ISOLATION: Log session info for debugging
      console.log(`[GET /api/users] User: ${user.id}, Role: ${user.role}, SessionTransporterId: ${user.transporterId}, QueryTransporterId: ${queryTransporterId}, RoleFilter: ${role}`);

      let users;
      if (isAdmin) {
        // Admin can query by any filter
        if (queryTransporterId && role) {
          users = await storage.getUsersByTransporterAndRole(queryTransporterId as string, role as string);
        } else if (queryTransporterId) {
          users = await storage.getUsersByTransporter(queryTransporterId as string);
        } else {
          users = await storage.getAllUsers();
        }
      } else if (isTransporter) {
        // STRICT ISOLATION: Transporters ONLY see their own users
        // Use session transporterId, never trust query parameters
        if (!user.transporterId) {
          console.warn(`[GET /api/users] Transporter ${user.id} has no transporterId in session - returning empty`);
          return res.json([]);
        }

        // DEFENSE-IN-DEPTH: Verify session transporterId against database
        let verifiedTransporterId = user.transporterId;
        try {
          const dbUser = await storage.getUser(user.id);
          if (!dbUser) {
            console.warn(`[SECURITY] User ${user.id} not found in database`);
            return res.json([]);
          }
          if (dbUser.transporterId !== user.transporterId) {
            console.error(`[SECURITY ALERT] Session transporterId mismatch in /api/users for user ${user.id}: session=${user.transporterId}, db=${dbUser.transporterId}`);
            // Use database transporterId, update session
            if (req.session?.user) {
              req.session.user.transporterId = dbUser.transporterId ?? undefined;
            }
            verifiedTransporterId = dbUser.transporterId ?? verifiedTransporterId;
          }
        } catch (verifyError) {
          console.error(`[SECURITY] Failed to verify transporter in /api/users:`, verifyError);
          // Continue with session data in case of DB error
        }

        // Cross-tenant check: if query param differs from session, log warning and use session
        if (queryTransporterId && queryTransporterId !== verifiedTransporterId) {
          console.warn(`[GET /api/users] SECURITY: Transporter ${user.id} tried to access transporterId ${queryTransporterId} but verified transporterId is ${verifiedTransporterId}`);
        }

        if (role) {
          users = await storage.getUsersByTransporterAndRole(verifiedTransporterId, role as string);
        } else {
          users = await storage.getUsersByTransporter(verifiedTransporterId);
        }
        console.log(`[GET /api/users] Returning ${users.length} users for transporter ${verifiedTransporterId}`);
      } else {
        // Other roles: only see themselves
        return res.json([]);
      }

      const usersWithoutPasswords = users.map(({ password, ...u }) => u);
      if (typeof limit === "number" || typeof offset === "number") {
        const start = offset || 0;
        const end = typeof limit === "number" ? start + limit : undefined;
        return res.json(usersWithoutPasswords.slice(start, end));
      }
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("[GET /api/users] Error:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all customers (for admin panel) with trip counts - Admin only
  app.get("/api/customers", requireAdmin, async (req, res) => {
    try {
      const { limit, offset } = parsePagination(req, { maxLimit: 200 });
      const customers = await storage.getCustomers(limit, offset);
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

  // Get drivers - supports transporterId or entityId (Phase-1 compatibility)
  app.get("/api/drivers", requireAuth, async (req, res) => {
    try {
      const { limit, offset } = parsePagination(req, { maxLimit: 200 });
      const user = getCurrentUser(req)!;
      const isAdmin = user.isSuperAdmin || user.role === "admin";

      const transporterId = req.query.transporterId as string | undefined;
      const entityId = req.query.entityId as string | undefined;

      if (!transporterId && !entityId && !isAdmin && user.role !== "transporter") {
        return res.status(400).json({ error: "transporterId or entityId is required" });
      }

      let drivers: any[] = [];

      if (entityId) {
        drivers = await storage.getDriversByEntity(entityId);
      } else {
        const targetTransporterId = transporterId || (user.role === "transporter" ? user.transporterId : undefined);
        if (!targetTransporterId) {
          // If caller is a driver, return their own record
          if (user.role === "driver") {
            const u = await storage.getUser(user.id);
            drivers = u ? [u] : [];
          } else {
            drivers = [];
          }
        } else {
          drivers = await storage.getUsersByTransporterAndRole(targetTransporterId, "driver");
        }
      }

      const driversWithoutPasswords = drivers.map(({ password, ...d }) => d);
      if (typeof limit === "number" || typeof offset === "number") {
        const start = offset || 0;
        const end = typeof limit === "number" ? start + limit : undefined;
        return res.json((driversWithoutPasswords ?? []).slice(start, end));
      }
      res.json(driversWithoutPasswords ?? []);
    } catch (error) {
      console.error("[GET /api/drivers] Error:", error);
      res.json([]);
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
      // Defensive: each query wrapped with catch to prevent cascade failures
      const [drivers, transporters, customers, vehicles, rides, bids] = await Promise.all([
        storage.getDrivers().catch(() => []),
        storage.getAllTransporters().catch(() => []),
        storage.getCustomers().catch(() => []),
        storage.getAllVehicles().catch(() => []),
        storage.getAllRides().catch(() => []),
        storage.getAllBids().catch(() => []),
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
      console.error("Admin stats error:", error);
      // Return degraded stats instead of crashing
      res.json({
        totalDrivers: 0,
        totalTransporters: 0,
        totalCustomers: 0,
        totalVehicles: 0,
        activeVehicles: 0,
        totalRides: 0,
        completedRides: 0,
        activeRides: 0,
        pendingRides: 0,
        totalBids: 0,
        totalRevenue: 0,
        pendingVerifications: 0,
        pendingApprovals: 0,
        recentRides: [],
        degraded: true,
      });
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
    const { limit, offset } = parsePagination(req, { maxLimit: 200 });
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
      } else if (req.query.transporterId) {
        // Normalize transporterId: accept either entityId (UUID) or numeric/string id
        let transporterId: string | undefined;
        let transporterEntityId: string | undefined;

        if (typeof req.query.transporterId === "string") {
          if (req.query.transporterId.includes("-")) {
            transporterEntityId = req.query.transporterId;
          } else {
            transporterId = req.query.transporterId;
          }
        }

        // Resolve entityId -> numeric/string id
        if (!transporterId && transporterEntityId) {
          const transporter = await storage.getTransporterByEntityId(transporterEntityId);
          if (!transporter) {
            // Return safe empty list for missing transporter (list view expects array)
            return res.json([]);
          }
          transporterId = transporter.id;
        }

        // Ownership enforcement
        if (!isAdmin && transporterId && user.transporterId !== transporterId) {
          return res.status(403).json({ error: "You can only view your own transporter documents" });
        }

        result = await storage.getTransporterDocuments(transporterId as string);
      } else {
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all documents" });
        }
        result = await storage.getAllDocuments(limit, offset);
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

      let document;

      if (entityId) {
        const existingDoc = await storage.findActiveDocumentByType(data.entityType, entityId, data.type);
        if (existingDoc) {
          // Atomically create the new document and mark the old one as replaced
          document = await storage.replaceDocumentAtomically(existingDoc.id, data, sessionUser.id);
        } else {
          document = await storage.createDocument(data);
        }
      } else {
        document = await storage.createDocument(data);
      }

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
        entityType: incomingEntityType,
        type,
        entityId: incomingEntityId,
        expiryDate,
        replaceDocumentId,
        vehicleId: bodyVehicleId,
        driverId: bodyDriverId
      } = req.body;

      // Normalize entity type to fix incorrect driver uploads (drivers are users, not transporters)
      let entityType = incomingEntityType;
      if (entityType === "user") {
        entityType = "driver";
      }

      let entityId = incomingEntityId;

      // If a driver sends transporter as entityType, correct it and use their own ID/entity
      if (sessionUser.role === "driver" && entityType === "transporter") {
        entityType = "driver";
        entityId = entityId || sessionUser.id || sessionUser.entityId;
      }

      // BACKWARD COMPAT SAFETY: Recover missing entityId from vehicleId, driverId or session transporter

      if (!entityId && entityType === "vehicle" && bodyVehicleId) {
        try {
          const vehicle = await storage.getVehicle(bodyVehicleId);
          entityId = vehicle?.entityId;
        } catch (err) {
          console.warn("Failed to resolve vehicle.entityId from vehicleId", err);
        }
      }

      if (!entityId && entityType === "driver" && bodyDriverId) {
        try {
          const driver = await storage.getUser(bodyDriverId);
          entityId = driver?.entityId;
        } catch (err) {
          console.warn("Failed to resolve driver.entityId from driverId", err);
        }
      }

      if (!entityId && entityType === "transporter") {
        // Prefer explicit session transporterEntityId if available, otherwise lookup transporter by session transporterId
        if (sessionUser.transporterEntityId) {
          entityId = sessionUser.transporterEntityId;
        } else if (sessionUser.transporterId) {
          try {
            const t = await storage.getTransporter(sessionUser.transporterId);
            entityId = t?.entityId;
          } catch (err) {
            console.warn("Failed to resolve transporter.entityId from session transporterId", err);
          }
        }
      }

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
        // entityId is the vehicle.entityId; resolve to the actual vehicle.id to satisfy FK
        const [vehicleByEntity] = await storage.getVehiclesByEntity(entityId);
        if (vehicleByEntity) {
          vehicleId = vehicleByEntity.id;
          transporterId = vehicleByEntity.transporterId ?? transporterId;
        } else {
          const vehicleById = await storage.getVehicle(entityId);
          vehicleId = vehicleById?.id;
          transporterId = vehicleById?.transporterId ?? transporterId;
        }

        if (!vehicleId) {
          return res.status(400).json({ error: "Vehicle not found for entityId" });
        }
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

      // Create document record. If replacing, do it atomically to avoid invalidating the old doc prematurely.
      const docLabel = type.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const newDocData = {
        type,
        url: fileUrl,
        entityId,
        entityType,
        userId: userId || sessionUser.id,
        vehicleId,
        transporterId,
        expiryDate: expiryDate || undefined,
        documentName: docLabel,
        status: "pending",
      };

      let document;
      if (autoReplaceDocumentId) {
        document = await storage.replaceDocumentAtomically(autoReplaceDocumentId, newDocData as any, sessionUser.id);
      } else {
        document = await storage.createDocument(newDocData as any);
      }

      res.status(201).json(document);
    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upload document" });
    }
  });

  // GET /api/documents/:id/preview - Return signed preview URL (role-aware)
  app.get("/api/documents/:id/preview", async (req, res) => {
    const sessionUser = getCurrentUser(req);
    if (!sessionUser?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const doc = await storage.getDocumentById(req.params.id);
      if (!doc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Authorization: admins, uploader, or owning transporter/vehicle
      const isAdmin = sessionUser.isSuperAdmin || sessionUser.role === "admin";
      let allowed = isAdmin;

      if (!allowed && doc.userId && doc.userId === sessionUser.id) {
        allowed = true;
      }

      if (!allowed && doc.transporterId && sessionUser.transporterId && doc.transporterId === sessionUser.transporterId) {
        allowed = true;
      }

      if (!allowed && doc.vehicleId && sessionUser.transporterId) {
        const vehicle = await storage.getVehicle(doc.vehicleId);
        if (vehicle?.transporterId === sessionUser.transporterId) {
          allowed = true;
        }
      }

      if (!allowed) {
        return res.status(403).json({ error: "Access denied" });
      }

      // If URL is already absolute, return it directly
      if (doc.url.startsWith("http://") || doc.url.startsWith("https://")) {
        return res.json({ url: doc.url });
      }

      const spacesStorage = getSpacesStorage();
      if (!spacesStorage) {
        return res.status(503).json({ error: "Storage not configured" });
      }

      const hasAccess = await checkSpacesFileAccess(doc.url, sessionUser, storage);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }

      const signedUrl = await spacesStorage.getSignedUrl(doc.url, 3600);
      res.json({ url: signedUrl, expiresIn: 3600 });
    } catch (error) {
      console.error("Document preview error:", error);
      res.status(500).json({ error: "Failed to generate preview" });
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

      // Get document before updating to notify the uploader
      const document = await storage.getDocumentById(req.params.id);

      // Clear rejection reason when approving
      const reason = status === "verified" ? null : rejectionReason;
      await storage.updateDocumentStatus(req.params.id, status, adminUser.id, reason);

      // Update vehicle/driver documentStatus when their required docs are approved/rejected
      if (document) {
        const docType = document.type?.toLowerCase();

        // Vehicle RC document - update vehicle documentStatus
        if (document.entityType === "vehicle" && document.vehicleId &&
          (docType === "rc" || docType === "registration_certificate" || docType === "vehicle_rc")) {
          if (status === "verified") {
            await storage.updateVehicleDocumentStatus(document.vehicleId, "approved");
          } else if (status === "rejected") {
            await storage.updateVehicleDocumentStatus(document.vehicleId, "rejected");
          }
        }

        // Driver license document - update driver documentStatus
        if (document.entityType === "driver" && document.userId &&
          (docType === "driving_license" || docType === "license" || docType === "dl")) {
          if (status === "verified") {
            await storage.updateDriverDocumentStatus(document.userId, "approved");
          } else if (status === "rejected") {
            await storage.updateDriverDocumentStatus(document.userId, "rejected");
          }
        }
      }

      // Notify the document uploader about status change
      if (document?.userId && (status === "verified" || status === "rejected")) {
        try {
          const docName = document.documentName || document.type || "Document";
          if (status === "verified") {
            await storage.createNotification({
              recipientId: document.userId,
              recipientTransporterId: document.transporterId || undefined,
              type: "system",
              title: "Document Approved",
              message: `Your ${docName} has been verified and approved.`,
            });
          } else if (status === "rejected") {
            await storage.createNotification({
              recipientId: document.userId,
              recipientTransporterId: document.transporterId || undefined,
              type: "system",
              title: "Document Rejected",
              message: `Your ${docName} was rejected. Reason: ${rejectionReason}. Please re-upload.`,
            });
          }
        } catch (notifyError) {
          console.error("Failed to notify user about document status:", notifyError);
        }
      }

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
    if (user.role === "customer" && (ride.customerId === user.id || ride.createdById === user.id)) {
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

      // Notify the document uploader about status change
      if (document.userId && (status === "verified" || status === "rejected")) {
        try {
          const docName = document.documentName || document.type || "Trip Document";
          const tripInfo = `${ride.pickupLocation} to ${ride.dropLocation}`;
          if (status === "verified") {
            await storage.createNotification({
              recipientId: document.userId,
              recipientTransporterId: document.transporterId || undefined,
              type: "system",
              title: "Trip Document Approved",
              message: `Your ${docName} for trip (${tripInfo}) has been verified.`,
              rideId: tripId,
            });
          } else if (status === "rejected") {
            await storage.createNotification({
              recipientId: document.userId,
              recipientTransporterId: document.transporterId || undefined,
              type: "system",
              title: "Trip Document Rejected",
              message: `Your ${docName} for trip (${tripInfo}) was rejected. Reason: ${rejectionReason}`,
              rideId: tripId,
            });
          }
        } catch (notifyError) {
          console.error("Failed to notify user about trip document status:", notifyError);
        }
      }

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
  // FIX: Query both user-scoped AND transporter-scoped notifications
  app.get("/api/notifications", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const { unreadOnly } = req.query;
      let notifications;

      // For transporters, get BOTH user and transporter-scoped notifications
      if (unreadOnly === "true") {
        notifications = await storage.getUnreadNotificationsForUserOrTransporter(
          sessionUser.id,
          sessionUser.transporterId || undefined
        );
      } else {
        // Get user notifications + transporter notifications if applicable
        const userNotifications = await storage.getUserNotifications(sessionUser.id);
        if (sessionUser.transporterId) {
          const transporterNotifications = await storage.getTransporterNotifications(sessionUser.transporterId);
          // Merge and deduplicate by ID
          const allIds = new Set<string>();
          notifications = [];
          for (const n of [...userNotifications, ...transporterNotifications]) {
            if (!allIds.has(n.id)) {
              allIds.add(n.id);
              notifications.push(n);
            }
          }
          // Sort by createdAt descending
          notifications.sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
        } else {
          notifications = userNotifications;
        }
      }

      // Ensure we always return an array
      res.json(Array.isArray(notifications) ? notifications : []);
    } catch (error) {
      console.error("[notifications] Failed to fetch:", error);
      // Return empty array on error to prevent frontend crash
      res.json([]);
    }
  });

  // GET /api/notifications/unread-count - Fast count for UI badges
  // IMPORTANT: Must NEVER throw or return non-JSON - UI polls this frequently
  // FIX: Query both user-scoped AND transporter-scoped notifications
  app.get("/api/notifications/unread-count", async (req, res) => {
    try {
      const sessionUser = getCurrentUser(req);

      if (!sessionUser) {
        // Return 0 for unauthenticated users instead of 401
        return res.json({ count: 0 });
      }

      // For transporters, count BOTH user and transporter-scoped unread notifications
      const unreadNotifications = await storage.getUnreadNotificationsForUserOrTransporter(
        sessionUser.id,
        sessionUser.transporterId || undefined
      );
      res.json({ count: unreadNotifications.length });
    } catch (error) {
      console.error("[notifications] unread-count failed:", error);
      // NEVER throw - return 0 on failure to prevent UI breakage
      res.json({ count: 0 });
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

  // FIX: Mark all notifications read for user AND transporter
  app.patch("/api/notifications/mark-all-read", async (req, res) => {
    const sessionUser = getCurrentUser(req);

    if (!sessionUser) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      await storage.markAllNotificationsReadForUserOrTransporter(
        sessionUser.id,
        sessionUser.transporterId || undefined
      );
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

      // Compute financials with platform settings
      const financials = await computeTripFinancialsWithSettings(bid.amount);

      // Atomically: update bid, ride, close bidding, lock financials, create ledger, reject other bids
      const accepted = await storage.acceptBidAtomic({
        bidId: bid.id,
        rideId: ride.id,
        transporterId: bid.transporterId || null,
        acceptedByUserId: sessionUser.id,
        financials: {
          finalPrice: financials.finalPrice.toString(),
          platformFee: financials.platformFee.toString(),
          transporterEarning: financials.transporterEarning.toString(),
          platformFeePercent: financials.platformFeePercent.toString(),
          shadowPlatformFee: financials.shadowPlatformFee.toString(),
          shadowPlatformFeePercent: financials.shadowPlatformFeePercent.toString()
        }
      });

      if (!accepted) {
        return res.status(409).json({ error: "Bidding already closed or trip no longer available" });
      }

      // Post-acceptance: Assign driver if policy allows (non-critical, outside transaction)
      if (bid.userId && bid.vehicleId && bid.transporterId) {
        const transporter = await storage.getTransporter(bid.transporterId);
        if (transporter) {
          const policyCheck = await checkExecutionPolicy(transporter, bid.userId);
          if (policyCheck.allowed) {
            try {
              assertRideTransition("accepted", "assigned", ride.id);
              await storage.assignRideToDriver(ride.id, bid.userId, bid.vehicleId, bid.transporterId, bid.id);
            } catch (e) {
              if (e instanceof RideTransitionError) {
                console.warn(`[BidAccept] Could not transition ride ${ride.id} to assigned`);
              } else {
                throw e;
              }
            }
          }
        }
      }

      // Send notifications (non-critical, outside transaction)
      const allBids = await storage.getRideBids(ride.id);
      for (const otherBid of allBids) {
        if (otherBid.id !== bid.id && otherBid.status === "rejected") {
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

        // Send SMS to winning bidder
        const bidUser = await storage.getUser(bid.userId);
        if (bidUser?.phone) {
          sendTransactionalSms(bidUser.phone, SmsEvent.BID_ACCEPTED, {
            amount: String(bid.amount),
            pickup: ride.pickupLocation,
            drop: ride.dropLocation
          }).catch(err => console.error("[SMS:ERROR] Failed to send BID_ACCEPTED SMS:", err));
        }
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
  app.get("/api/admin/storage", requireAdmin, async (req: Request, res: Response) => {
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
  app.get("/api/admin/storage/file", requireAdmin, async (req: Request, res: Response) => {
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
  app.delete("/api/admin/storage/file", requireAdmin, async (req: Request, res: Response) => {
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
  app.get("/api/admin/storage/directories", requireAdmin, async (req: Request, res: Response) => {
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

  // ============== ADMIN VERIFICATION INBOX ==============

  // GET /api/admin/verification/overview - Hierarchical verification data with tree structure
  // Returns all transporters with their vehicles and drivers nested
  app.get("/api/admin/verification/overview", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allTransporters = await storage.getAllTransporters();
      const result = [];

      for (const transporter of allTransporters) {
        // Get transporter documents
        const transporterDocs = await storage.getTransporterDocuments(transporter.id).catch(() => []);

        // Get vehicles for this transporter
        const vehicles = await storage.getTransporterVehicles(transporter.id).catch(() => []);
        const vehiclesWithDocs = await Promise.all(vehicles.map(async (vehicle) => {
          const vehicleDocs = await storage.getVehicleDocuments(vehicle.id).catch(() => []);
          return {
            id: vehicle.id,
            plateNumber: vehicle.plateNumber,
            type: vehicle.type,
            model: vehicle.model,
            status: vehicle.status,
            createdAt: vehicle.createdAt,
            documents: vehicleDocs,
            pendingDocuments: vehicleDocs.filter(d => d.status === "pending").length,
            verifiedDocuments: vehicleDocs.filter(d => d.status === "verified").length,
            rejectedDocuments: vehicleDocs.filter(d => d.status === "rejected").length,
          };
        }));

        // Get drivers for this transporter
        const drivers = await storage.getUsersByTransporterAndRole(transporter.id, "driver").catch(() => []);
        const driversWithDocs = await Promise.all(drivers.map(async (driver) => {
          const allDriverDocs = await storage.getUserDocuments(driver.id).catch(() => []);
          const driverDocs = allDriverDocs.filter(d => d.entityType === "driver");
          return {
            id: driver.id,
            name: driver.name,
            phone: driver.phone,
            isSelfDriver: driver.isSelfDriver,
            documentsComplete: driver.documentsComplete,
            createdAt: driver.createdAt,
            documents: driverDocs,
            pendingDocuments: driverDocs.filter(d => d.status === "pending").length,
            verifiedDocuments: driverDocs.filter(d => d.status === "verified").length,
            rejectedDocuments: driverDocs.filter(d => d.status === "rejected").length,
          };
        }));

        // Calculate totals
        const allPendingDocs = transporterDocs.filter(d => d.status === "pending").length +
          vehiclesWithDocs.reduce((sum, v) => sum + v.pendingDocuments, 0) +
          driversWithDocs.reduce((sum, d) => sum + d.pendingDocuments, 0);

        const transporterType = transporter.transporterType === "business" ? "business" : "individual";

        // Check business docs readiness
        const businessDocs = checkRequiredDocs(transporterDocs, REQUIRED_TRANSPORTER_DOCS);
        const businessDocsVerified = businessDocs.allVerified;

        // Readiness checklist
        const hasMinimumVehicles = vehiclesWithDocs.length > 0;
        const hasMinimumDrivers = driversWithDocs.length > 0;

        // Entity readiness
        const allVehiclesReady = vehiclesWithDocs.length > 0 && vehiclesWithDocs.every(v =>
          v.documents.some(d => ((d.type as string) === "rc" || (d.type as string) === "registration") && d.status === "verified")
        );
        const allDriversReady = driversWithDocs.length > 0 && driversWithDocs.every(d =>
          d.documents.some(doc => (doc.type as string) === "license" && doc.status === "verified")
        );

        const isReadyForApproval = businessDocsVerified && allVehiclesReady && allDriversReady;

        result.push({
          id: transporter.id,
          companyName: transporter.companyName,
          ownerName: transporter.ownerName,
          contact: transporter.contact,
          email: transporter.email,
          status: transporter.status,
          verificationStatus: transporter.verificationStatus,
          transporterType,
          documentsComplete: transporter.documentsComplete,
          createdAt: transporter.createdAt,
          businessDocumentsStatus: transporterType === "individual" ? "not_required" : undefined,
          // Transporter's own documents
          documents: transporterDocs,
          pendingDocuments: transporterDocs.filter(d => d.status === "pending").length,
          verifiedDocuments: transporterDocs.filter(d => d.status === "verified").length,
          rejectedDocuments: transporterDocs.filter(d => d.status === "rejected").length,
          // Nested entities
          vehicles: vehiclesWithDocs,
          drivers: driversWithDocs,
          // Totals across all entities
          totalPendingAcrossAll: allPendingDocs,
          totalVehicles: vehiclesWithDocs.length,
          totalDrivers: driversWithDocs.length,
          activeVehicles: vehiclesWithDocs.filter(v => v.status === "active").length,
          // Readiness indicators
          readiness: {
            businessDocsVerified,
            hasMinimumVehicles,
            hasMinimumDrivers,
            allVehiclesReady,
            allDriversReady,
            isReadyForApproval
          }
        });
      }

      // Sort: most pending docs first, then by company name
      result.sort((a, b) => {
        if (a.totalPendingAcrossAll > 0 && b.totalPendingAcrossAll === 0) return -1;
        if (a.totalPendingAcrossAll === 0 && b.totalPendingAcrossAll > 0) return 1;
        return b.totalPendingAcrossAll - a.totalPendingAcrossAll;
      });

      res.json(result);
    } catch (error) {
      console.error("[admin] verification/overview failed:", error);
      res.json([]);
    }
  });

  // GET /api/admin/verification/transporters - Get transporters needing verification
  app.get("/api/admin/verification/transporters", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allTransporters = await storage.getAllTransporters();
      const result = [];

      for (const transporter of allTransporters) {
        const docs = await storage.getTransporterDocuments(transporter.id).catch(() => []);
        const pendingDocs = docs.filter(d => d.status === "pending");
        const verifiedDocs = docs.filter(d => d.status === "verified");
        const rejectedDocs = docs.filter(d => d.status === "rejected");

        // Calculate oldest pending document age
        let oldestPendingAge = null;
        if (pendingDocs.length > 0) {
          const oldestDoc = pendingDocs.reduce((oldest, doc) =>
            (doc.createdAt && (!oldest.createdAt || doc.createdAt < oldest.createdAt)) ? doc : oldest
          );
          if (oldestDoc.createdAt) {
            oldestPendingAge = Math.floor((Date.now() - new Date(oldestDoc.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        result.push({
          id: transporter.id,
          companyName: transporter.companyName,
          ownerName: transporter.ownerName,
          contact: transporter.contact,
          email: transporter.email,
          status: transporter.status,
          isVerified: transporter.verificationStatus === 'approved',
          documentsComplete: transporter.documentsComplete,
          createdAt: transporter.createdAt,
          totalDocuments: docs.length,
          pendingDocuments: pendingDocs.length,
          verifiedDocuments: verifiedDocs.length,
          rejectedDocuments: rejectedDocs.length,
          oldestPendingDocumentAge: oldestPendingAge,
          documents: docs
        });
      }

      // Sort: pending docs first, then by oldest pending age
      result.sort((a, b) => {
        if (a.pendingDocuments > 0 && b.pendingDocuments === 0) return -1;
        if (a.pendingDocuments === 0 && b.pendingDocuments > 0) return 1;
        if (a.oldestPendingDocumentAge !== null && b.oldestPendingDocumentAge !== null) {
          return b.oldestPendingDocumentAge - a.oldestPendingDocumentAge;
        }
        return 0;
      });

      res.json(result);
    } catch (error) {
      console.error("[admin] verification/transporters failed:", error);
      res.json([]);
    }
  });

  // GET /api/admin/verification/drivers - Get drivers needing verification
  app.get("/api/admin/verification/drivers", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allDrivers = await storage.getDrivers();
      const result = [];

      for (const driver of allDrivers) {
        const docs = await storage.getUserDocuments(driver.id).catch(() => []);
        const driverDocs = docs.filter(d => d.entityType === "driver");
        const pendingDocs = driverDocs.filter(d => d.status === "pending");
        const verifiedDocs = driverDocs.filter(d => d.status === "verified");
        const rejectedDocs = driverDocs.filter(d => d.status === "rejected");

        // Calculate oldest pending document age
        let oldestPendingAge = null;
        if (pendingDocs.length > 0) {
          const oldestDoc = pendingDocs.reduce((oldest, doc) =>
            (doc.createdAt && (!oldest.createdAt || doc.createdAt < oldest.createdAt)) ? doc : oldest
          );
          if (oldestDoc.createdAt) {
            oldestPendingAge = Math.floor((Date.now() - new Date(oldestDoc.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        // Get transporter info if assigned
        let transporterName = null;
        if (driver.transporterId) {
          const transporter = await storage.getTransporter(driver.transporterId).catch(() => null);
          transporterName = transporter?.companyName || null;
        }

        result.push({
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          email: driver.email,
          transporterId: driver.transporterId,
          transporterName,
          isSelfDriver: driver.isSelfDriver,
          documentsComplete: driver.documentsComplete,
          createdAt: driver.createdAt,
          totalDocuments: driverDocs.length,
          pendingDocuments: pendingDocs.length,
          verifiedDocuments: verifiedDocs.length,
          rejectedDocuments: rejectedDocs.length,
          oldestPendingDocumentAge: oldestPendingAge,
          documents: driverDocs
        });
      }

      // Sort: pending docs first, then by oldest pending age
      result.sort((a, b) => {
        if (a.pendingDocuments > 0 && b.pendingDocuments === 0) return -1;
        if (a.pendingDocuments === 0 && b.pendingDocuments > 0) return 1;
        if (a.oldestPendingDocumentAge !== null && b.oldestPendingDocumentAge !== null) {
          return b.oldestPendingDocumentAge - a.oldestPendingDocumentAge;
        }
        return 0;
      });

      res.json(result);
    } catch (error) {
      console.error("[admin] verification/drivers failed:", error);
      res.json([]);
    }
  });

  // GET /api/admin/verification/vehicles - Get vehicles needing verification
  app.get("/api/admin/verification/vehicles", requireAdmin, async (req: Request, res: Response) => {
    try {
      const allVehicles = await storage.getAllVehicles();
      const result = [];

      for (const vehicle of allVehicles) {
        const docs = await storage.getVehicleDocuments(vehicle.id).catch(() => []);
        const pendingDocs = docs.filter(d => d.status === "pending");
        const verifiedDocs = docs.filter(d => d.status === "verified");
        const rejectedDocs = docs.filter(d => d.status === "rejected");

        // Calculate oldest pending document age
        let oldestPendingAge = null;
        if (pendingDocs.length > 0) {
          const oldestDoc = pendingDocs.reduce((oldest, doc) =>
            (doc.createdAt && (!oldest.createdAt || doc.createdAt < oldest.createdAt)) ? doc : oldest
          );
          if (oldestDoc.createdAt) {
            oldestPendingAge = Math.floor((Date.now() - new Date(oldestDoc.createdAt).getTime()) / (1000 * 60 * 60 * 24));
          }
        }

        // Get transporter info
        let transporterName = null;
        if (vehicle.transporterId) {
          const transporter = await storage.getTransporter(vehicle.transporterId).catch(() => null);
          transporterName = transporter?.companyName || null;
        }

        result.push({
          id: vehicle.id,
          plateNumber: vehicle.plateNumber,
          type: vehicle.type,
          model: vehicle.model,
          capacity: vehicle.capacity,
          status: vehicle.status,
          transporterId: vehicle.transporterId,
          transporterName,
          createdAt: vehicle.createdAt,
          totalDocuments: docs.length,
          pendingDocuments: pendingDocs.length,
          verifiedDocuments: verifiedDocs.length,
          rejectedDocuments: rejectedDocs.length,
          oldestPendingDocumentAge: oldestPendingAge,
          documents: docs
        });
      }

      // Sort: pending docs first, then by oldest pending age
      result.sort((a, b) => {
        if (a.pendingDocuments > 0 && b.pendingDocuments === 0) return -1;
        if (a.pendingDocuments === 0 && b.pendingDocuments > 0) return 1;
        if (a.oldestPendingDocumentAge !== null && b.oldestPendingDocumentAge !== null) {
          return b.oldestPendingDocumentAge - a.oldestPendingDocumentAge;
        }
        return 0;
      });

      res.json(result);
    } catch (error) {
      console.error("[admin] verification/vehicles failed:", error);
      res.json([]);
    }
  });

  // GET /api/admin/verification/logs/:entityType/:entityId - Fetch audit timeline for any entity
  app.get("/api/admin/verification/logs/:entityType/:entityId", requireAdmin, async (req: Request, res: Response) => {
    const { entityType, entityId } = req.params;
    const allowedEntities = new Set(["transporter", "vehicle", "driver", "document"]);

    if (!allowedEntities.has(entityType)) {
      return res.status(400).json({ error: "Invalid entity type" });
    }

    try {
      const logs = await storage.getVerificationLogs(entityType, entityId);
      const performerIds = Array.from(new Set(logs.map((log) => log.performedBy).filter(Boolean)));
      const performerMap: Record<string, { name: string | null; email: string | null }> = {};

      if (performerIds.length > 0) {
        await Promise.all(
          performerIds.map(async (adminId) => {
            const adminUser = await storage.getUser(adminId);
            if (adminUser) {
              performerMap[adminId] = { name: adminUser.name, email: adminUser.email };
            }
          })
        );
      }

      res.json(
        logs.map((log) => ({
          ...log,
          performedByName: performerMap[log.performedBy]?.name ?? null,
          performedByEmail: performerMap[log.performedBy]?.email ?? null,
        }))
      );
    } catch (error) {
      console.error("[admin] verification/logs failed:", error);
      res.status(500).json({ error: "Failed to load verification logs" });
    }
  });

  // ============== PLATFORM SETTINGS (Super Admin Only) ==============

  app.get("/api/admin/platform-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);

      if (!sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Only Super Admins can view platform settings" });
      }

      const settings = await storage.getPlatformSettings();
      // Return settings or safe defaults if null
      res.json(settings ?? {
        commissionEnabled: false,
        commissionMode: "shadow",
        tierConfig: [],
        smsEnabled: false,
        smsMode: "shadow",
        smsProvider: null,
        smsTemplates: {}
      });
    } catch (error) {
      console.error("[admin] platform-settings failed:", error);
      // NEVER return 500 - return safe defaults with degraded flag
      res.json({
        commissionEnabled: false,
        commissionMode: "shadow",
        tierConfig: [],
        smsEnabled: false,
        smsMode: "shadow",
        smsProvider: null,
        smsTemplates: {},
        degraded: true
      });
    }
  });

  const optionalNumeric = z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.coerce.number().min(0).optional()
  );
  const optionalNumericPercent = z.preprocess(
    (val) => (val === "" || val === null || val === undefined) ? undefined : val,
    z.coerce.number().min(0).max(100).optional()
  );
  const tierEntrySchema = z.object({
    amount: z.coerce.number().min(1, "Tier amount must be at least 1"),
    percent: z.coerce.number().min(0.1, "Tier percent must be at least 0.1").max(100, "Tier percent cannot exceed 100")
  });
  const platformSettingsUpdateSchema = z.object({
    commissionEnabled: z.boolean().optional(),
    commissionMode: z.enum(["shadow", "live"]).optional(),
    tierConfig: z.array(tierEntrySchema).optional().transform(tiers => {
      if (!tiers || tiers.length === 0) return null;
      return tiers;
    }).refine(
      (tiers) => {
        if (!tiers) return true;
        const amounts = tiers.map(t => t.amount);
        const uniqueAmounts = new Set(amounts);
        if (uniqueAmounts.size !== amounts.length) return false;
        for (let i = 1; i < amounts.length; i++) {
          if (amounts[i] <= amounts[i - 1]) return false;
        }
        return true;
      },
      { message: "Tiers must have unique amounts in ascending order" }
    ),
    basePercent: optionalNumericPercent,
    minFee: optionalNumeric,
    maxFee: optionalNumeric,
    smsEnabled: z.boolean().optional(),
    smsMode: z.enum(["shadow", "live"]).optional(),
    smsProvider: z.enum(["msg91"]).nullable().optional(),
    smsTemplates: z.record(z.string(), z.string()).optional()
  }).passthrough();

  app.patch("/api/admin/platform-settings", requireAdmin, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);

      if (!sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Only Super Admins can update platform settings" });
      }

      const parseResult = platformSettingsUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid settings data", details: parseResult.error.errors });
      }

      const { commissionEnabled, commissionMode, tierConfig, basePercent, minFee, maxFee, smsEnabled, smsMode, smsProvider, smsTemplates } = parseResult.data;

      const updates: any = {};
      if (typeof commissionEnabled === "boolean") updates.commissionEnabled = commissionEnabled;
      if (commissionMode) updates.commissionMode = commissionMode;
      if ("tierConfig" in req.body) updates.tierConfig = tierConfig;
      if (basePercent !== undefined) updates.basePercent = String(basePercent);
      if (minFee !== undefined) updates.minFee = String(minFee);
      if (maxFee !== undefined) updates.maxFee = String(maxFee);
      if (typeof smsEnabled === "boolean") updates.smsEnabled = smsEnabled;
      if (smsMode) updates.smsMode = smsMode;
      if ("smsProvider" in req.body) updates.smsProvider = smsProvider;
      if (smsTemplates) updates.smsTemplates = smsTemplates;

      const updatedSettings = await storage.updatePlatformSettings(updates, sessionUser.id);

      if (updates.smsEnabled !== undefined || updates.smsMode !== undefined || updates.smsProvider !== undefined || updates.smsTemplates !== undefined) {
        const { invalidateSmsSettingsCache } = await import("./sms/smsService");
        invalidateSmsSettingsCache();
      }

      console.log(`[PlatformSettings] Updated by ${sessionUser.id}:`, updates);

      res.json(updatedSettings);
    } catch (error) {
      console.error("Failed to update platform settings:", error);
      res.status(500).json({ error: "Failed to update platform settings" });
    }
  });

  // Get calculated fees preview for a given amount (for admin testing)
  app.get("/api/admin/platform-settings/preview/:amount", requireAdmin, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);

      if (!sessionUser.isSuperAdmin) {
        return res.status(403).json({ error: "Only Super Admins can preview fee calculations" });
      }

      const amount = parseFloat(req.params.amount);
      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      const financials = await computeTripFinancialsWithSettings(amount);
      res.json(financials);
    } catch (error) {
      console.error("Failed to preview fee calculation:", error);
      res.status(500).json({ error: "Failed to preview fee calculation" });
    }
  });

  // ============== TRANSPORTER TRIP POSTING ==============

  // Create a trip with self-assign option
  app.post("/api/transporter/trips", requireAuth, requireTransporterWithVerification, async (req: Request, res: Response) => {
    try {
      const sessionUser = getCurrentUser(req);
      const isAdmin = sessionUser.isSuperAdmin || sessionUser.role === "admin";

      if (sessionUser.role !== "transporter" && !isAdmin) {
        return res.status(403).json({ error: "Only transporters can post trips" });
      }

      // For transporters, verify transporterId exists and matches database
      // For admins, they must provide transporterId in payload if doing self-assign
      const { selfAssign, assignedDriverId, assignedVehicleId, transporterId: payloadTransporterId, ...rideData } = req.body;

      let verifiedTransporterId: string | undefined;

      if (isAdmin) {
        // Admins must provide transporterId in payload if self-assigning
        if (selfAssign && !payloadTransporterId) {
          return res.status(400).json({ error: "Admins must specify transporterId in payload for self-assign" });
        }
        verifiedTransporterId = payloadTransporterId;
      } else {
        // For transporters, verify session transporterId against database
        if (!sessionUser.transporterId) {
          return res.status(400).json({ error: "No transporter associated with this user" });
        }

        // Defense-in-depth: verify against database
        try {
          const dbUser = await storage.getUser(sessionUser.id);
          if (!dbUser || !dbUser.transporterId) {
            return res.status(400).json({ error: "User has no valid transporter association" });
          }
          if (dbUser.transporterId !== sessionUser.transporterId) {
            console.error(`[SECURITY ALERT] Session transporterId mismatch in trip creation for user ${sessionUser.id}`);
            // Update session with correct transporterId
            if (req.session?.user) {
              req.session.user.transporterId = dbUser.transporterId;
            }
          }
          verifiedTransporterId = dbUser.transporterId;
        } catch (verifyError) {
          console.error(`[SECURITY] Failed to verify transporter in trip creation:`, verifyError);
          verifiedTransporterId = sessionUser.transporterId;
        }
      }

      // Check transporter verification
      if (verifiedTransporterId) {
        const transporter = await storage.getTransporter(verifiedTransporterId);
        if (transporter && transporter.verificationStatus !== 'approved') {
          return res.status(403).json({ error: "Transporter must be verified to post trips" });
        }
      }

      const parseResult = insertRideSchema.safeParse({
        ...rideData,
        createdById: sessionUser.id,
        transporterId: selfAssign ? verifiedTransporterId : undefined,
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
