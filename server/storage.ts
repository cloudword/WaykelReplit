import { 
  users, vehicles, rides, bids, transporters, documents, notifications, apiLogs,
  roles, userRoles, savedAddresses, driverApplications, ledgerEntries, platformSettings, otpCodes,
  type User, type InsertUser,
  type Vehicle, type InsertVehicle,
  type Ride, type InsertRide,
  type Bid, type InsertBid,
  type Transporter, type InsertTransporter,
  type Document, type InsertDocument,
  type Notification, type InsertNotification,
  type ApiLog, type InsertApiLog,
  type Role, type InsertRole,
  type UserRole, type InsertUserRole,
  type SavedAddress, type InsertSavedAddress,
  type DriverApplication, type InsertDriverApplication,
  type LedgerEntry, type InsertLedgerEntry,
  type PlatformSettings, type InsertPlatformSettings,
  type OtpCode, type InsertOtpCode
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, or, sql, gte, inArray, not } from "drizzle-orm";

export function sanitizeRequestBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  
  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'apikey', 'api_key'];
  const sanitized: any = Array.isArray(body) ? [] : {};
  
  for (const key of Object.keys(body)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof body[key] === 'object' && body[key] !== null) {
      sanitized[key] = sanitizeRequestBody(body[key]);
    } else {
      sanitized[key] = body[key];
    }
  }
  
  return sanitized;
}

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getSuperAdmins(): Promise<User[]>;
  getCustomers(): Promise<User[]>;
  getDrivers(): Promise<User[]>;
  getUsersByTransporter(transporterId: string): Promise<User[]>;
  getUsersByTransporterAndRole(transporterId: string, role: string): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  updateUserPassword(id: string, hashedPassword: string): Promise<void>;
  updateUser(id: string, updates: { name?: string; email?: string; phone?: string; role?: string; isSelfDriver?: boolean }): Promise<User | undefined>;
  
  // Transporters
  getTransporter(id: string): Promise<Transporter | undefined>;
  getAllTransporters(): Promise<Transporter[]>;
  getAllTransportersSafe(): Promise<{
    id: string;
    companyName: string;
    ownerName: string;
    contact: string;
    email: string | null;
    status: string;
    location: string;
    fleetSize: number | null;
    isVerified: boolean | null;
    createdAt: Date | null;
    vehicleCount: number;
    driverCount: number;
    tripCount: number;
  }[]>;
  getPendingTransporters(): Promise<Transporter[]>;
  createTransporter(transporter: InsertTransporter): Promise<Transporter>;
  updateTransporterStatus(id: string, status: "active" | "pending_approval" | "suspended" | "pending_verification" | "rejected"): Promise<void>;
  rejectTransporter(id: string, rejectedById: string, reason: string): Promise<void>;
  approveTransporter(id: string, approvedById: string): Promise<void>;
  
  // Vehicles
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getUserVehicles(userId: string): Promise<Vehicle[]>;
  getTransporterVehicles(transporterId: string): Promise<Vehicle[]>;
  getAllVehicles(): Promise<Vehicle[]>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicleStatus(id: string, status: "active" | "inactive" | "maintenance"): Promise<void>;
  
  // Rides
  getRide(id: string): Promise<Ride | undefined>;
  getAllRides(): Promise<Ride[]>;
  getPendingRides(): Promise<Ride[]>;
  getScheduledRides(): Promise<Ride[]>;
  getActiveRides(): Promise<Ride[]>;
  getCompletedRides(): Promise<Ride[]>;
  getDriverRides(driverId: string): Promise<Ride[]>;
  getTransporterRides(transporterId: string): Promise<Ride[]>;
  getCustomerRides(customerId: string): Promise<Ride[]>;
  createRide(ride: InsertRide): Promise<Ride>;
  updateRideStatus(id: string, status: string): Promise<void>;
  assignRideToDriver(rideId: string, driverId: string, vehicleId: string): Promise<void>;
  driverAcceptTrip(rideId: string, driverId: string): Promise<void>;
  markRidePickupComplete(rideId: string): Promise<void>;
  markRideDeliveryComplete(rideId: string): Promise<void>;
  updateRideFinancials(rideId: string, financials: {
    finalPrice: string;
    platformFee: string;
    transporterEarning: string;
    platformFeePercent: string;
    shadowPlatformFee?: string;
    shadowPlatformFeePercent?: string;
    financialLockedAt: Date;
  }): Promise<void>;
  updateRidePaymentStatus(rideId: string, paymentStatus: string): Promise<void>;
  
  // Ledger
  createLedgerEntry(entry: InsertLedgerEntry): Promise<LedgerEntry>;
  getRideLedgerEntries(rideId: string): Promise<LedgerEntry[]>;
  getTransporterLedgerEntries(transporterId: string): Promise<LedgerEntry[]>;
  
  // Bids
  getBid(id: string): Promise<Bid | undefined>;
  getRideBids(rideId: string): Promise<Bid[]>;
  getCheapestRideBids(rideId: string, limit?: number): Promise<Bid[]>;
  getUserBids(userId: string): Promise<Bid[]>;
  getTransporterBids(transporterId: string): Promise<Bid[]>;
  getAllBids(): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBidStatus(id: string, status: "pending" | "accepted" | "rejected"): Promise<void>;
  
  // Documents
  getDocumentById(id: string): Promise<Document | undefined>;
  getUserDocuments(userId: string): Promise<Document[]>;
  getTransporterDocuments(transporterId: string): Promise<Document[]>;
  getVehicleDocuments(vehicleId: string): Promise<Document[]>;
  getTripDocuments(tripId: string): Promise<Document[]>;
  getAllDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocumentStatus(id: string, status: "verified" | "pending" | "expired" | "rejected" | "replaced" | "deleted", reviewedById?: string | null, rejectionReason?: string | null): Promise<void>;
  softDeleteDocument(id: string, deletedById: string): Promise<void>;
  findActiveDocumentByType(entityType: string, entityId: string, docType: string): Promise<Document | undefined>;
  
  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  getTransporterNotifications(transporterId: string): Promise<Notification[]>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;
  getUnreadNotificationsForUserOrTransporter(userId: string, transporterId?: string): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  markAllNotificationsReadForUserOrTransporter(userId: string, transporterId?: string): Promise<void>;
  
  // Smart Matching
  findMatchingTransporters(ride: Ride): Promise<{transporter: Transporter; matchScore: number; matchReason: string; vehicles: Vehicle[]}[]>;
  getActiveTransporters(): Promise<Transporter[]>;
  getTransportersByStatus(status: string): Promise<Transporter[]>;
  verifyTransporter(id: string, verifiedById: string): Promise<void>;
  getVehiclesByTypeAndCapacity(vehicleType: string | null, minCapacityKg: number | null): Promise<Vehicle[]>;
  updateRideAcceptedBid(rideId: string, bidId: string, transporterId: string): Promise<void>;
  closeBidding(rideId: string, acceptedByUserId: string): Promise<void>;
  acceptBidAtomic(params: {
    bidId: string;
    rideId: string;
    transporterId: string | null;
    acceptedByUserId: string;
    financials: {
      finalPrice: string;
      platformFee: string;
      transporterEarning: string;
      platformFeePercent: string;
      shadowPlatformFee?: string;
      shadowPlatformFeePercent?: string;
    };
  }): Promise<void>;
  
  // API Logs
  createApiLog(log: InsertApiLog): Promise<ApiLog>;
  getApiLogs(limit?: number, offset?: number): Promise<ApiLog[]>;
  getApiLogsByPath(path: string): Promise<ApiLog[]>;
  getApiLogStats(): Promise<{ totalRequests: number; externalRequests: number; errorCount: number; avgResponseTime: number }>;
  
  // Roles
  getRole(id: string): Promise<Role | undefined>;
  getAllRoles(): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, updates: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<void>;
  
  // User Roles
  getUserRoles(userId: string): Promise<(UserRole & { role: Role })[]>;
  assignRoleToUser(data: InsertUserRole): Promise<UserRole>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  
  // Saved Addresses
  getSavedAddress(id: string): Promise<SavedAddress | undefined>;
  getTransporterSavedAddresses(transporterId: string): Promise<SavedAddress[]>;
  getUserSavedAddresses(userId: string): Promise<SavedAddress[]>;
  createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress>;
  updateSavedAddress(id: string, updates: Partial<InsertSavedAddress>): Promise<SavedAddress | undefined>;
  deleteSavedAddress(id: string): Promise<void>;
  
  // Driver Applications
  getDriverApplication(id: string): Promise<DriverApplication | undefined>;
  getDriverApplicationByDriverId(driverId: string): Promise<DriverApplication | undefined>;
  getAllDriverApplications(): Promise<DriverApplication[]>;
  getActiveDriverApplications(): Promise<DriverApplication[]>;
  createDriverApplication(application: InsertDriverApplication): Promise<DriverApplication>;
  updateDriverApplication(id: string, updates: Partial<InsertDriverApplication>): Promise<DriverApplication | undefined>;
  hireDriver(applicationId: string, transporterId: string): Promise<void>;
  
  // Platform Settings
  getPlatformSettings(): Promise<PlatformSettings>;
  updatePlatformSettings(updates: Partial<InsertPlatformSettings>, updatedByAdminId: string): Promise<PlatformSettings>;
  
  // OTP Codes
  createOtpCode(otp: InsertOtpCode): Promise<OtpCode>;
  getActiveOtpCode(phone: string, purpose: "login" | "forgot_password" | "verify_phone"): Promise<OtpCode | undefined>;
  incrementOtpAttempts(id: string): Promise<void>;
  markOtpVerified(id: string): Promise<void>;
  invalidateOtpCodes(phone: string, purpose: "login" | "forgot_password" | "verify_phone"): Promise<void>;
  
  // Onboarding
  getTransporterOnboardingStatus(transporterId: string): Promise<{
    transporterType: string;
    onboardingStatus: string;
    hasBusinessDocs: boolean;
    hasApprovedVehicle: boolean;
    hasApprovedDriver: boolean;
    vehicleCount: number;
    driverCount: number;
    approvedVehicleCount: number;
    approvedDriverCount: number;
    pendingVehicleDocCount: number;
    pendingDriverDocCount: number;
  } | undefined>;
  updateTransporterType(transporterId: string, transporterType: "business" | "individual"): Promise<void>;
  updateTransporterOnboardingStatus(transporterId: string, status: "incomplete" | "completed"): Promise<void>;
  updateVehicleDocumentStatus(vehicleId: string, status: "document_missing" | "verification_pending" | "approved" | "rejected"): Promise<void>;
  updateDriverDocumentStatus(driverId: string, status: "document_missing" | "verification_pending" | "approved" | "rejected"): Promise<void>;
  getTransporterBiddingEligibility(transporterId: string): Promise<{
    canBid: boolean;
    reason: string;
    approvedVehicles: string[];
    approvedDrivers: string[];
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await db.update(users).set({ isOnline }).where(eq(users.id, id));
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<void> {
    await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id));
  }

  async updateUser(id: string, updates: { name?: string; email?: string; phone?: string; role?: string; isSelfDriver?: boolean }): Promise<User | undefined> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.role !== undefined) updateData.role = updates.role;
    if (updates.isSelfDriver !== undefined) updateData.isSelfDriver = updates.isSelfDriver;
    
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getSuperAdmins(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isSuperAdmin, true));
  }

  async getCustomers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "customer")).orderBy(desc(users.createdAt));
  }

  async getDrivers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, "driver")).orderBy(desc(users.createdAt));
  }

  async getUsersByTransporter(transporterId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.transporterId, transporterId));
  }

  async getUsersByTransporterAndRole(transporterId: string, role: string): Promise<User[]> {
    return await db.select().from(users).where(
      and(eq(users.transporterId, transporterId), eq(users.role, role as any))
    );
  }

  // Transporters
  async getTransporter(id: string): Promise<Transporter | undefined> {
    const [transporter] = await db.select().from(transporters).where(eq(transporters.id, id));
    return transporter || undefined;
  }

  async getAllTransporters(): Promise<Transporter[]> {
    return await db.select().from(transporters).orderBy(desc(transporters.createdAt));
  }

  async getAllTransportersSafe(): Promise<{
    id: string;
    companyName: string;
    ownerName: string;
    contact: string;
    email: string | null;
    status: string;
    location: string;
    fleetSize: number | null;
    isVerified: boolean | null;
    createdAt: Date | null;
    vehicleCount: number;
    driverCount: number;
    tripCount: number;
  }[]> {
    const result = await db
      .select({
        id: transporters.id,
        companyName: transporters.companyName,
        ownerName: transporters.ownerName,
        contact: transporters.contact,
        email: transporters.email,
        status: sql<string>`COALESCE(${transporters.status}, 'pending_verification')`,
        location: transporters.location,
        fleetSize: transporters.fleetSize,
        isVerified: transporters.isVerified,
        createdAt: transporters.createdAt,
        vehicleCount: sql<number>`COALESCE(COUNT(DISTINCT ${vehicles.id}), 0)`,
        driverCount: sql<number>`COALESCE(COUNT(DISTINCT CASE WHEN ${users.role} = 'driver' THEN ${users.id} END), 0)`,
        tripCount: sql<number>`COALESCE(COUNT(DISTINCT ${rides.id}), 0)`
      })
      .from(transporters)
      .leftJoin(users, eq(users.transporterId, transporters.id))
      .leftJoin(vehicles, eq(vehicles.transporterId, transporters.id))
      .leftJoin(rides, eq(rides.transporterId, transporters.id))
      .groupBy(transporters.id)
      .orderBy(desc(transporters.createdAt));
    
    return result;
  }

  async getPendingTransporters(): Promise<Transporter[]> {
    return await db.select().from(transporters).where(eq(transporters.status, "pending_approval"));
  }

  async createTransporter(insertTransporter: InsertTransporter): Promise<Transporter> {
    const [transporter] = await db.insert(transporters).values(insertTransporter).returning();
    return transporter;
  }

  async updateTransporterStatus(id: string, status: "active" | "pending_approval" | "suspended" | "pending_verification" | "rejected"): Promise<void> {
    await db.update(transporters).set({ status }).where(eq(transporters.id, id));
  }

  async rejectTransporter(id: string, rejectedById: string, reason: string): Promise<void> {
    await db.update(transporters).set({
      status: "rejected",
      rejectionReason: reason,
      isVerified: false,
      verifiedAt: new Date(),
      verifiedBy: rejectedById,
    }).where(eq(transporters.id, id));
  }

  async approveTransporter(id: string, approvedById: string): Promise<void> {
    await db.update(transporters).set({
      status: "active",
      isVerified: true,
      rejectionReason: null,
      verifiedAt: new Date(),
      verifiedBy: approvedById,
    }).where(eq(transporters.id, id));
    
    // Update associated users' profile completion status
    await db.update(users).set({
      profileComplete: true
    }).where(eq(users.transporterId, id));
  }

  // Vehicles
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async getUserVehicles(userId: string): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.userId, userId));
  }

  async getTransporterVehicles(transporterId: string): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.transporterId, transporterId));
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).orderBy(desc(vehicles.createdAt));
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async updateVehicleStatus(id: string, status: "active" | "inactive" | "maintenance"): Promise<void> {
    await db.update(vehicles).set({ status }).where(eq(vehicles.id, id));
  }

  // Rides
  async getRide(id: string): Promise<Ride | undefined> {
    const [ride] = await db.select().from(rides).where(eq(rides.id, id));
    return ride || undefined;
  }

  async getAllRides(): Promise<Ride[]> {
    return await db.select().from(rides).orderBy(desc(rides.createdAt));
  }

  async getPendingRides(): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.status, "pending")).orderBy(desc(rides.createdAt));
  }

  async getScheduledRides(): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.status, "scheduled")).orderBy(desc(rides.createdAt));
  }

  async getActiveRides(): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.status, "active")).orderBy(desc(rides.createdAt));
  }

  async getCompletedRides(): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.status, "completed")).orderBy(desc(rides.createdAt));
  }

  async getDriverRides(driverId: string): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.assignedDriverId, driverId)).orderBy(desc(rides.createdAt));
  }

  async getTransporterRides(transporterId: string): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.transporterId, transporterId)).orderBy(desc(rides.createdAt));
  }

  async getCustomerRides(customerId: string): Promise<Ride[]> {
    return await db.select().from(rides).where(eq(rides.createdById, customerId)).orderBy(desc(rides.createdAt));
  }

  async createRide(insertRide: InsertRide): Promise<Ride> {
    const [ride] = await db.insert(rides).values(insertRide).returning();
    return ride;
  }

  async updateRideStatus(id: string, status: string): Promise<void> {
    await db.update(rides).set({ status: status as any }).where(eq(rides.id, id));
  }

  async assignRideToDriver(rideId: string, driverId: string, vehicleId: string): Promise<void> {
    await db.update(rides).set({ 
      assignedDriverId: driverId,
      assignedVehicleId: vehicleId,
      status: "assigned"
    }).where(eq(rides.id, rideId));
  }

  async driverAcceptTrip(rideId: string, driverId: string): Promise<void> {
    await db.update(rides).set({ 
      acceptedByUserId: driverId,
      acceptedAt: new Date()
    }).where(eq(rides.id, rideId));
  }

  async markRidePickupComplete(rideId: string): Promise<void> {
    await db.update(rides).set({ 
      pickupCompleted: true,
      pickupCompletedAt: new Date()
    }).where(eq(rides.id, rideId));
  }

  async markRideDeliveryComplete(rideId: string): Promise<void> {
    await db.update(rides).set({ 
      deliveryCompleted: true,
      deliveryCompletedAt: new Date()
    }).where(eq(rides.id, rideId));
  }

  async updateRideFinancials(rideId: string, financials: {
    finalPrice: string;
    platformFee: string;
    transporterEarning: string;
    platformFeePercent: string;
    shadowPlatformFee?: string;
    shadowPlatformFeePercent?: string;
    financialLockedAt: Date;
  }): Promise<void> {
    await db.update(rides).set({
      finalPrice: financials.finalPrice,
      platformFee: financials.platformFee,
      transporterEarning: financials.transporterEarning,
      platformFeePercent: financials.platformFeePercent,
      shadowPlatformFee: financials.shadowPlatformFee,
      shadowPlatformFeePercent: financials.shadowPlatformFeePercent,
      financialLockedAt: financials.financialLockedAt
    }).where(eq(rides.id, rideId));
  }

  async updateRidePaymentStatus(rideId: string, paymentStatus: string): Promise<void> {
    await db.update(rides).set({
      paymentStatus: paymentStatus as any
    }).where(eq(rides.id, rideId));
  }

  // Ledger
  async createLedgerEntry(entry: InsertLedgerEntry): Promise<LedgerEntry> {
    const [ledgerEntry] = await db.insert(ledgerEntries).values(entry).returning();
    return ledgerEntry;
  }

  async getRideLedgerEntries(rideId: string): Promise<LedgerEntry[]> {
    return await db.select().from(ledgerEntries).where(eq(ledgerEntries.rideId, rideId)).orderBy(desc(ledgerEntries.createdAt));
  }

  async getTransporterLedgerEntries(transporterId: string): Promise<LedgerEntry[]> {
    return await db.select().from(ledgerEntries).where(eq(ledgerEntries.transporterId, transporterId)).orderBy(desc(ledgerEntries.createdAt));
  }

  // Bids
  async getBid(id: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid || undefined;
  }

  async getRideBids(rideId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.rideId, rideId)).orderBy(desc(bids.createdAt));
  }

  async getCheapestRideBids(rideId: string, limit: number = 5): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.rideId, rideId)).orderBy(asc(bids.amount)).limit(limit);
  }

  async getUserBids(userId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.userId, userId)).orderBy(desc(bids.createdAt));
  }

  async getTransporterBids(transporterId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.transporterId, transporterId)).orderBy(desc(bids.createdAt));
  }

  async getAllBids(): Promise<Bid[]> {
    return await db.select().from(bids).orderBy(desc(bids.createdAt));
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const [bid] = await db.insert(bids).values(insertBid).returning();
    return bid;
  }

  // TODO: Implement transaction support for bid acceptance
  // This operation should be atomic to prevent race conditions
  async updateBidStatus(id: string, status: "pending" | "accepted" | "rejected"): Promise<void> {
    await db.update(bids).set({ status }).where(eq(bids.id, id));
  }

  // Documents
  async getDocumentById(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId)).orderBy(desc(documents.createdAt));
  }

  async getTransporterDocuments(transporterId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.transporterId, transporterId)).orderBy(desc(documents.createdAt));
  }

  async getVehicleDocuments(vehicleId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.vehicleId, vehicleId)).orderBy(desc(documents.createdAt));
  }

  async getTripDocuments(tripId: string): Promise<Document[]> {
    return await db.select().from(documents).where(
      and(
        eq(documents.rideId, tripId),
        not(eq(documents.status, "deleted"))
      )
    ).orderBy(desc(documents.createdAt));
  }

  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }

  async updateDocumentStatus(id: string, status: "verified" | "pending" | "expired" | "rejected" | "replaced" | "deleted", reviewedById?: string | null, rejectionReason?: string | null): Promise<void> {
    await db.update(documents).set({ 
      status,
      reviewedBy: reviewedById ?? null,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason ?? null
    }).where(eq(documents.id, id));
  }

  async softDeleteDocument(id: string, deletedById: string): Promise<void> {
    await db.update(documents).set({ 
      status: "deleted",
      reviewedBy: deletedById,
      reviewedAt: new Date()
    }).where(eq(documents.id, id));
  }

  async findActiveDocumentByType(entityType: string, entityId: string, docType: string): Promise<Document | undefined> {
    // Find an active (non-replaced) document of the same type for this entity
    let query;
    if (entityType === "driver") {
      query = db.select().from(documents).where(
        and(
          eq(documents.userId, entityId),
          eq(documents.entityType, "driver"),
          eq(documents.type, docType as any),
          not(eq(documents.status, "replaced"))
        )
      );
    } else if (entityType === "vehicle") {
      query = db.select().from(documents).where(
        and(
          eq(documents.vehicleId, entityId),
          eq(documents.entityType, "vehicle"),
          eq(documents.type, docType as any),
          not(eq(documents.status, "replaced"))
        )
      );
    } else if (entityType === "transporter") {
      query = db.select().from(documents).where(
        and(
          eq(documents.transporterId, entityId),
          eq(documents.entityType, "transporter"),
          eq(documents.type, docType as any),
          not(eq(documents.status, "replaced"))
        )
      );
    } else {
      return undefined;
    }
    const [doc] = await query.orderBy(desc(documents.createdAt)).limit(1);
    return doc;
  }

  // Notifications
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.recipientId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getTransporterNotifications(transporterId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.recipientTransporterId, transporterId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications).where(
      and(eq(notifications.recipientId, userId), eq(notifications.isRead, false))
    ).orderBy(desc(notifications.createdAt));
  }
  
  // Get unread notifications for user OR their transporter (for transporter-scoped notifications)
  async getUnreadNotificationsForUserOrTransporter(userId: string, transporterId?: string): Promise<Notification[]> {
    if (transporterId) {
      // Check both user-scoped AND transporter-scoped notifications
      return await db.select().from(notifications).where(
        and(
          or(
            eq(notifications.recipientId, userId),
            eq(notifications.recipientTransporterId, transporterId)
          ),
          eq(notifications.isRead, false)
        )
      ).orderBy(desc(notifications.createdAt));
    }
    // Fallback to just user-scoped
    return await db.select().from(notifications).where(
      and(eq(notifications.recipientId, userId), eq(notifications.isRead, false))
    ).orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.recipientId, userId));
  }
  
  // Mark all notifications read for user OR their transporter
  async markAllNotificationsReadForUserOrTransporter(userId: string, transporterId?: string): Promise<void> {
    if (transporterId) {
      await db.update(notifications).set({ isRead: true }).where(
        or(
          eq(notifications.recipientId, userId),
          eq(notifications.recipientTransporterId, transporterId)
        )
      );
    } else {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.recipientId, userId));
    }
  }

  // Smart Matching
  async getActiveTransporters(): Promise<Transporter[]> {
    // Only return transporters that are both active AND verified
    return await db.select().from(transporters).where(
      and(eq(transporters.status, "active"), eq(transporters.isVerified, true))
    );
  }

  // Get transporters by status (for admin filtering)
  async getTransportersByStatus(status: string): Promise<Transporter[]> {
    return await db.select().from(transporters).where(eq(transporters.status, status as any)).orderBy(desc(transporters.createdAt));
  }

  // Verify a transporter (admin action)
  async verifyTransporter(id: string, verifiedById: string): Promise<void> {
    await db.update(transporters).set({
      isVerified: true,
      status: "active",
      verifiedAt: new Date(),
      verifiedBy: verifiedById,
    }).where(eq(transporters.id, id));
    
    // Update associated users' document completion status
    await db.update(users).set({
      profileComplete: true
    }).where(eq(users.transporterId, id));
  }

  async getVehiclesByTypeAndCapacity(vehicleType: string | null, minCapacityKg: number | null): Promise<Vehicle[]> {
    let query = db.select().from(vehicles).where(eq(vehicles.status, "active"));
    
    if (vehicleType) {
      query = db.select().from(vehicles).where(
        and(eq(vehicles.status, "active"), eq(vehicles.type, vehicleType))
      );
    }
    
    const allVehicles = await query;
    
    if (minCapacityKg) {
      return allVehicles.filter(v => v.capacityKg && v.capacityKg >= minCapacityKg);
    }
    
    return allVehicles;
  }

  async findMatchingTransporters(ride: Ride): Promise<{transporter: Transporter; matchScore: number; matchReason: string; vehicles: Vehicle[]}[]> {
    const activeTransporters = await this.getActiveTransporters();
    const matches: {transporter: Transporter; matchScore: number; matchReason: string; vehicles: Vehicle[]}[] = [];

    for (const transporter of activeTransporters) {
      let score = 0;
      const reasons: string[] = [];
      
      const transporterVehicles = await this.getTransporterVehicles(transporter.id);
      const matchingVehicles: Vehicle[] = [];
      
      for (const vehicle of transporterVehicles) {
        if (vehicle.status !== "active") continue;
        
        let vehicleMatches = false;
        
        if (ride.requiredVehicleType && vehicle.type === ride.requiredVehicleType) {
          score += 30;
          reasons.push(`Vehicle type matches (${vehicle.type})`);
          vehicleMatches = true;
        } else if (!ride.requiredVehicleType) {
          score += 10;
          vehicleMatches = true;
        }
        
        if (ride.weightKg && vehicle.capacityKg && vehicle.capacityKg >= ride.weightKg) {
          score += 25;
          reasons.push(`Capacity sufficient (${vehicle.capacityKg}kg >= ${ride.weightKg}kg)`);
          vehicleMatches = true;
        } else if (!ride.weightKg) {
          score += 5;
          vehicleMatches = true;
        }
        
        if (vehicle.currentPincode && ride.pickupPincode && vehicle.currentPincode === ride.pickupPincode) {
          score += 20;
          reasons.push(`Vehicle currently at pickup pincode (${ride.pickupPincode})`);
          vehicleMatches = true;
        }
        
        if (vehicleMatches) {
          matchingVehicles.push(vehicle);
        }
      }
      
      if (transporter.servicePincodes && ride.pickupPincode) {
        if (transporter.servicePincodes.includes(ride.pickupPincode)) {
          score += 15;
          reasons.push(`Services pickup pincode (${ride.pickupPincode})`);
        }
      }
      
      if (transporter.basePincode && ride.pickupPincode && transporter.basePincode === ride.pickupPincode) {
        score += 10;
        reasons.push(`Based at pickup pincode`);
      }
      
      if (transporter.preferredRoutes && ride.pickupLocation && ride.dropLocation) {
        const routes = transporter.preferredRoutes as string[];
        const routeKey = `${ride.pickupLocation}-${ride.dropLocation}`.toLowerCase();
        if (routes.some(r => routeKey.includes(r.toLowerCase()))) {
          score += 20;
          reasons.push(`Serves this route`);
        }
      }
      
      if (transporter.isOwnerOperator) {
        score += 5;
        reasons.push(`Owner-operator (single fleet)`);
      }
      
      if (score > 0 && matchingVehicles.length > 0) {
        matches.push({
          transporter,
          matchScore: Math.min(score, 100),
          matchReason: reasons.join("; "),
          vehicles: matchingVehicles
        });
      }
    }
    
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  async updateRideAcceptedBid(rideId: string, bidId: string, transporterId: string): Promise<void> {
    await db.update(rides).set({ 
      acceptedBidId: bidId,
      transporterId: transporterId,
      status: "assigned"
    }).where(eq(rides.id, rideId));
  }

  async closeBidding(rideId: string, acceptedByUserId: string): Promise<void> {
    await db.update(rides).set({ 
      biddingStatus: "closed",
      acceptedByUserId: acceptedByUserId,
      acceptedAt: new Date()
    }).where(eq(rides.id, rideId));
  }

  async acceptBidAtomic(params: {
    bidId: string;
    rideId: string;
    transporterId: string | null;
    acceptedByUserId: string;
    financials: {
      finalPrice: string;
      platformFee: string;
      transporterEarning: string;
      platformFeePercent: string;
      shadowPlatformFee?: string;
      shadowPlatformFeePercent?: string;
    };
  }): Promise<void> {
    const { bidId, rideId, transporterId, acceptedByUserId, financials } = params;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx.update(bids).set({ status: "accepted" }).where(eq(bids.id, bidId));

      await tx.update(rides).set({
        acceptedBidId: bidId,
        transporterId: transporterId || undefined,
        biddingStatus: "closed",
        acceptedByUserId: acceptedByUserId,
        acceptedAt: now,
        status: "accepted",
        finalPrice: financials.finalPrice,
        platformFee: financials.platformFee,
        transporterEarning: financials.transporterEarning,
        platformFeePercent: financials.platformFeePercent,
        shadowPlatformFee: financials.shadowPlatformFee,
        shadowPlatformFeePercent: financials.shadowPlatformFeePercent,
        financialLockedAt: now
      }).where(eq(rides.id, rideId));

      const entries = [
        {
          rideId,
          transporterId: transporterId || undefined,
          entryType: "trip_revenue" as const,
          amount: financials.finalPrice,
          description: `Trip revenue from customer`,
          referenceType: "ride",
          createdById: acceptedByUserId
        },
        {
          rideId,
          transporterId: transporterId || undefined,
          entryType: "platform_fee" as const,
          amount: (-parseFloat(financials.platformFee)).toString(),
          description: `Platform fee (${financials.platformFeePercent}%)`,
          referenceType: "ride",
          createdById: acceptedByUserId
        },
        {
          rideId,
          transporterId: transporterId || undefined,
          entryType: "transporter_payout" as const,
          amount: financials.transporterEarning,
          description: `Transporter earning after platform fee`,
          referenceType: "ride",
          createdById: acceptedByUserId
        }
      ];

      for (const entry of entries) {
        await tx.insert(ledgerEntries).values(entry);
      }

      const allBids = await tx.select().from(bids).where(eq(bids.rideId, rideId));
      for (const otherBid of allBids) {
        if (otherBid.id !== bidId && otherBid.status === "pending") {
          await tx.update(bids).set({ status: "rejected" }).where(eq(bids.id, otherBid.id));
        }
      }
    });
  }

  async selfAssignRide(rideId: string, transporterId: string, driverId: string, vehicleId: string): Promise<void> {
    await db.update(rides).set({
      biddingStatus: "self_assigned",
      isSelfAssigned: true,
      transporterId: transporterId,
      assignedDriverId: driverId,
      assignedVehicleId: vehicleId,
      status: "assigned"
    }).where(eq(rides.id, rideId));
  }

  // API Logs
  async createApiLog(log: InsertApiLog): Promise<ApiLog | null> {
    try {
      const [apiLog] = await db.insert(apiLogs).values(log).returning();
      return apiLog;
    } catch (err) {
      // Don't let API logging failures crash the app
      console.error('[storage] Failed to create API log:', err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }

  async getApiLogs(limit: number = 100, offset: number = 0): Promise<ApiLog[]> {
    return db.select().from(apiLogs).orderBy(desc(apiLogs.createdAt)).limit(limit).offset(offset);
  }

  async getApiLogsByPath(path: string): Promise<ApiLog[]> {
    return db.select().from(apiLogs).where(sql`${apiLogs.path} LIKE ${`%${path}%`}`).orderBy(desc(apiLogs.createdAt)).limit(100);
  }

  async getApiLogStats(): Promise<{ totalRequests: number; externalRequests: number; errorCount: number; avgResponseTime: number }> {
    const [stats] = await db.select({
      totalRequests: sql<number>`COUNT(*)::int`,
      externalRequests: sql<number>`COUNT(*) FILTER (WHERE ${apiLogs.isExternal} = true)::int`,
      errorCount: sql<number>`COUNT(*) FILTER (WHERE ${apiLogs.statusCode} >= 400)::int`,
      avgResponseTime: sql<number>`COALESCE(AVG(${apiLogs.responseTime})::int, 0)`
    }).from(apiLogs);
    return stats || { totalRequests: 0, externalRequests: 0, errorCount: 0, avgResponseTime: 0 };
  }

  // Roles
  async getRole(id: string): Promise<Role | undefined> {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || undefined;
  }

  async getAllRoles(): Promise<Role[]> {
    return db.select().from(roles).orderBy(asc(roles.name));
  }

  async createRole(role: InsertRole): Promise<Role> {
    const [newRole] = await db.insert(roles).values(role).returning();
    return newRole;
  }

  async updateRole(id: string, updates: Partial<InsertRole>): Promise<Role | undefined> {
    const [updated] = await db.update(roles).set(updates).where(eq(roles.id, id)).returning();
    return updated || undefined;
  }

  async deleteRole(id: string): Promise<void> {
    await db.delete(userRoles).where(eq(userRoles.roleId, id));
    await db.delete(roles).where(eq(roles.id, id));
  }

  // User Roles
  async getUserRoles(userId: string): Promise<(UserRole & { role: Role })[]> {
    const results = await db.select({
      id: userRoles.id,
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      assignedBy: userRoles.assignedBy,
      createdAt: userRoles.createdAt,
      role: roles
    }).from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    
    return results.map(r => ({
      id: r.id,
      userId: r.userId,
      roleId: r.roleId,
      assignedBy: r.assignedBy,
      createdAt: r.createdAt,
      role: r.role
    }));
  }

  async assignRoleToUser(data: InsertUserRole): Promise<UserRole> {
    const [userRole] = await db.insert(userRoles).values(data).returning();
    return userRole;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
  }

  // Saved Addresses
  async getSavedAddress(id: string): Promise<SavedAddress | undefined> {
    const [address] = await db.select().from(savedAddresses).where(eq(savedAddresses.id, id));
    return address || undefined;
  }

  async getTransporterSavedAddresses(transporterId: string): Promise<SavedAddress[]> {
    return db.select().from(savedAddresses).where(eq(savedAddresses.transporterId, transporterId)).orderBy(desc(savedAddresses.createdAt));
  }

  async getUserSavedAddresses(userId: string): Promise<SavedAddress[]> {
    return db.select().from(savedAddresses).where(eq(savedAddresses.userId, userId)).orderBy(desc(savedAddresses.createdAt));
  }

  async createSavedAddress(address: InsertSavedAddress): Promise<SavedAddress> {
    const [newAddress] = await db.insert(savedAddresses).values(address).returning();
    return newAddress;
  }

  async updateSavedAddress(id: string, updates: Partial<InsertSavedAddress>): Promise<SavedAddress | undefined> {
    const [updated] = await db.update(savedAddresses).set(updates).where(eq(savedAddresses.id, id)).returning();
    return updated || undefined;
  }

  async deleteSavedAddress(id: string): Promise<void> {
    await db.delete(savedAddresses).where(eq(savedAddresses.id, id));
  }

  // Driver Applications
  async getDriverApplication(id: string): Promise<DriverApplication | undefined> {
    const [application] = await db.select().from(driverApplications).where(eq(driverApplications.id, id));
    return application || undefined;
  }

  async getDriverApplicationByDriverId(driverId: string): Promise<DriverApplication | undefined> {
    const [application] = await db.select().from(driverApplications).where(eq(driverApplications.driverId, driverId));
    return application || undefined;
  }

  async getAllDriverApplications(): Promise<DriverApplication[]> {
    return db.select().from(driverApplications).orderBy(desc(driverApplications.createdAt));
  }

  async getActiveDriverApplications(): Promise<DriverApplication[]> {
    return db.select().from(driverApplications).where(eq(driverApplications.status, "active")).orderBy(desc(driverApplications.createdAt));
  }

  async createDriverApplication(application: InsertDriverApplication): Promise<DriverApplication> {
    const [newApplication] = await db.insert(driverApplications).values(application).returning();
    return newApplication;
  }

  async updateDriverApplication(id: string, updates: Partial<InsertDriverApplication>): Promise<DriverApplication | undefined> {
    const [updated] = await db.update(driverApplications).set({ ...updates, updatedAt: new Date() }).where(eq(driverApplications.id, id)).returning();
    return updated || undefined;
  }

  async hireDriver(applicationId: string, transporterId: string): Promise<void> {
    const application = await this.getDriverApplication(applicationId);
    if (!application) throw new Error("Application not found");
    
    await db.update(driverApplications).set({
      status: "hired",
      acceptedByTransporterId: transporterId,
      acceptedAt: new Date(),
      updatedAt: new Date()
    }).where(eq(driverApplications.id, applicationId));
    
    await db.update(users).set({
      transporterId: transporterId
    }).where(eq(users.id, application.driverId));
  }

  // Platform Settings
  async getPlatformSettings(): Promise<PlatformSettings> {
    const [settings] = await db.select().from(platformSettings).where(eq(platformSettings.id, "default"));
    if (settings) return settings;
    
    const [newSettings] = await db.insert(platformSettings).values({
      id: "default",
      commissionEnabled: false,
      commissionMode: "shadow",
      tierConfig: [
        { amount: 5000, percent: 10 },
        { amount: 10000, percent: 8 },
        { amount: 25000, percent: 6 },
        { amount: 50000, percent: 5 }
      ],
      basePercent: "10",
      minFee: "50",
      maxFee: "5000"
    }).returning();
    return newSettings;
  }

  async updatePlatformSettings(updates: Partial<InsertPlatformSettings>, updatedByAdminId: string): Promise<PlatformSettings> {
    await this.getPlatformSettings();
    
    const [updated] = await db.update(platformSettings).set({
      ...updates,
      updatedByAdminId,
      updatedAt: new Date()
    }).where(eq(platformSettings.id, "default")).returning();
    return updated;
  }

  // OTP Codes
  async createOtpCode(otp: InsertOtpCode): Promise<OtpCode> {
    const [created] = await db.insert(otpCodes).values(otp).returning();
    return created;
  }

  async getActiveOtpCode(phone: string, purpose: "login" | "forgot_password" | "verify_phone"): Promise<OtpCode | undefined> {
    const [otp] = await db.select().from(otpCodes)
      .where(and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.verified, false),
        gte(otpCodes.expiresAt, new Date())
      ))
      .orderBy(desc(otpCodes.createdAt))
      .limit(1);
    return otp || undefined;
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    await db.update(otpCodes).set({
      attempts: sql`${otpCodes.attempts} + 1`
    }).where(eq(otpCodes.id, id));
  }

  async markOtpVerified(id: string): Promise<void> {
    await db.update(otpCodes).set({ verified: true }).where(eq(otpCodes.id, id));
  }

  async invalidateOtpCodes(phone: string, purpose: "login" | "forgot_password" | "verify_phone"): Promise<void> {
    await db.update(otpCodes).set({ verified: true }).where(
      and(
        eq(otpCodes.phone, phone),
        eq(otpCodes.purpose, purpose),
        eq(otpCodes.verified, false)
      )
    );
  }

  // Onboarding methods
  async getTransporterOnboardingStatus(transporterId: string): Promise<{
    transporterType: string;
    onboardingStatus: string;
    hasBusinessDocs: boolean;
    hasApprovedVehicle: boolean;
    hasApprovedDriver: boolean;
    vehicleCount: number;
    driverCount: number;
    approvedVehicleCount: number;
    approvedDriverCount: number;
    pendingVehicleDocCount: number;
    pendingDriverDocCount: number;
  } | undefined> {
    const transporter = await this.getTransporter(transporterId);
    if (!transporter) return undefined;

    // Get all vehicles for this transporter
    const transporterVehicles = await this.getTransporterVehicles(transporterId);
    
    // Get all drivers for this transporter
    const transporterDrivers = await db.select().from(users)
      .where(and(eq(users.transporterId, transporterId), eq(users.role, "driver")));

    // Check for approved business documents (GST, MSME, etc.)
    const businessDocs = await db.select().from(documents)
      .where(and(
        eq(documents.entityType, "transporter"),
        eq(documents.entityId, transporterId),
        eq(documents.status, "verified"),
        not(eq(documents.status, "deleted"))
      ));
    
    const hasBusinessDocs = businessDocs.length > 0;
    
    // Count approved vehicles - check documentStatus OR verified RC in documents table
    const vehicleIdsWithVerifiedRC = transporterVehicles.length > 0 
      ? (await db.select({ vehicleId: documents.vehicleId }).from(documents)
          .where(and(
            eq(documents.entityType, "vehicle"),
            inArray(documents.vehicleId, transporterVehicles.map(v => v.id)),
            eq(documents.status, "verified"),
            sql`lower(${documents.type}) IN ('rc', 'registration_certificate', 'vehicle_rc')`
          ))).map(d => d.vehicleId)
      : [];
    
    const approvedVehicles = transporterVehicles.filter(v => 
      v.documentStatus === "approved" || vehicleIdsWithVerifiedRC.includes(v.id)
    );
    
    // Count approved drivers - check documentStatus OR verified license in documents table
    const driverIdsWithVerifiedLicense = transporterDrivers.length > 0
      ? (await db.select({ userId: documents.userId }).from(documents)
          .where(and(
            eq(documents.entityType, "driver"),
            inArray(documents.userId, transporterDrivers.map(d => d.id)),
            eq(documents.status, "verified"),
            sql`lower(${documents.type}) IN ('driving_license', 'license', 'dl')`
          ))).map(d => d.userId)
      : [];
    
    const approvedDrivers = transporterDrivers.filter(d => 
      d.documentStatus === "approved" || driverIdsWithVerifiedLicense.includes(d.id)
    );
    
    // Count pending vehicle documents
    const pendingVehicleDocs = await db.select().from(documents)
      .where(and(
        eq(documents.entityType, "vehicle"),
        inArray(documents.entityId, transporterVehicles.map(v => v.id)),
        eq(documents.status, "pending"),
        not(eq(documents.status, "deleted"))
      ));
    
    // Count pending driver documents
    const pendingDriverDocs = await db.select().from(documents)
      .where(and(
        eq(documents.entityType, "driver"),
        inArray(documents.entityId, transporterDrivers.map(d => d.id)),
        eq(documents.status, "pending"),
        not(eq(documents.status, "deleted"))
      ));

    return {
      transporterType: transporter.transporterType || "business",
      onboardingStatus: transporter.onboardingStatus || "incomplete",
      hasBusinessDocs,
      hasApprovedVehicle: approvedVehicles.length > 0,
      hasApprovedDriver: approvedDrivers.length > 0,
      vehicleCount: transporterVehicles.length,
      driverCount: transporterDrivers.length,
      approvedVehicleCount: approvedVehicles.length,
      approvedDriverCount: approvedDrivers.length,
      pendingVehicleDocCount: pendingVehicleDocs.length,
      pendingDriverDocCount: pendingDriverDocs.length
    };
  }

  async updateTransporterType(transporterId: string, transporterType: "business" | "individual"): Promise<void> {
    await db.update(transporters).set({ transporterType }).where(eq(transporters.id, transporterId));
  }

  async updateTransporterOnboardingStatus(transporterId: string, status: "incomplete" | "completed"): Promise<void> {
    await db.update(transporters).set({ onboardingStatus: status }).where(eq(transporters.id, transporterId));
  }

  async updateVehicleDocumentStatus(vehicleId: string, status: "document_missing" | "verification_pending" | "approved" | "rejected"): Promise<void> {
    await db.update(vehicles).set({ 
      documentStatus: status,
      isActiveForBidding: status === "approved"
    }).where(eq(vehicles.id, vehicleId));
  }

  async updateDriverDocumentStatus(driverId: string, status: "document_missing" | "verification_pending" | "approved" | "rejected"): Promise<void> {
    await db.update(users).set({ 
      documentStatus: status,
      isActiveForBidding: status === "approved"
    }).where(eq(users.id, driverId));
  }

  async getTransporterBiddingEligibility(transporterId: string): Promise<{
    canBid: boolean;
    reason: string;
    approvedVehicles: string[];
    approvedDrivers: string[];
  }> {
    const transporter = await this.getTransporter(transporterId);
    if (!transporter) {
      return { canBid: false, reason: "Transporter not found", approvedVehicles: [], approvedDrivers: [] };
    }

    if (transporter.status !== "active") {
      return { canBid: false, reason: "Transporter account is not active. Please wait for admin approval.", approvedVehicles: [], approvedDrivers: [] };
    }

    if (transporter.onboardingStatus !== "completed") {
      return { canBid: false, reason: "Please complete onboarding before placing bids.", approvedVehicles: [], approvedDrivers: [] };
    }

    // Get approved vehicles - check documentStatus OR verified RC in documents table
    const transporterVehicles = await this.getTransporterVehicles(transporterId);
    
    const vehicleIdsWithVerifiedRC = transporterVehicles.length > 0 
      ? (await db.select({ vehicleId: documents.vehicleId }).from(documents)
          .where(and(
            eq(documents.entityType, "vehicle"),
            inArray(documents.vehicleId, transporterVehicles.map(v => v.id)),
            eq(documents.status, "verified"),
            sql`lower(${documents.type}) IN ('rc', 'registration_certificate', 'vehicle_rc')`
          ))).map(d => d.vehicleId)
      : [];
    
    const approvedVehicles = transporterVehicles.filter(v => 
      v.documentStatus === "approved" || vehicleIdsWithVerifiedRC.includes(v.id)
    );

    if (approvedVehicles.length === 0) {
      return { canBid: false, reason: "No verified vehicles available. Please add a vehicle and upload required documents.", approvedVehicles: [], approvedDrivers: [] };
    }

    // Get approved drivers - check documentStatus OR verified license in documents table
    const transporterDrivers = await db.select().from(users)
      .where(and(
        eq(users.transporterId, transporterId), 
        eq(users.role, "driver")
      ));
    
    const driverIdsWithVerifiedLicense = transporterDrivers.length > 0
      ? (await db.select({ userId: documents.userId }).from(documents)
          .where(and(
            eq(documents.entityType, "driver"),
            inArray(documents.userId, transporterDrivers.map(d => d.id)),
            eq(documents.status, "verified"),
            sql`lower(${documents.type}) IN ('driving_license', 'license', 'dl')`
          ))).map(d => d.userId)
      : [];
    
    const approvedDrivers = transporterDrivers.filter(d => 
      d.documentStatus === "approved" || driverIdsWithVerifiedLicense.includes(d.id)
    );

    if (approvedDrivers.length === 0) {
      return { canBid: false, reason: "No verified drivers available. Please add a driver and upload required documents.", approvedVehicles: approvedVehicles.map(v => v.id), approvedDrivers: [] };
    }

    return {
      canBid: true,
      reason: "Eligible to bid",
      approvedVehicles: approvedVehicles.map(v => v.id),
      approvedDrivers: approvedDrivers.map(d => d.id)
    };
  }
}

export const storage = new DatabaseStorage();
