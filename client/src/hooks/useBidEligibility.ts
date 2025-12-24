import { useQuery } from "@tanstack/react-query";
import { transporterApi } from "@/lib/api";

export type BidEligibility = {
  canBid: boolean;
  reason?:
    | "not_verified"
    | "missing_vehicle"
    | "missing_driver"
    | "business_docs_required"
    | "suspended"
    | null;
};

export function useBidEligibility(transporterId?: string) {
  return useQuery<BidEligibility>({
    queryKey: ["bid-eligibility", transporterId || "missing-id"],
    enabled: Boolean(transporterId),
    staleTime: 15_000,
    queryFn: async () => {
      if (!transporterId) throw new Error("transporterId is required for eligibility lookup");
      return transporterApi.getBidEligibility(transporterId) as Promise<BidEligibility>;
    },
  });
}
