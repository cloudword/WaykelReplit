import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertTransporterSchema, insertVehicleSchema, insertRideSchema, insertBidSchema } from "@shared/schema";
import bcrypt from "bcrypt";

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
  app.get("/api/rides", async (req, res) => {
    const { status, driverId } = req.query;
    
    try {
      let result;
      if (driverId) {
        result = await storage.getDriverRides(driverId as string);
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
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rides" });
    }
  });

  app.get("/api/rides/:id", async (req, res) => {
    try {
      const ride = await storage.getRide(req.params.id);
      if (!ride) {
        return res.status(404).json({ error: "Ride not found" });
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
    } catch (error) {
      res.status(400).json({ error: "Invalid ride data" });
    }
  });

  app.patch("/api/rides/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateRideStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update status" });
    }
  });

  app.patch("/api/rides/:id/assign", async (req, res) => {
    try {
      const { driverId, vehicleId } = req.body;
      await storage.assignRideToDriver(req.params.id, driverId, vehicleId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to assign driver" });
    }
  });

  // Bid routes
  app.get("/api/bids", async (req, res) => {
    const { rideId, userId } = req.query;
    
    try {
      let result: any[];
      if (rideId) {
        result = await storage.getRideBids(rideId as string);
      } else if (userId) {
        result = await storage.getUserBids(userId as string);
      } else {
        result = await storage.getAllBids();
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bids" });
    }
  });

  app.post("/api/bids", async (req, res) => {
    try {
      const data = insertBidSchema.parse(req.body);
      const bid = await storage.createBid(data);
      
      // Update ride status to bid_placed
      await storage.updateRideStatus(data.rideId, "bid_placed");
      
      res.status(201).json(bid);
    } catch (error) {
      res.status(400).json({ error: "Invalid bid data" });
    }
  });

  app.patch("/api/bids/:id/status", async (req, res) => {
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

  // Vehicle routes
  app.get("/api/vehicles", async (req, res) => {
    const { userId, transporterId } = req.query;
    
    try {
      let result: any[] = [];
      if (userId) {
        result = await storage.getUserVehicles(userId as string);
      } else if (transporterId) {
        result = await storage.getTransporterVehicles(transporterId as string);
      }
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const data = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(data);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ error: "Invalid vehicle data" });
    }
  });

  // Transporter routes
  app.get("/api/transporters", async (req, res) => {
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

  app.post("/api/transporters", async (req, res) => {
    try {
      const data = insertTransporterSchema.parse(req.body);
      const transporter = await storage.createTransporter(data);
      res.status(201).json(transporter);
    } catch (error) {
      res.status(400).json({ error: "Invalid transporter data" });
    }
  });

  app.patch("/api/transporters/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      await storage.updateTransporterStatus(req.params.id, status);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update transporter status" });
    }
  });

  // User routes
  app.patch("/api/users/:id/online-status", async (req, res) => {
    try {
      const { isOnline } = req.body;
      await storage.updateUserOnlineStatus(req.params.id, isOnline);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to update online status" });
    }
  });

  return httpServer;
}
