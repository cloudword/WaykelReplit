import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Vehicle types enum for matching
export const VEHICLE_TYPES = [
  "mini_truck",
  "pickup",
  "small_truck", 
  "medium_truck",
  "large_truck",
  "trailer",
  "container",
  "tanker",
  "refrigerated",
  "flatbed",
  "tipper",
  "other"
] as const;
export type VehicleType = typeof VEHICLE_TYPES[number];

// Users table (drivers, transporters, admins)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<"driver" | "transporter" | "admin" | "customer">(),
  isSuperAdmin: boolean("is_super_admin").default(false),
  transporterId: varchar("transporter_id"),
  isOnline: boolean("is_online").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalTrips: integer("total_trips").default(0),
  earningsToday: decimal("earnings_today", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Transporters table (companies/fleet owners)
export const transporters = pgTable("transporters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  ownerName: text("owner_name").notNull(),
  contact: text("contact").notNull(),
  email: text("email").notNull().unique(),
  status: text("status").notNull().$type<"active" | "pending_approval" | "suspended">().default("pending_approval"),
  fleetSize: integer("fleet_size").default(0),
  location: text("location").notNull(),
  basePincode: text("base_pincode"),
  baseCity: text("base_city"),
  servicePincodes: text("service_pincodes").array(),
  preferredRoutes: json("preferred_routes").$type<string[]>(),
  isOwnerOperator: boolean("is_owner_operator").default(false),
  ownerDriverUserId: varchar("owner_driver_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransporterSchema = createInsertSchema(transporters).omit({ id: true, createdAt: true });
export type InsertTransporter = z.infer<typeof insertTransporterSchema>;
export type Transporter = typeof transporters.$inferSelect;

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  type: text("type").notNull(),
  plateNumber: text("plate_number").notNull().unique(),
  model: text("model").notNull(),
  capacity: text("capacity").notNull(),
  capacityKg: integer("capacity_kg"),
  status: text("status").notNull().$type<"active" | "inactive" | "maintenance">().default("active"),
  currentLocation: text("current_location"),
  currentPincode: text("current_pincode"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Rides/Loads table
export const rides = pgTable("rides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pickupLocation: text("pickup_location").notNull(),
  dropLocation: text("drop_location").notNull(),
  pickupPincode: text("pickup_pincode"),
  dropPincode: text("drop_pincode"),
  pickupTime: text("pickup_time").notNull(),
  dropTime: text("drop_time"),
  date: text("date").notNull(),
  status: text("status").notNull().$type<"pending" | "active" | "completed" | "cancelled" | "scheduled" | "bid_placed" | "assigned">().default("pending"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  distance: text("distance").notNull(),
  cargoType: text("cargo_type").notNull(),
  weight: text("weight").notNull(),
  weightKg: integer("weight_kg"),
  requiredVehicleType: text("required_vehicle_type"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  incentive: decimal("incentive", { precision: 10, scale: 2 }),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  assignedDriverId: varchar("assigned_driver_id").references(() => users.id),
  assignedVehicleId: varchar("assigned_vehicle_id").references(() => vehicles.id),
  acceptedBidId: varchar("accepted_bid_id"),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRideSchema = createInsertSchema(rides).omit({ id: true, createdAt: true });
export type InsertRide = z.infer<typeof insertRideSchema>;
export type Ride = typeof rides.$inferSelect;

// Bids table
export const bids = pgTable("bids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").references(() => rides.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().$type<"pending" | "accepted" | "rejected">().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBidSchema = createInsertSchema(bids).omit({ id: true, createdAt: true });
export type InsertBid = z.infer<typeof insertBidSchema>;
export type Bid = typeof bids.$inferSelect;

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  entityType: text("entity_type").notNull().$type<"driver" | "vehicle" | "transporter">(),
  type: text("type").notNull().$type<"license" | "aadhar" | "pan" | "insurance" | "fitness" | "registration" | "rc" | "permit" | "pollution">(),
  documentName: text("document_name").notNull(),
  url: text("url").notNull(),
  expiryDate: text("expiry_date"),
  status: text("status").notNull().$type<"verified" | "pending" | "expired" | "rejected">().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Notifications table for booking alerts
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientId: varchar("recipient_id").references(() => users.id).notNull(),
  recipientTransporterId: varchar("recipient_transporter_id").references(() => transporters.id),
  type: text("type").notNull().$type<"new_booking" | "bid_placed" | "bid_accepted" | "bid_rejected" | "ride_assigned" | "ride_completed" | "system">(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  rideId: varchar("ride_id").references(() => rides.id),
  bidId: varchar("bid_id").references(() => bids.id),
  isRead: boolean("is_read").default(false),
  matchScore: integer("match_score"),
  matchReason: text("match_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// API Logs table for tracking all API requests
export const apiLogs = pgTable("api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code"),
  userId: varchar("user_id"),
  userRole: text("user_role"),
  origin: text("origin"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  requestBody: json("request_body"),
  responseTime: integer("response_time"),
  errorMessage: text("error_message"),
  isExternal: boolean("is_external").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertApiLogSchema = createInsertSchema(apiLogs).omit({ id: true, createdAt: true });
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;
