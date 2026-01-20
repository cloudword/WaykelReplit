import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Transporter types enum
export const TRANSPORTER_TYPES = ["business", "individual"] as const;
export type TransporterType = typeof TRANSPORTER_TYPES[number];

// Onboarding status enum
export const ONBOARDING_STATUS = ["incomplete", "completed"] as const;
export type OnboardingStatus = typeof ONBOARDING_STATUS[number];

// Document verification status enum (for vehicles/drivers onboarding)
export const DOCUMENT_VERIFICATION_STATUS = [
  "document_missing",
  "verification_pending", 
  "approved",
  "rejected"
] as const;
export type DocumentVerificationStatus = typeof DOCUMENT_VERIFICATION_STATUS[number];

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
  entityId: text("entity_id").unique(),
  name: text("name").notNull(),
  username: text("username").unique(),
  email: text("email").unique(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().$type<"driver" | "transporter" | "admin" | "customer">(),
  isSuperAdmin: boolean("is_super_admin").default(false),
  transporterId: varchar("transporter_id"),
  isOnline: boolean("is_online").default(false),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
  totalTrips: integer("total_trips").default(0),
  earningsToday: decimal("earnings_today", { precision: 10, scale: 2 }).default("0"),
  documentsComplete: boolean("documents_complete").default(false),
  profileComplete: boolean("profile_complete").default(false),
  isSelfDriver: boolean("is_self_driver").default(false),
  documentStatus: text("document_status").$type<DocumentVerificationStatus>().default("document_missing"),
  isActiveForBidding: boolean("is_active_for_bidding").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

const baseInsertUserSchema = createInsertSchema(users).omit({ id: true, entityId: true, createdAt: true });
export const insertUserSchema = baseInsertUserSchema.extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Transporters table (companies/fleet owners)
// Status flow: pending_verification -> pending_approval -> active (or rejected at any stage)
export const transporters = pgTable("transporters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").unique(),
  companyName: text("company_name").notNull(),
  ownerName: text("owner_name").notNull(),
  contact: text("contact").notNull(),
  email: text("email").unique(),
  status: text("status").notNull().$type<"active" | "pending_approval" | "suspended" | "pending_verification" | "rejected">().default("pending_verification"),
  rejectionReason: text("rejection_reason"),
  fleetSize: integer("fleet_size").default(0),
  location: text("location").notNull(),
  basePincode: text("base_pincode"),
  baseCity: text("base_city"),
  servicePincodes: text("service_pincodes").array(),
  preferredRoutes: json("preferred_routes").$type<string[]>(),
  isOwnerOperator: boolean("is_owner_operator").default(false),
  ownerDriverUserId: varchar("owner_driver_user_id").references(() => users.id),
  documentsComplete: boolean("documents_complete").default(false),
  verificationStatus: text("verification_status").$type<"unverified" | "pending" | "approved" | "rejected" | "flagged">().default("unverified"),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  ownerOperatorVehicleId: varchar("owner_operator_vehicle_id"),
  executionPolicy: text("execution_policy").$type<"SELF_ONLY" | "ASSIGNED_DRIVER_ONLY" | "ANY_DRIVER">().default("ASSIGNED_DRIVER_ONLY"),
  // Onboarding fields
  transporterType: text("transporter_type").$type<TransporterType>().default("business"),
  onboardingStatus: text("onboarding_status").$type<OnboardingStatus>().default("incomplete"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransporterSchema = createInsertSchema(transporters).omit({ id: true, entityId: true, createdAt: true });
export type InsertTransporter = z.infer<typeof insertTransporterSchema>;
export type Transporter = typeof transporters.$inferSelect;

// Vehicles table
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id").unique(),
  userId: varchar("user_id").references(() => users.id),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  type: text("type").notNull(),
  plateNumber: text("plate_number").notNull().unique(),
  model: text("model").notNull(),
  capacity: text("capacity").notNull(),
  capacityKg: integer("capacity_kg"),
  capacityTons: decimal("capacity_tons", { precision: 10, scale: 2 }),
  vehicleCategory: text("vehicle_category"),
  vehicleTypeCode: text("vehicle_type_code"),
  bodyType: text("body_type"),
  lengthFt: integer("length_ft"),
  axleType: text("axle_type"),
  fuelType: text("fuel_type"),
  status: text("status").notNull().$type<"active" | "inactive" | "maintenance">().default("active"),
  currentLocation: text("current_location"),
  currentPincode: text("current_pincode"),
  // Document verification status for onboarding
  documentStatus: text("document_status").$type<DocumentVerificationStatus>().default("document_missing"),
  verificationStatus: text("verification_status").$type<"unverified" | "pending" | "approved" | "rejected" | "flagged">().default("unverified"),
  isActiveForBidding: boolean("is_active_for_bidding").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({ id: true, entityId: true, createdAt: true });
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Rides/Loads table
// TODO: Add database indexes for performance:
// CREATE INDEX idx_rides_status ON rides(status);
// CREATE INDEX idx_rides_created_by ON rides(created_by_id);
// CREATE INDEX idx_bids_ride_id ON bids(ride_id);
// CREATE INDEX idx_bids_user_id ON bids(user_id);
export const rides = pgTable("rides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pickupLocation: text("pickup_location").notNull(),
  dropLocation: text("drop_location").notNull(),
  pickupPincode: text("pickup_pincode"),
  dropPincode: text("drop_pincode"),
  pickupTime: text("pickup_time").notNull(),
  dropTime: text("drop_time"),
  date: text("date").notNull(),
  status: text("status").notNull().$type<"pending" | "bidding" | "accepted" | "assigned" | "active" | "pickup_done" | "delivery_done" | "completed" | "cancelled" | "scheduled">().default("pending"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  distance: text("distance").notNull(),
  cargoType: text("cargo_type").notNull(),
  weight: text("weight").notNull(),
  weightKg: integer("weight_kg"),
  weightTons: decimal("weight_tons", { precision: 10, scale: 2 }),
  weightUnit: text("weight_unit").$type<"kg" | "tons">().default("kg"),
  requiredVehicleType: text("required_vehicle_type"),
  requiredVehicleCategory: text("required_vehicle_category"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  incentive: decimal("incentive", { precision: 10, scale: 2 }),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  assignedDriverId: varchar("assigned_driver_id").references(() => users.id),
  assignedVehicleId: varchar("assigned_vehicle_id").references(() => vehicles.id),
  acceptedBidId: varchar("accepted_bid_id"),
  createdById: varchar("created_by_id").references(() => users.id),
  customerId: varchar("customer_id").references(() => users.id),
  customerEntityId: text("customer_entity_id"),
  biddingStatus: text("bidding_status").$type<"open" | "closed" | "self_assigned">().default("open"),
  acceptedByUserId: varchar("accepted_by_user_id").references(() => users.id),
  acceptedAt: timestamp("accepted_at"),
  isSelfAssigned: boolean("is_self_assigned").default(false),
  pickupCompleted: boolean("pickup_completed").default(false),
  pickupCompletedAt: timestamp("pickup_completed_at"),
  deliveryCompleted: boolean("delivery_completed").default(false),
  deliveryCompletedAt: timestamp("delivery_completed_at"),
  finalPrice: decimal("final_price", { precision: 10, scale: 2 }),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }),
  transporterEarning: decimal("transporter_earning", { precision: 10, scale: 2 }),
  platformFeePercent: decimal("platform_fee_percent", { precision: 5, scale: 2 }),
  shadowPlatformFee: decimal("shadow_platform_fee", { precision: 10, scale: 2 }),
  shadowPlatformFeePercent: decimal("shadow_platform_fee_percent", { precision: 5, scale: 2 }),
  paymentStatus: text("payment_status").$type<"pending" | "invoiced" | "paid" | "settled" | "disputed" | "refunded">().default("pending"),
  financialLockedAt: timestamp("financial_locked_at"),
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

// Ledger entries for trip economics
export const LEDGER_ENTRY_TYPES = [
  "trip_revenue",
  "platform_fee",
  "transporter_payout",
  "customer_payment",
  "refund",
  "adjustment",
  "incentive",
  "penalty"
] as const;
export type LedgerEntryType = typeof LEDGER_ENTRY_TYPES[number];

export const ledgerEntries = pgTable("ledger_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  rideId: varchar("ride_id").references(() => rides.id).notNull(),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  entryType: text("entry_type").notNull().$type<LedgerEntryType>(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  referenceId: varchar("reference_id"),
  referenceType: text("reference_type"),
  balanceBefore: decimal("balance_before", { precision: 12, scale: 2 }),
  balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries).omit({ id: true, createdAt: true });
export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;

// Document types enum
export const DOCUMENT_TYPES = [
  "license",
  "aadhar", 
  "pan",
  "insurance",
  "fitness",
  "registration",
  "rc",
  "permit",
  "pollution",
  "gst_certificate",
  "msme_certificate",
  "shop_act_license",
  "business_registration",
  "trade_license",
  "bank_details",
  "company_pan",
  "address_proof",
  "photo",
  "police_verification",
] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

// Documents table
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityId: text("entity_id"),
  userId: varchar("user_id").references(() => users.id),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  customerId: varchar("customer_id").references(() => users.id),
  rideId: varchar("ride_id").references(() => rides.id),
  entityType: text("entity_type").notNull().$type<"driver" | "vehicle" | "transporter" | "customer" | "trip">(),
  type: text("type").notNull().$type<DocumentType>(),
  documentName: text("document_name").notNull(),
  url: text("url").notNull(),
  storagePath: text("storage_path"),
  expiryDate: text("expiry_date"),
  status: text("status").notNull().$type<"verified" | "pending" | "expired" | "rejected" | "replaced" | "deleted">().default("pending"),
  verificationStatus: text("verification_status").$type<"unverified" | "pending" | "approved" | "rejected" | "flagged">().default("unverified"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  replacedById: varchar("replaced_by_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// Notification type enums for domain model
export const NOTIFICATION_TYPES = ["trip", "bid", "document", "account", "system"] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

export const ACTION_TYPES = ["info", "action_required", "success", "warning"] as const;
export type ActionType = typeof ACTION_TYPES[number];

export const NOTIFICATION_ENTITY_TYPES = ["trip", "bid", "document"] as const;
export type NotificationEntityType = typeof NOTIFICATION_ENTITY_TYPES[number];

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
  notificationType: text("notification_type").$type<NotificationType>(),
  actionType: text("action_type").$type<ActionType>(),
  entityType: text("entity_type").$type<NotificationEntityType>(),
  entityId: varchar("entity_id"),
  deepLink: text("deep_link"),
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

// Roles table for RBAC
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: json("permissions").$type<string[]>().default([]),
  isSystem: boolean("is_system").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// User Roles junction table
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  roleId: varchar("role_id").references(() => roles.id).notNull(),
  assignedBy: varchar("assigned_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true, createdAt: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

// Available permissions
export const PERMISSIONS = [
  "approve_transporters",
  "approve_drivers", 
  "manage_bids",
  "accept_bids",
  "view_reports",
  "manage_users",
  "manage_roles",
  "manage_rides",
  "view_api_logs",
  "manage_documents",
  "manage_vehicles",
] as const;
export type Permission = typeof PERMISSIONS[number];

// Saved addresses for transporters and customers
export const savedAddresses = pgTable("saved_addresses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  transporterId: varchar("transporter_id").references(() => transporters.id),
  userId: varchar("user_id").references(() => users.id),
  label: text("label").notNull(),
  address: text("address").notNull(),
  pincode: text("pincode"),
  city: text("city"),
  state: text("state"),
  isDefault: boolean("is_default").default(false),
  addressType: text("address_type").$type<"pickup" | "drop" | "both">().default("both"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedAddressSchema = createInsertSchema(savedAddresses).omit({ id: true, createdAt: true });
export type InsertSavedAddress = z.infer<typeof insertSavedAddressSchema>;
export type SavedAddress = typeof savedAddresses.$inferSelect;

// Driver job applications (for drivers not part of any transporter)
export const driverApplications = pgTable("driver_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => users.id).notNull(),
  profileSummary: text("profile_summary"),
  experience: text("experience"),
  preferredVehicleTypes: json("preferred_vehicle_types").$type<string[]>(),
  preferredLocations: json("preferred_locations").$type<string[]>(),
  expectedSalary: text("expected_salary"),
  availability: text("availability").$type<"immediate" | "1_week" | "2_weeks" | "1_month">(),
  status: text("status").$type<"active" | "hired" | "withdrawn" | "inactive">().default("active"),
  documentsComplete: boolean("documents_complete").default(false),
  acceptedByTransporterId: varchar("accepted_by_transporter_id").references(() => transporters.id),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDriverApplicationSchema = createInsertSchema(driverApplications).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDriverApplication = z.infer<typeof insertDriverApplicationSchema>;
export type DriverApplication = typeof driverApplications.$inferSelect;

// Document requirement configuration type
export type DocumentRequirementConfig = {
  type: string;
  label: string;
  required: boolean;
  description?: string;
};

// Platform Settings (singleton table for monetization control)
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default("default"),
  commissionEnabled: boolean("commission_enabled").default(false),
  commissionMode: text("commission_mode").$type<"shadow" | "live">().default("shadow"),
  tierConfig: json("tier_config").$type<{ amount: number; percent: number }[]>().default([
    { amount: 5000, percent: 10 },
    { amount: 10000, percent: 8 },
    { amount: 25000, percent: 6 },
    { amount: 50000, percent: 5 }
  ]),
  basePercent: decimal("base_percent", { precision: 5, scale: 2 }).default("10"),
  minFee: decimal("min_fee", { precision: 10, scale: 2 }).default("50"),
  maxFee: decimal("max_fee", { precision: 10, scale: 2 }).default("5000"),
  smsEnabled: boolean("sms_enabled").default(false),
  smsMode: text("sms_mode").$type<"shadow" | "live">().default("shadow"),
  smsProvider: text("sms_provider").$type<"msg91" | null>().default(null),
  smsTemplates: json("sms_templates").$type<Record<string, string>>().default({}),
  businessDocRequirements: json("business_doc_requirements").$type<DocumentRequirementConfig[]>().default([
    { type: "business_registration", label: "Business Registration", required: true, description: "GST Certificate or MSME Certificate" },
    { type: "gst_certificate", label: "GST Certificate", required: false },
    { type: "pan_card", label: "PAN Card", required: false },
  ]),
  vehicleDocRequirements: json("vehicle_doc_requirements").$type<DocumentRequirementConfig[]>().default([
    { type: "rc", label: "Registration Certificate (RC)", required: true, description: "Vehicle registration document" },
    { type: "insurance", label: "Insurance", required: false },
    { type: "permit", label: "Permit", required: false },
    { type: "fitness", label: "Fitness Certificate", required: false },
    { type: "pollution", label: "Pollution Certificate", required: false },
  ]),
  driverDocRequirements: json("driver_doc_requirements").$type<DocumentRequirementConfig[]>().default([
    { type: "driving_license", label: "Driving License", required: true, description: "Valid driving license" },
    { type: "aadhar", label: "Aadhar Card", required: false },
    { type: "pan", label: "PAN Card", required: false },
    { type: "photo", label: "Photo", required: false },
  ]),
  updatedByAdminId: varchar("updated_by_admin_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPlatformSettingsSchema = createInsertSchema(platformSettings).omit({ createdAt: true });
export type InsertPlatformSettings = z.infer<typeof insertPlatformSettingsSchema>;
export type PlatformSettings = typeof platformSettings.$inferSelect;

// OTP for phone verification
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: varchar("phone", { length: 15 }).notNull(),
  otpHash: varchar("otp_hash", { length: 255 }).notNull(),
  purpose: text("purpose").$type<"login" | "forgot_password" | "verify_phone">().notNull(),
  attempts: integer("attempts").default(0),
  verified: boolean("verified").default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodes).omit({ id: true, createdAt: true });
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodes.$inferSelect;
