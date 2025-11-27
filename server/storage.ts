import { 
  users, vehicles, rides, bids, transporters, documents,
  type User, type InsertUser,
  type Vehicle, type InsertVehicle,
  type Ride, type InsertRide,
  type Bid, type InsertBid,
  type Transporter, type InsertTransporter,
  type Document, type InsertDocument
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void>;
  
  // Transporters
  getTransporter(id: string): Promise<Transporter | undefined>;
  getAllTransporters(): Promise<Transporter[]>;
  getPendingTransporters(): Promise<Transporter[]>;
  createTransporter(transporter: InsertTransporter): Promise<Transporter>;
  updateTransporterStatus(id: string, status: "active" | "pending_approval" | "suspended"): Promise<void>;
  
  // Vehicles
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getUserVehicles(userId: string): Promise<Vehicle[]>;
  getTransporterVehicles(transporterId: string): Promise<Vehicle[]>;
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
  createRide(ride: InsertRide): Promise<Ride>;
  updateRideStatus(id: string, status: string): Promise<void>;
  assignRideToDriver(rideId: string, driverId: string, vehicleId: string): Promise<void>;
  
  // Bids
  getBid(id: string): Promise<Bid | undefined>;
  getRideBids(rideId: string): Promise<Bid[]>;
  getUserBids(userId: string): Promise<Bid[]>;
  createBid(bid: InsertBid): Promise<Bid>;
  updateBidStatus(id: string, status: "pending" | "accepted" | "rejected"): Promise<void>;
  
  // Documents
  getUserDocuments(userId: string): Promise<Document[]>;
  getTransporterDocuments(transporterId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    await db.update(users).set({ isOnline }).where(eq(users.id, id));
  }

  // Transporters
  async getTransporter(id: string): Promise<Transporter | undefined> {
    const [transporter] = await db.select().from(transporters).where(eq(transporters.id, id));
    return transporter || undefined;
  }

  async getAllTransporters(): Promise<Transporter[]> {
    return await db.select().from(transporters).orderBy(desc(transporters.createdAt));
  }

  async getPendingTransporters(): Promise<Transporter[]> {
    return await db.select().from(transporters).where(eq(transporters.status, "pending_approval"));
  }

  async createTransporter(insertTransporter: InsertTransporter): Promise<Transporter> {
    const [transporter] = await db.insert(transporters).values(insertTransporter).returning();
    return transporter;
  }

  async updateTransporterStatus(id: string, status: "active" | "pending_approval" | "suspended"): Promise<void> {
    await db.update(transporters).set({ status }).where(eq(transporters.id, id));
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
      status: "active"
    }).where(eq(rides.id, rideId));
  }

  // Bids
  async getBid(id: string): Promise<Bid | undefined> {
    const [bid] = await db.select().from(bids).where(eq(bids.id, id));
    return bid || undefined;
  }

  async getRideBids(rideId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.rideId, rideId)).orderBy(desc(bids.createdAt));
  }

  async getUserBids(userId: string): Promise<Bid[]> {
    return await db.select().from(bids).where(eq(bids.userId, userId)).orderBy(desc(bids.createdAt));
  }

  async createBid(insertBid: InsertBid): Promise<Bid> {
    const [bid] = await db.insert(bids).values(insertBid).returning();
    return bid;
  }

  async updateBidStatus(id: string, status: "pending" | "accepted" | "rejected"): Promise<void> {
    await db.update(bids).set({ status }).where(eq(bids.id, id));
  }

  // Documents
  async getUserDocuments(userId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.userId, userId));
  }

  async getTransporterDocuments(transporterId: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.transporterId, transporterId));
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(insertDocument).returning();
    return document;
  }
}

export const storage = new DatabaseStorage();
