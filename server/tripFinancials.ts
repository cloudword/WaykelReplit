import { storage } from "./storage";
import { db } from "./db";
import { rides, ledgerEntries, type InsertLedgerEntry, type PlatformSettings } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface PlatformFeeConfig {
  basePercent: number;
  minFee: number;
  maxFee: number;
  tierThresholds?: {
    amount: number;
    percent: number;
  }[];
}

const DEFAULT_FEE_CONFIG: PlatformFeeConfig = {
  basePercent: 10,
  minFee: 50,
  maxFee: 5000,
  tierThresholds: [
    { amount: 5000, percent: 10 },
    { amount: 10000, percent: 8 },
    { amount: 25000, percent: 6 },
    { amount: 50000, percent: 5 }
  ]
};

export function settingsToFeeConfig(settings: PlatformSettings): PlatformFeeConfig {
  return {
    basePercent: settings.basePercent ? parseFloat(settings.basePercent) : 10,
    minFee: settings.minFee ? parseFloat(settings.minFee) : 50,
    maxFee: settings.maxFee ? parseFloat(settings.maxFee) : 5000,
    tierThresholds: (settings.tierConfig as { amount: number; percent: number }[] | null) || DEFAULT_FEE_CONFIG.tierThresholds
  };
}

export function calculatePlatformFee(
  bidAmount: number,
  config: PlatformFeeConfig = DEFAULT_FEE_CONFIG
): { platformFee: number; feePercent: number; transporterEarning: number } {
  let feePercent = config.basePercent;

  if (config.tierThresholds && config.tierThresholds.length > 0) {
    const sortedTiers = [...config.tierThresholds].sort((a, b) => b.amount - a.amount);
    for (const tier of sortedTiers) {
      if (bidAmount >= tier.amount) {
        feePercent = tier.percent;
        break;
      }
    }
  }

  let platformFee = (bidAmount * feePercent) / 100;
  platformFee = Math.max(config.minFee, Math.min(config.maxFee, platformFee));
  platformFee = Math.round(platformFee * 100) / 100;

  const transporterEarning = Math.round((bidAmount - platformFee) * 100) / 100;

  return {
    platformFee,
    feePercent,
    transporterEarning
  };
}

export interface TripFinancials {
  finalPrice: number;
  platformFee: number;
  platformFeePercent: number;
  transporterEarning: number;
  shadowPlatformFee: number;
  shadowPlatformFeePercent: number;
  commissionEnabled: boolean;
  commissionMode: "shadow" | "live";
}

export function computeTripFinancials(
  bidAmount: number | string,
  config?: PlatformFeeConfig,
  settings?: { commissionEnabled: boolean; commissionMode: "shadow" | "live" }
): TripFinancials {
  const amount = typeof bidAmount === "string" ? parseFloat(bidAmount) : bidAmount;
  
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid bid amount: ${bidAmount}`);
  }

  const { platformFee, feePercent, transporterEarning: rawTransporterEarning } = calculatePlatformFee(amount, config);
  
  const commissionEnabled = settings?.commissionEnabled ?? false;
  const commissionMode = settings?.commissionMode ?? "shadow";
  
  const appliedFee = commissionEnabled ? platformFee : 0;
  const appliedPercent = commissionEnabled ? feePercent : 0;
  const appliedTransporterEarning = commissionEnabled ? rawTransporterEarning : amount;

  return {
    finalPrice: amount,
    platformFee: appliedFee,
    platformFeePercent: appliedPercent,
    transporterEarning: appliedTransporterEarning,
    shadowPlatformFee: platformFee,
    shadowPlatformFeePercent: feePercent,
    commissionEnabled,
    commissionMode
  };
}

export async function computeTripFinancialsWithSettings(
  bidAmount: number | string
): Promise<TripFinancials> {
  const settings = await storage.getPlatformSettings();
  const config = settingsToFeeConfig(settings);
  
  return computeTripFinancials(bidAmount, config, {
    commissionEnabled: settings.commissionEnabled ?? false,
    commissionMode: (settings.commissionMode as "shadow" | "live") ?? "shadow"
  });
}

export async function lockTripFinancials(
  rideId: string,
  bidAmount: number | string,
  acceptedByUserId?: string
): Promise<TripFinancials> {
  const financials = await computeTripFinancialsWithSettings(bidAmount);

  console.log(`[TripFinancials] Locking financials for ride ${rideId}:`, {
    finalPrice: financials.finalPrice,
    platformFee: financials.platformFee,
    platformFeePercent: financials.platformFeePercent,
    transporterEarning: financials.transporterEarning,
    shadowPlatformFee: financials.shadowPlatformFee,
    shadowPlatformFeePercent: financials.shadowPlatformFeePercent,
    commissionEnabled: financials.commissionEnabled
  });

  await storage.updateRideFinancials(rideId, {
    finalPrice: financials.finalPrice.toString(),
    platformFee: financials.platformFee.toString(),
    transporterEarning: financials.transporterEarning.toString(),
    platformFeePercent: financials.platformFeePercent.toString(),
    shadowPlatformFee: financials.shadowPlatformFee.toString(),
    shadowPlatformFeePercent: financials.shadowPlatformFeePercent.toString(),
    financialLockedAt: new Date()
  });

  return financials;
}

export async function createTripLedgerEntries(
  rideId: string,
  transporterId: string | null,
  financials: TripFinancials,
  createdById?: string
): Promise<void> {
  const entries: Omit<InsertLedgerEntry, "id" | "createdAt">[] = [
    {
      rideId,
      transporterId: transporterId || undefined,
      entryType: "trip_revenue",
      amount: financials.finalPrice.toString(),
      description: `Trip revenue from customer`,
      referenceType: "ride"
    },
    {
      rideId,
      transporterId: transporterId || undefined,
      entryType: "platform_fee",
      amount: (-financials.platformFee).toString(),
      description: financials.commissionEnabled 
        ? `Platform fee (${financials.platformFeePercent}%)` 
        : `Platform fee waived (shadow: ${financials.shadowPlatformFeePercent}%)`,
      referenceType: "ride"
    },
    {
      rideId,
      transporterId: transporterId || undefined,
      entryType: "transporter_payout",
      amount: financials.transporterEarning.toString(),
      description: `Transporter earning after platform fee`,
      referenceType: "ride",
      createdById
    }
  ];

  for (const entry of entries) {
    await storage.createLedgerEntry(entry);
  }

  console.log(`[TripFinancials] Created ${entries.length} ledger entries for ride ${rideId}`);
}

export async function lockTripFinancialsAtomic(
  rideId: string,
  transporterId: string | null,
  bidAmount: number | string,
  createdById?: string
): Promise<TripFinancials> {
  const financials = await computeTripFinancialsWithSettings(bidAmount);

  console.log(`[TripFinancials] Atomically locking financials for ride ${rideId}:`, {
    finalPrice: financials.finalPrice,
    platformFee: financials.platformFee,
    platformFeePercent: financials.platformFeePercent,
    transporterEarning: financials.transporterEarning,
    shadowPlatformFee: financials.shadowPlatformFee,
    shadowPlatformFeePercent: financials.shadowPlatformFeePercent,
    commissionEnabled: financials.commissionEnabled
  });

  await db.transaction(async (tx) => {
    await tx.update(rides).set({
      finalPrice: financials.finalPrice.toString(),
      platformFee: financials.platformFee.toString(),
      transporterEarning: financials.transporterEarning.toString(),
      platformFeePercent: financials.platformFeePercent.toString(),
      shadowPlatformFee: financials.shadowPlatformFee.toString(),
      shadowPlatformFeePercent: financials.shadowPlatformFeePercent.toString(),
      financialLockedAt: new Date()
    }).where(eq(rides.id, rideId));

    const entries = [
      {
        rideId,
        transporterId: transporterId || undefined,
        entryType: "trip_revenue" as const,
        amount: financials.finalPrice.toString(),
        description: `Trip revenue from customer`,
        referenceType: "ride"
      },
      {
        rideId,
        transporterId: transporterId || undefined,
        entryType: "platform_fee" as const,
        amount: (-financials.platformFee).toString(),
        description: financials.commissionEnabled 
          ? `Platform fee (${financials.platformFeePercent}%)` 
          : `Platform fee waived (shadow: ${financials.shadowPlatformFeePercent}%)`,
        referenceType: "ride"
      },
      {
        rideId,
        transporterId: transporterId || undefined,
        entryType: "transporter_payout" as const,
        amount: financials.transporterEarning.toString(),
        description: `Transporter earning after platform fee`,
        referenceType: "ride",
        createdById
      }
    ];

    for (const entry of entries) {
      await tx.insert(ledgerEntries).values(entry);
    }
  });

  console.log(`[TripFinancials] Atomically created financials + 3 ledger entries for ride ${rideId}`);
  return financials;
}

export function validateFinancialsLocked(ride: {
  finalPrice?: string | null;
  platformFee?: string | null;
  transporterEarning?: string | null;
  financialLockedAt?: Date | null;
}): boolean {
  return !!(
    ride.finalPrice &&
    ride.platformFee &&
    ride.transporterEarning &&
    ride.financialLockedAt
  );
}

export function getFinancialSummary(ride: {
  finalPrice?: string | null;
  platformFee?: string | null;
  transporterEarning?: string | null;
  platformFeePercent?: string | null;
  shadowPlatformFee?: string | null;
  shadowPlatformFeePercent?: string | null;
  paymentStatus?: string | null;
}): {
  finalPrice: number;
  platformFee: number;
  transporterEarning: number;
  platformFeePercent: number;
  shadowPlatformFee: number;
  shadowPlatformFeePercent: number;
  paymentStatus: string;
  isLocked: boolean;
} | null {
  if (!ride.finalPrice || !ride.platformFee || !ride.transporterEarning) {
    return null;
  }

  return {
    finalPrice: parseFloat(ride.finalPrice),
    platformFee: parseFloat(ride.platformFee),
    transporterEarning: parseFloat(ride.transporterEarning),
    platformFeePercent: ride.platformFeePercent ? parseFloat(ride.platformFeePercent) : 0,
    shadowPlatformFee: ride.shadowPlatformFee ? parseFloat(ride.shadowPlatformFee) : 0,
    shadowPlatformFeePercent: ride.shadowPlatformFeePercent ? parseFloat(ride.shadowPlatformFeePercent) : 0,
    paymentStatus: ride.paymentStatus || "pending",
    isLocked: true
  };
}
