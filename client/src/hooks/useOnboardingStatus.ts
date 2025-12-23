import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export type OnboardingStatus = {
  transporter?: { completed: boolean };
  businessDocuments: { status: "not_required" | "not_started" | "pending" | "approved" | "rejected" };
  vehicles: { count: number; completed: boolean };
  drivers: { count: number; completed: boolean };
  overallStatus: "not_started" | "in_progress" | "completed";
};

export function useOnboardingStatus(transporterId?: string) {
  return useQuery<OnboardingStatus>({
    queryKey: ["onboarding-status", transporterId],
    enabled: !!transporterId,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/transporters/${transporterId}/onboarding-status`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch onboarding status");
      }
      const data = await res.json();
      return data as OnboardingStatus;
    },
  });
}
