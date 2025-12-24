import { useQuery } from "@tanstack/react-query";
import { transporterApi } from "@/lib/api";

export type BidEligibility = {
  canBid: boolean;
  eligible?: boolean;
  reason?: string | null;
  blockingReason?: string | null;
  transporterType?: "business" | "individual";
  requireBusinessDocs?: boolean;
  businessOk?: boolean;
  vehiclesOk?: boolean;
  driversOk?: boolean;
  overallStatus?: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
  overallStatusLegacy?: string;
  transporterStatus?: string;
  verificationStatus?: string;
  onboardingStatus?: string;
};

export function useBidEligibility(transporterId?: string) {
  return useQuery<BidEligibility>({
    queryKey: ["bid-eligibility", transporterId || "self"],
    enabled: true,
    staleTime: 15_000,
    queryFn: async () => {
      const data = await transporterApi.getBidEligibility(transporterId);
      return data as BidEligibility;
    },
  });
}
