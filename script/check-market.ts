import { db } from "../server/db";
import { users, transporters, rides, documents } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { storage } from "../server/storage";

async function run() {
    console.log("--- LATEST RIDES ---");
    const latestRides = await db.select().from(rides).orderBy(desc(rides.createdAt)).limit(5);
    console.log(JSON.stringify(latestRides, null, 2));

    console.log("\n--- TRANSPORTER: Chamu@123 ---");
    // Assuming the user's phone is 2233445566 as per previous instruction
    const user = await db.query.users.findFirst({
        where: eq(users.phone, "2233445566")
    });

    if (!user) {
        console.log("User not found!");
    } else {
        console.log("User:", user.id, user.name, "Transporter ID:", user.transporterId);
        if (user.transporterId) {
            const transporter = await db.query.transporters.findFirst({
                where: eq(transporters.id, user.transporterId)
            });
            console.log("Transporter Status:", transporter?.status, "Verification:", transporter?.verificationStatus, "Type:", transporter?.transporterType);

            const eligibility = await storage.getTransporterOnboardingStatus(user.transporterId);
            console.log("Onboarding Status:", JSON.stringify(eligibility, null, 2));

            const docs = await db.select().from(documents).where(eq(documents.transporterId, user.transporterId));
            console.log("Transporter Documents:", docs.map(d => ({ type: d.type, status: d.status, entityType: d.entityType })));
        }
    }

    process.exit(0);
}

run().catch(console.error);
