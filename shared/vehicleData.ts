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
  // Two Wheeler
  { code: "BIKE_SCOOTER", name: "Bike / Scooter", category: "TWO_WHEELER", minPayloadKg: 0, maxPayloadKg: 40, defaultLengthFt: null },
  
  // Three Wheeler
  { code: "CARGO_AUTO", name: "Cargo Auto", category: "THREE_WHEELER", minPayloadKg: 500, maxPayloadKg: 700, defaultLengthFt: null },
  { code: "E_RICKSHAW", name: "E-Rickshaw (Cargo)", category: "THREE_WHEELER", minPayloadKg: 300, maxPayloadKg: 500, defaultLengthFt: null },
  
  // LCV - Light Commercial Vehicle
  { code: "TATA_ACE", name: "Tata Ace / Chota Hathi", category: "LCV", minPayloadKg: 500, maxPayloadKg: 750, defaultLengthFt: 8 },
  { code: "MAHINDRA_JEETO", name: "Mahindra Jeeto", category: "LCV", minPayloadKg: 400, maxPayloadKg: 600, defaultLengthFt: 8 },
  { code: "ASHOK_LEYLAND_DOST", name: "Ashok Leyland Dost", category: "LCV", minPayloadKg: 1000, maxPayloadKg: 1250, defaultLengthFt: 10 },
  { code: "PICKUP_407", name: "Pickup 407 (Closed/Open)", category: "LCV", minPayloadKg: 1500, maxPayloadKg: 2500, defaultLengthFt: 14 },
  { code: "BOLERO_PICKUP", name: "Bolero Pickup", category: "LCV", minPayloadKg: 1000, maxPayloadKg: 1500, defaultLengthFt: 10 },
  
  // MCV - Medium Commercial Vehicle
  { code: "EICHER_14FT", name: "Eicher 14 ft", category: "MCV", minPayloadKg: 3000, maxPayloadKg: 4000, defaultLengthFt: 14 },
  { code: "EICHER_17FT", name: "Eicher 17 ft", category: "MCV", minPayloadKg: 4000, maxPayloadKg: 5000, defaultLengthFt: 17 },
  { code: "EICHER_19FT", name: "Eicher 19 ft", category: "MCV", minPayloadKg: 5000, maxPayloadKg: 7000, defaultLengthFt: 19 },
  { code: "TATA_1109", name: "Tata 1109 / 709", category: "MCV", minPayloadKg: 3000, maxPayloadKg: 5000, defaultLengthFt: 17 },
  
  // HCV - Heavy Commercial Vehicle
  { code: "CONTAINER_20FT", name: "20 ft Container", category: "HCV", minPayloadKg: 6000, maxPayloadKg: 7000, defaultLengthFt: 20 },
  { code: "CONTAINER_22FT", name: "22 ft Container", category: "HCV", minPayloadKg: 7000, maxPayloadKg: 8000, defaultLengthFt: 22 },
  { code: "CONTAINER_24FT", name: "24 ft Container", category: "HCV", minPayloadKg: 8000, maxPayloadKg: 10000, defaultLengthFt: 24 },
  { code: "CONTAINER_32FT_SINGLE", name: "32 ft Single Axle", category: "HCV", minPayloadKg: 7000, maxPayloadKg: 8000, defaultLengthFt: 32 },
  { code: "CONTAINER_32FT_MULTI", name: "32 ft Multi Axle", category: "HCV", minPayloadKg: 15000, maxPayloadKg: 18000, defaultLengthFt: 32 },
  { code: "TRAILER_40FT", name: "Trailer (40 ft)", category: "HCV", minPayloadKg: 20000, maxPayloadKg: 25000, defaultLengthFt: 40 },
  
  // SPV - Special Purpose Vehicle
  { code: "REFRIGERATED_TRUCK", name: "Refrigerated Truck", category: "SPV", minPayloadKg: 1000, maxPayloadKg: 15000, defaultLengthFt: null },
  { code: "TANKER", name: "Tanker", category: "SPV", minPayloadKg: 5000, maxPayloadKg: 25000, defaultLengthFt: null },
  { code: "CAR_CARRIER", name: "Car Carrier", category: "SPV", minPayloadKg: 0, maxPayloadKg: 0, defaultLengthFt: null },
  { code: "TIPPER_DUMPER", name: "Tipper / Dumper", category: "SPV", minPayloadKg: 5000, maxPayloadKg: 25000, defaultLengthFt: null },
  { code: "FLATBED_TRUCK", name: "Flatbed Truck", category: "SPV", minPayloadKg: 5000, maxPayloadKg: 25000, defaultLengthFt: null },
  { code: "CRANE_HYDRA", name: "Crane / Hydra", category: "SPV", minPayloadKg: 0, maxPayloadKg: 0, defaultLengthFt: null },
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
