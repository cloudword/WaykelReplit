export type WeightUnit = "kg" | "ton";

export function kgToTons(kg: number): number {
  return kg / 1000;
}

export function tonsToKg(tons: number): number {
  return tons * 1000;
}

export function formatWeight(weightKg: number, preferredUnit?: WeightUnit): { value: number; unit: WeightUnit; display: string } {
  if (preferredUnit === "ton" || (!preferredUnit && weightKg >= 1000)) {
    const tons = kgToTons(weightKg);
    return {
      value: tons,
      unit: "ton",
      display: `${tons.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Ton`,
    };
  }
  return {
    value: weightKg,
    unit: "kg",
    display: `${weightKg.toLocaleString("en-IN")} kg`,
  };
}

export function formatWeightWithBoth(weightKg: number): string {
  if (weightKg >= 1000) {
    const tons = kgToTons(weightKg);
    return `${tons.toLocaleString("en-IN", { maximumFractionDigits: 2 })} Ton (${weightKg.toLocaleString("en-IN")} kg)`;
  }
  return `${weightKg.toLocaleString("en-IN")} kg`;
}
