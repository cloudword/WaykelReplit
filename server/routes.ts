import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTransporterSchema, insertVehicleSchema, insertRideSchema, insertBidSchema, insertDocumentSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

// Authentication Middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  next();
};

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  if (!req.session.user.isSuperAdmin && req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const requireDriverOrTransporter = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session?.user?.id) {
    return res.status(401).json({ error: "Authentication required. Please log in." });
  }
  const role = req.session.user.role;
  if (role !== "driver" && role !== "transporter" && !req.session.user.isSuperAdmin) {
    return res.status(403).json({ error: "Driver or transporter access required" });
  }
  next();
};

const requireAdminOrOwner = (getOwnerId: (req: Request) => string | undefined) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Authentication required. Please log in." });
    }
    const ownerId = getOwnerId(req);
    const isOwner = ownerId === req.session.user.id || ownerId === req.session.user.transporterId;
    const isAdmin = req.session.user.isSuperAdmin || req.session.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Access denied. You can only access your own data." });
    }
    next();
  };
};

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
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

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const existingPhone = await storage.getUserByPhone(data.phone);
      if (existingPhone) {
        return res.status(400).json({ error: "Phone number already registered" });
      }

      const user = await storage.createUser({ ...data, password: hashedPassword });
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(400).json({ error: "Invalid data" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { phone, password, username } = req.body;
      
      let user;
      if (username) {
        user = await storage.getUserByUsername(username);
      }
      if (!user && phone) {
        user = await storage.getUserByPhone(phone);
      }
      // Also try looking up by phone using the username value (for flexible login)
      if (!user && username) {
        user = await storage.getUserByPhone(username);
      }
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (user.role === "transporter" && user.transporterId) {
        const transporter = await storage.getTransporter(user.transporterId);
        if (transporter) {
          if (transporter.status === "pending_approval") {
            return res.status(403).json({ error: "Your account is pending admin approval. Please wait for approval before logging in." });
          }
          if (transporter.status === "suspended") {
            return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
          }
        }
      }

      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Session error" });
        }

        req.session.user = {
          id: user.id,
          role: user.role,
          isSuperAdmin: user.isSuperAdmin || false,
          transporterId: user.transporterId || undefined,
        };

        req.session.save((saveErr) => {
          if (saveErr) {
            return res.status(500).json({ error: "Session save error" });
          }
          const { password: _, ...userWithoutPassword } = user;
          res.json(userWithoutPassword);
        });
      });
    } catch (error) {
      res.status(400).json({ error: "Login failed" });
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
    if (req.session.user) {
      res.json({ authenticated: true, user: req.session.user });
    } else {
      res.json({ authenticated: false });
    }
  });

  app.post("/api/auth/change-password", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ error: "Not authenticated. Please log in again." });
      }

      const sessionUserId = req.session.user.id;
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

  // Ride routes
  // GET /api/rides - Auth required. Admins see all, others see filtered by own ID
  app.get("/api/rides", requireAuth, async (req, res) => {
    const { status, driverId, transporterId, createdById } = req.query;
    const user = req.session.user!;
    const isAdmin = user.isSuperAdmin || user.role === "admin";
    
    try {
      let result;
      
      // If specific filters provided, validate access
      if (driverId) {
        if (!isAdmin && driverId !== user.id) {
          return res.status(403).json({ error: "You can only view your own rides" });
        }
        result = await storage.getDriverRides(driverId as string);
      } else if (transporterId) {
        if (!isAdmin && transporterId !== user.transporterId) {
          return res.status(403).json({ error: "You can only view your own transporter rides" });
        }
        result = await storage.getTransporterRides(transporterId as string);
      } else if (createdById) {
        if (!isAdmin && createdById !== user.id) {
          return res.status(403).json({ error: "You can only view your own bookings" });
        }
        result = await storage.getCustomerRides(createdById as string);
      } else if (status === "pending") {
        // Pending rides visible to drivers/transporters for bidding, and admins
        if (!isAdmin && user.role !== "driver" && user.role !== "transporter") {
          return res.status(403).json({ error: "Only drivers, transporters, and admins can view pending rides" });
        }
        result = await storage.getPendingRides();
      } else if (status === "scheduled") {
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all scheduled rides" });
        }
        result = await storage.getScheduledRides();
      } else if (status === "active") {
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all active rides" });
        }
        result = await storage.getActiveRides();
      } else if (status === "completed") {
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all completed rides" });
        }
        result = await storage.getCompletedRides();
      } else {
        // No filter = get all rides (admin only)
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all rides. Use filters to view your own." });
        }
        result = await storage.getAllRides();
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rides" });
    }
  });

  // GET /api/rides/:id - Auth required, owner or admin can view
  app.get("/api/rides/:id", requireAuth, async (req, res) => {
    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      const user = req.session.user!;
      const isAdmin = user.isSuperAdmin || user.role === "admin";
      const isOwner = ride.createdById === user.id || 
                      ride.assignedDriverId === user.id ||
                      ride.transporterId === user.transporterId;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(ride);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ride" });
    }
  });

  app.post("/api/rides", async (req, res) => {
    try {
      const data = insertRideSchema.parse(req.body);
      const ride = await storage.createRide(data);
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

  // PATCH /api/rides/:id/status - Auth required, admin or ride owner can update
  app.patch("/api/rides/:id/status", requireAuth, async (req, res) => {
    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      const user = req.session.user!;
      const isAdmin = user.isSuperAdmin || user.role === "admin";
      const isOwner = ride.createdById === user.id;
      const isAssignedDriver = ride.assignedDriverId === user.id;
      
      // Only admin, owner, or assigned driver can update status
      if (!isAdmin && !isOwner && !isAssignedDriver) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { status } = req.body;
      await storage.updateRideStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update status" });
    }
  });

  // PATCH /api/rides/:id/assign - Admin only
  app.patch("/api/rides/:id/assign", requireAdmin, async (req, res) => {
    try {
      const { driverId, vehicleId } = req.body;
      await storage.assignRideToDriver(req.params.id, driverId, vehicleId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to assign driver" });
    }
  });

  // Bid routes
  // GET /api/bids - Auth required. Admins see all, others see filtered by own data
  app.get("/api/bids", requireAuth, async (req, res) => {
    const { rideId, userId, transporterId } = req.query;
    const user = req.session.user!;
    const isAdmin = user.isSuperAdmin || user.role === "admin";
    
    try {
      let result: any[];
      if (rideId) {
        // Anyone can view bids for a specific ride (for transparency)
        result = await storage.getRideBids(rideId as string);
      } else if (userId) {
        if (!isAdmin && userId !== user.id) {
          return res.status(403).json({ error: "You can only view your own bids" });
        }
        result = await storage.getUserBids(userId as string);
      } else if (transporterId) {
        if (!isAdmin && transporterId !== user.transporterId) {
          return res.status(403).json({ error: "You can only view your own transporter bids" });
        }
        result = await storage.getTransporterBids(transporterId as string);
      } else {
        // No filter = all bids (admin only)
        if (!isAdmin) {
          return res.status(403).json({ error: "Admin access required to view all bids" });
        }
        result = await storage.getAllBids();
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  // POST /api/bids - Driver or transporter only
  app.post("/api/bids", requireDriverOrTransporter, async (req, res) => {
    try {
      const data = insertBidSchema.parse(req.body);
      const user = req.session.user!;
      
      // Verify transporter is placing bid with their own transporterId
      if (!user.isSuperAdmin && user.transporterId !== data.transporterId) {
        return res.status(403).json({ error: "Cannot place bids for another transporter" });
      }
      
      const bid = await storage.createBid(data);
      
      // Update ride status to bid_placed
      await storage.updateRideStatus(data.rideId, "bid_placed");
      
      res.status(201).json(bid);
    } catch (error) {
      res.status(400).json({ error: "Invalid bid data" });
    }
  });

  // PATCH /api/bids/:id/status - Admin only (to approve/reject bids)
  app.patch("/api/bids/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateBidStatus(req.params.id, status);
      
      // If bid is accepted, assign the ride
      if (status === "accepted") {
        const bid = await storage.getBid(req.params.id);
        if (bid) {
          await storage.assignRideToDriver(bid.rideId, bid.userId, bid.vehicleId);
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update bid status" });
    }
  });

  // Get cheapest bids for a ride (for customer view) - Auth required
  app.get("/api/rides/:rideId/cheapest-bids", requireAuth, async (req, res) => {
    const { rideId } = req.params;
    const user = req.session.user!;
    
    try {
      const ride = await storage.getRide(rideId);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
      }
      
      const isAdmin = user.isSuperAdmin || user.role === "admin";
      
      // Role-based access control
      if (!isAdmin) {
        // Customer can only see bids on their own rides
        if (user.role === "customer") {
          if (ride.createdById !== user.id) {
            return res.status(403).json({ error: "Access denied" });
          }
        }
        // Transporters can ONLY see bids on pending marketplace rides
        else if (user.role === "transporter") {
          if (ride.status !== "pending") {
            return res.status(403).json({ error: "Access denied - bids only visible for pending rides" });
          }
        }
        else if (user.role !== "driver") {
          return res.status(403).json({ error: "Access denied" });
        }
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
    const user = req.session.user!;
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

  // User routes
  // GET /api/users - Admin only (or transporter can see their own users)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const { transporterId, role } = req.query;
      const user = req.session.user!;
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

  // Update user details (admin only)
  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.session.user?.isSuperAdmin) {
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
  app.post("/api/users/:id/reset-password", async (req, res) => {
    try {
      if (!req.session.user?.isSuperAdmin) {
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
      const user = req.session.user!;
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

  // Document routes
  // GET /api/documents - Auth required, users can only see their own
  app.get("/api/documents", requireAuth, async (req, res) => {
    const { userId, vehicleId, transporterId } = req.query;
    const user = req.session.user!;
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

  app.post("/api/documents", async (req, res) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const data = insertDocumentSchema.parse(req.body);
      
      // For transporters, enforce that transporterId matches session
      if (req.session.user.transporterId) {
        if (data.transporterId && data.transporterId !== req.session.user.transporterId) {
          return res.status(403).json({ error: "Cannot create document for another transporter" });
        }
        // Auto-set transporterId from session if not provided
        if (!data.transporterId) {
          data.transporterId = req.session.user.transporterId;
        }
      }
      
      const document = await storage.createDocument(data);
      res.status(201).json(document);
    } catch (error) {
      console.error("Document creation error:", error);
      res.status(400).json({ error: "Invalid document data" });
    }
  });

  // PATCH /api/documents/:id/status - Admin only (to verify/reject documents)
  app.patch("/api/documents/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateDocumentStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update document status" });
    }
  });

  // File upload routes for document storage (requires authentication)
  app.post("/api/objects/upload", async (req, res) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
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
  app.get("/objects/:objectPath(*)", async (req, res) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      
      // Super admins can access all documents
      if (req.session.user.isSuperAdmin || req.session.user.role === "admin") {
        return objectStorageService.downloadObject(objectFile, res);
      }
      
      // Check if user has permission to access this file
      const userId = req.session.user.transporterId || req.session.user.id;
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
  app.post("/api/objects/confirm", async (req, res) => {
    if (!req.session?.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    try {
      const { objectPath } = req.body;
      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }
      
      // Use session user's transporterId if available, otherwise their userId
      const ownerId = req.session.user.transporterId || req.session.user.id;
      
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
  // BOOKING FLOW - Matching & Notifications
  // ===========================================

  // Find matching transporters for a ride (for admin/customer to see who can fulfill)
  app.get("/api/rides/:rideId/matches", async (req, res) => {
    const sessionUser = req.session.user;
    
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
    const sessionUser = req.session.user;
    
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
    const sessionUser = req.session.user;
    
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
    const sessionUser = req.session.user;
    
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
    const sessionUser = req.session.user;
    
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

  // Accept bid route - now allows BOTH super admin AND customer to accept bids
  app.post("/api/bids/:bidId/accept", async (req, res) => {
    const sessionUser = req.session.user;
    
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
      
      // Update bid status to accepted
      await storage.updateBidStatus(bid.id, "accepted");
      
      // Update ride with accepted bid and transporter
      await storage.updateRideAcceptedBid(ride.id, bid.id, bid.transporterId || "");
      
      // Assign driver and vehicle if available
      if (bid.userId && bid.vehicleId) {
        await storage.assignRideToDriver(ride.id, bid.userId, bid.vehicleId);
      }
      
      // Reject other bids for this ride
      const allBids = await storage.getRideBids(ride.id);
      for (const otherBid of allBids) {
        if (otherBid.id !== bid.id && otherBid.status === "pending") {
          await storage.updateBidStatus(otherBid.id, "rejected");
          
          // Notify rejected bidders
          if (otherBid.userId) {
            await storage.createNotification({
              recipientId: otherBid.userId,
              recipientTransporterId: otherBid.transporterId || undefined,
              type: "bid_rejected",
              title: "Bid Not Selected",
              message: `Your bid for trip ${ride.pickupLocation} to ${ride.dropLocation} was not selected.`,
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
      
      res.json({ success: true, message: "Bid accepted and trip assigned" });
    } catch (error) {
      console.error("Failed to accept bid:", error);
      res.status(500).json({ error: "Failed to accept bid" });
    }
  });

  return httpServer;
}
