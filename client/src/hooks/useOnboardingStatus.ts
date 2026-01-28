import { useQuery } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

export type OnboardingStep = {
  required: boolean;
  completed: boolean;
  label: string;
  description: string;
};

export type OnboardingStatus = {
  transporterType: "business" | "individual";
  onboardingStatus: "not_started" | "in_progress" | "completed" | "blocked";
  overallStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  transporterStatus: string;
  verificationStatus: string;
  steps: {
    businessVerification: OnboardingStep;
    addVehicle: OnboardingStep;
    addDriver: OnboardingStep;
  };
  completedCount: number;
  totalCount: number;
  isComplete: boolean;
  canBid: boolean;
};

export function useOnboardingStatus(transporterId?: string) {
  return useQuery<OnboardingStatus>({
    queryKey: ["onboarding-status", transporterId],
    enabled: !!transporterId,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/transporter/onboarding-status`, {
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
