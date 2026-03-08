// Standardized Vehicle Categories and Types for Indian Logistics
// Based on RTO/GST/market usage - aligned with Porter, BlackBuck, Delhivery Freight

export const VEHICLE_CATEGORIES = [
  { code: "TWO_WHEELER", name: "Two Wheeler", description: "Documents, parcels, hyperlocal delivery" },
  { code: "THREE_WHEELER", name: "Three Wheeler", description: "Urban & semi-urban logistics" },
  { code: "LCV", name: "Light Commercial Vehicle (LCV)", description: "Most common category" },
  { code: "MCV", name: "Medium Commercial Vehicle (MCV)", description: "Intercity and bulk movement" },
  { code: "HCV", name: "Heavy Commercial Vehicle (HCV)", description: "Long-haul freight" },
  { code: "SPV", name: "Special Purpose Vehicle (SPV)", description: "Specialized transport" },
] as const;

export type VehicleCategoryCode = typeof VEHICLE_CATEGORIES[number]["code"];

export const VEHICLE_TYPES = [
  // Last-mile / Hyperlocal
  { code: "TWO_WHEELER", name: "Two-Wheeler Delivery", category: "TWO_WHEELER", minPayloadKg: 20, maxPayloadKg: 40, defaultLengthFt: null },
  { code: "THREE_WHEELER_CARGO", name: "3-Wheeler Cargo Auto", category: "THREE_WHEELER", minPayloadKg: 300, maxPayloadKg: 500, defaultLengthFt: null },
  { code: "TATA_ACE_MINI", name: "Tata Ace / Mini Truck", category: "LCV", minPayloadKg: 750, maxPayloadKg: 1000, defaultLengthFt: 8 },
  { code: "PICKUP_TRUCK", name: "Pickup Truck", category: "LCV", minPayloadKg: 1000, maxPayloadKg: 1500, defaultLengthFt: 8 },

  // Light Truck Segment
  { code: "TRUCK_7FT", name: "7 ft truck", category: "LCV", minPayloadKg: 1000, maxPayloadKg: 1000, defaultLengthFt: 7 },
  { code: "TRUCK_9FT", name: "9 ft truck", category: "LCV", minPayloadKg: 1500, maxPayloadKg: 1500, defaultLengthFt: 9 },
  { code: "TRUCK_10FT", name: "10 ft truck", category: "LCV", minPayloadKg: 2000, maxPayloadKg: 2000, defaultLengthFt: 10 },
  { code: "TRUCK_12FT", name: "12 ft truck", category: "LCV", minPayloadKg: 2500, maxPayloadKg: 2500, defaultLengthFt: 12 },
  { code: "TRUCK_14FT", name: "14 ft truck", category: "LCV", minPayloadKg: 3000, maxPayloadKg: 4000, defaultLengthFt: 14 },

  // Medium Truck Segment
  { code: "TRUCK_17FT", name: "17 ft truck", category: "MCV", minPayloadKg: 5000, maxPayloadKg: 5000, defaultLengthFt: 17 },
  { code: "TRUCK_19FT", name: "19 ft truck", category: "MCV", minPayloadKg: 7000, maxPayloadKg: 7000, defaultLengthFt: 19 },
  { code: "TRUCK_20FT", name: "20 ft truck", category: "MCV", minPayloadKg: 7000, maxPayloadKg: 9000, defaultLengthFt: 20 },
  { code: "TRUCK_22FT", name: "22 ft truck", category: "MCV", minPayloadKg: 10000, maxPayloadKg: 10000, defaultLengthFt: 22 },

  // Container Trucks
  { code: "CONTAINER_19FT", name: "19 ft container", category: "HCV", minPayloadKg: 6000, maxPayloadKg: 7000, defaultLengthFt: 19 },
  { code: "CONTAINER_20FT", name: "20 ft container", category: "HCV", minPayloadKg: 6000, maxPayloadKg: 10000, defaultLengthFt: 20 },
  { code: "CONTAINER_22FT", name: "22 ft container", category: "HCV", minPayloadKg: 8000, maxPayloadKg: 10000, defaultLengthFt: 22 },
  { code: "CONTAINER_24FT", name: "24 ft container", category: "HCV", minPayloadKg: 10000, maxPayloadKg: 15000, defaultLengthFt: 24 },
  { code: "CONTAINER_32FT_SINGLE", name: "32 ft single axle container", category: "HCV", minPayloadKg: 7000, maxPayloadKg: 9000, defaultLengthFt: 32 },
  { code: "CONTAINER_32FT_MULTI", name: "32 ft multi axle container", category: "HCV", minPayloadKg: 14000, maxPayloadKg: 20000, defaultLengthFt: 32 },
  { code: "TRAILER_40FT_CONTAINER", name: "40 ft container trailer", category: "HCV", minPayloadKg: 20000, maxPayloadKg: 30000, defaultLengthFt: 40 },

  // Heavy Truck / Multi-Axle
  { code: "TRUCK_10_WHEEL", name: "10-wheel truck", category: "HCV", minPayloadKg: 16000, maxPayloadKg: 16000, defaultLengthFt: null },
  { code: "TRUCK_12_WHEEL", name: "12-wheel truck", category: "HCV", minPayloadKg: 20000, maxPayloadKg: 20000, defaultLengthFt: null },

  // Custom
  { code: "OTHER", name: "Other (Specify)", category: "SPV", minPayloadKg: 0, maxPayloadKg: 0, defaultLengthFt: null },
] as const;

export type VehicleTypeCode = typeof VEHICLE_TYPES[number]["code"];

export const BODY_TYPES = [
  { code: "OPEN", name: "Open" },
  { code: "CLOSED", name: "Closed / Box" },
  { code: "CONTAINER", name: "Container" },
  { code: "FLATBED", name: "Flatbed" },
  { code: "REFRIGERATED", name: "Refrigerated" },
  { code: "TANKER", name: "Tanker" },
] as const;

export type BodyTypeCode = typeof BODY_TYPES[number]["code"];

export const VEHICLE_LENGTHS = [
  { code: "8FT", name: "8 ft", valueFt: 8, description: "Mini pickup" },
  { code: "10FT", name: "10 ft", valueFt: 10, description: "Tata Ace" },
  { code: "14FT", name: "14 ft", valueFt: 14, description: "407 / Eicher" },
  { code: "17FT", name: "17 ft", valueFt: 17, description: "MCV" },
  { code: "19FT", name: "19 ft", valueFt: 19, description: "MCV" },
  { code: "20FT", name: "20 ft", valueFt: 20, description: "Container" },
  { code: "22FT", name: "22 ft", valueFt: 22, description: "Container" },
  { code: "24FT", name: "24 ft", valueFt: 24, description: "Container" },
  { code: "32FT", name: "32 ft", valueFt: 32, description: "HCV" },
  { code: "40FT", name: "40 ft", valueFt: 40, description: "Trailer" },
] as const;

export type VehicleLengthCode = typeof VEHICLE_LENGTHS[number]["code"];

export const AXLE_TYPES = [
  { code: "SINGLE", name: "Single Axle" },
  { code: "MULTI", name: "Multi Axle" },
] as const;

export type AxleTypeCode = typeof AXLE_TYPES[number]["code"];

export const FUEL_TYPES = [
  { code: "DIESEL", name: "Diesel" },
  { code: "PETROL", name: "Petrol" },
  { code: "CNG", name: "CNG" },
  { code: "ELECTRIC", name: "Electric" },
] as const;

export type FuelTypeCode = typeof FUEL_TYPES[number]["code"];

// Weight unit conversion utilities
export const WEIGHT_UNITS = {
  KG: "kg",
  TONS: "tons",
} as const;

export type WeightUnit = typeof WEIGHT_UNITS[keyof typeof WEIGHT_UNITS];

export function kgToTons(kg: number): number {
  return Math.round((kg / 1000) * 100) / 100; // Round to 2 decimal places
}

export function tonsToKg(tons: number): number {
  return Math.round(tons * 1000);
}

export function formatWeight(kg: number, preferredUnit?: WeightUnit): { value: number; unit: WeightUnit; display: string } {
  // Default: use Tons for >= 1000 kg, KG for smaller
  const useKg = preferredUnit === "kg" || (!preferredUnit && kg < 1000);

  if (useKg) {
    return { value: kg, unit: "kg", display: `${kg} Kg` };
  } else {
    const tons = kgToTons(kg);
    return { value: tons, unit: "tons", display: `${tons} Ton${tons !== 1 ? 's' : ''}` };
  }
}

export function parseWeightInput(value: string | number, unit: WeightUnit): { kg: number; tons: number } {
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return { kg: 0, tons: 0 };
  }

  if (unit === "kg") {
    return { kg: Math.round(numValue), tons: kgToTons(numValue) };
  } else {
    return { kg: tonsToKg(numValue), tons: numValue };
  }
}

// Helper to get vehicle types by category
export function getVehicleTypesByCategory(categoryCode: VehicleCategoryCode) {
  return VEHICLE_TYPES.filter(vt => vt.category === categoryCode);
}

// Helper to get vehicle type with formatted payload
export function getVehicleTypeDisplay(vehicleType: typeof VEHICLE_TYPES[number]): string {
  const { name, minPayloadKg, maxPayloadKg } = vehicleType;

  if (minPayloadKg === 0 && maxPayloadKg === 0) {
    return name;
  }

  // Format payload based on size
  if (maxPayloadKg >= 1000) {
    const minTons = kgToTons(minPayloadKg);
    const maxTons = kgToTons(maxPayloadKg);
    return `${name} (${minTons}-${maxTons} Tons)`;
  } else {
    return `${name} (${minPayloadKg}-${maxPayloadKg} Kg)`;
  }
}

// Get all vehicle types with display labels for customer selection
export function getVehicleTypesForCustomer() {
  return VEHICLE_TYPES.map(vt => ({
    ...vt,
    displayName: getVehicleTypeDisplay(vt),
    categoryName: VEHICLE_CATEGORIES.find(c => c.code === vt.category)?.name || vt.category,
  }));
}
