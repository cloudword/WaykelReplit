import { db } from "./db";
import { users, transporters, vehicles, rides, bids } from "@shared/schema";
import bcrypt from "bcrypt";

const HASH_PASSWORD = async (password: string) => bcrypt.hash(password, 10);

async function seed() {
  try {
    console.log("🌱 Starting database seed...");

    // Clear existing data
    await db.delete(bids);
    await db.delete(rides);
    await db.delete(vehicles);
    await db.delete(transporters);
    await db.delete(users);

    // Create Super Admin user with specified credentials
    const superAdminPassword = await HASH_PASSWORD("Waykel6@singh");
    const admin = await db
      .insert(users)
      .values({
        name: "Super Admin",
        username: "waykelAdmin",
        email: "admin@waykel.com",
        phone: "8699957305",
        password: superAdminPassword,
        role: "admin",
        isSuperAdmin: true,
      })
      .returning();

    console.log("✅ Super Admin created");

    // Create transporters
    const transporter1 = await db
      .insert(transporters)
      .values({
        companyName: "Swift Logistics",
        ownerName: "Raj Kumar",
        contact: "9876543210",
        email: "swift@waykel.com",
        status: "active",
        fleetSize: 5,
        location: "Mumbai",
        baseCity: "Mumbai",
        preferredRoutes: ["Mumbai-Pune", "Mumbai-Nashik"],
      })
      .returning();

    const transporter2 = await db
      .insert(transporters)
      .values({
        companyName: "Express Movers",
        ownerName: "Priya Singh",
        contact: "9123456789",
        email: "express@waykel.com",
        status: "active",
        fleetSize: 3,
        location: "Delhi",
        baseCity: "Delhi",
        preferredRoutes: ["Delhi-Jaipur", "Delhi-Agra"],
      })
      .returning();

    console.log("✅ Transporters created");

    // Create driver users
    const driverPassword = await HASH_PASSWORD("driver123");
    const driver1 = await db
      .insert(users)
      .values({
        name: "Amit Singh",
        email: "amit@waykel.com",
        phone: "9111111111",
        password: driverPassword,
        role: "driver",
        transporterId: transporter1[0].id,
        isOnline: true,
        rating: "4.8",
        totalTrips: 245,
        earningsToday: "1250.50",
      })
      .returning();

    const driver2 = await db
      .insert(users)
      .values({
        name: "Vikram Patel",
        email: "vikram@waykel.com",
        phone: "9222222222",
        password: driverPassword,
        role: "driver",
        transporterId: transporter1[0].id,
        isOnline: true,
        rating: "4.6",
        totalTrips: 189,
        earningsToday: "980.75",
      })
      .returning();

    const driver3 = await db
      .insert(users)
      .values({
        name: "Neha Sharma",
        email: "neha@waykel.com",
        phone: "9333333333",
        password: driverPassword,
        role: "driver",
        transporterId: transporter2[0].id,
        isOnline: false,
        rating: "4.9",
        totalTrips: 312,
        earningsToday: "0",
      })
      .returning();

    console.log("✅ Drivers created");

    // Create customer user
    const customerPassword = await HASH_PASSWORD("customer123");
    const customer1 = await db
      .insert(users)
      .values({
        name: "Rahul Mehta",
        email: "rahul@example.com",
        phone: "9000000001",
        password: customerPassword,
        role: "customer",
      })
      .returning();

    console.log("✅ Customer created");

    // Create vehicles for drivers
    const vehicle1 = await db
      .insert(vehicles)
      .values({
        userId: driver1[0].id,
        type: "Truck",
        plateNumber: "MH01AB1234",
        model: "Ashok Leyland 1616",
        capacity: "16 Ton",
        status: "active",
      })
      .returning();

    const vehicle2 = await db
      .insert(vehicles)
      .values({
        userId: driver2[0].id,
        type: "Tempo",
        plateNumber: "MH01CD5678",
        model: "Tata 407",
        capacity: "6 Ton",
        status: "active",
      })
      .returning();

    const vehicle3 = await db
      .insert(vehicles)
      .values({
        userId: driver3[0].id,
        type: "Truck",
        plateNumber: "DL01EF9101",
        model: "Tata 1613",
        capacity: "16 Ton",
        status: "active",
      })
      .returning();

    console.log("✅ Vehicles created");

    // Create rides (loads)
    const ride1 = await db
      .insert(rides)
      .values({
        pickupLocation: "Fort, Mumbai",
        dropLocation: "Pune City",
        pickupTime: "09:00",
        date: "2024-12-05",
        status: "pending",
        price: "2500.00",
        distance: "180 km",
        cargoType: "Electronics",
        weight: "5 Ton",
        customerName: "TechCorp India",
        customerPhone: "9111122223",
        transporterId: transporter1[0].id,
        createdById: admin[0].id,
      })
      .returning();

    const ride2 = await db
      .insert(rides)
      .values({
        pickupLocation: "Nashik City",
        dropLocation: "Aurangabad",
        pickupTime: "14:30",
        date: "2024-12-05",
        status: "pending",
        price: "1800.00",
        distance: "120 km",
        cargoType: "Textiles",
        weight: "8 Ton",
        customerName: "Textile Mills Ltd",
        customerPhone: "9444444444",
        transporterId: transporter1[0].id,
        createdById: admin[0].id,
      })
      .returning();

    const ride3 = await db
      .insert(rides)
      .values({
        pickupLocation: "Connaught Place, Delhi",
        dropLocation: "Jaipur",
        pickupTime: "10:00",
        date: "2024-12-05",
        status: "pending",
        price: "3200.00",
        distance: "260 km",
        cargoType: "Machinery",
        weight: "12 Ton",
        customerName: "Industrial Solutions",
        customerPhone: "9555555555",
        transporterId: transporter2[0].id,
        createdById: admin[0].id,
      })
      .returning();

    const ride4 = await db
      .insert(rides)
      .values({
        pickupLocation: "Bandra, Mumbai",
        dropLocation: "Surat Port",
        pickupTime: "06:00",
        date: "2024-12-06",
        status: "bid_placed",
        price: "1500.00",
        distance: "280 km",
        cargoType: "Chemicals",
        weight: "10 Ton",
        customerName: "Chemical Industries",
        customerPhone: "9666666666",
        transporterId: transporter1[0].id,
        createdById: admin[0].id,
        assignedDriverId: driver1[0].id,
        assignedVehicleId: vehicle1[0].id,
      })
      .returning();

    console.log("✅ Rides created");

    // Create bids
    await db
      .insert(bids)
      .values({
        rideId: ride1[0].id,
        userId: driver1[0].id,
        transporterId: transporter1[0].id,
        vehicleId: vehicle1[0].id,
        amount: "2500.00",
        status: "pending",
      })
      .returning();

    await db
      .insert(bids)
      .values({
        rideId: ride1[0].id,
        userId: driver2[0].id,
        transporterId: transporter1[0].id,
        vehicleId: vehicle2[0].id,
        amount: "2300.00",
        status: "pending",
      })
      .returning();

    await db
      .insert(bids)
      .values({
        rideId: ride3[0].id,
        userId: driver3[0].id,
        transporterId: transporter2[0].id,
        vehicleId: vehicle3[0].id,
        amount: "3200.00",
        status: "pending",
      })
      .returning();

    console.log("✅ Bids created");

    console.log("\n✨ Database seeded successfully!\n");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
