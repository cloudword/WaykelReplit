import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table (drivers, transporters, admins)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<"driver" | "transporter" | "admin" | "customer">(),
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
  baseCity: text("base_city"),
  preferredRoutes: json("preferred_routes").$type<string[]>(),
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
  status: text("status").notNull().$type<"active" | "inactive" | "maintenance">().default("active"),
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
  pickupTime: text("pickup_time").notNull(),
  dropTime: text("drop_time"),
  date: text("date").notNull(),
  status: text("status").notNull().$type<"pending" | "active" | "completed" | "cancelled" | "scheduled" | "bid_placed">().default("pending"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  distance: text("distance").notNull(),
  cargoType: text("cargo_type").notNull(),
  weight: text("weight").notNull(),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  incentive: decimal("incentive", { precision: 10, scale: 2 }),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  assignedDriverId: varchar("assigned_driver_id").references(() => users.id),
  assignedVehicleId: varchar("assigned_vehicle_id").references(() => vehicles.id),
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
  type: text("type").notNull().$type<"license" | "aadhar" | "insurance" | "fitness" | "registration">(),
  url: text("url").notNull(),
  expiryDate: text("expiry_date"),
  status: text("status").notNull().$type<"verified" | "pending" | "expired">().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
