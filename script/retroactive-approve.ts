import { db } from '../server/db.js';
import { transporters } from '../shared/schema.js';
import { storage } from '../server/storage.js';
import { not, eq } from 'drizzle-orm';

async function migrate() {
  console.log('Starting retroactive approval check for existing transporters...');
  const pendingTransporters = await db.select().from(transporters).where(not(eq(transporters.status, 'active')));

  console.log(`Found ${pendingTransporters.length} transporters that are not active.`);

  let approvedCount = 0;
  for (const t of pendingTransporters) {
    const onboardingStatus = await storage.getTransporterOnboardingStatus(t.id);
    if (onboardingStatus) {
      const isBusiness = onboardingStatus.transporterType === "business";
      const isReadyToApprove = (!isBusiness || onboardingStatus.hasBusinessDocs) &&
        onboardingStatus.hasApprovedVehicle &&
        onboardingStatus.hasApprovedDriver;

      if (isReadyToApprove) {
        // Assume admin ID is system
        await storage.approveTransporter(t.id, t.userId || 'system-migration');
        console.log(`Retroactively approved transporter: ${t.companyName} (${t.id})`);
        approvedCount++;
      }
    }
  }

  console.log(`Migration complete. Approved ${approvedCount} transporters.`);
}

migrate()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
