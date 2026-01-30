import { getApiUrl } from "./waykelApi";
import { withCsrfHeader } from "@/lib/api";

export async function trackLogin(user: { id: string; name?: string; email?: string; phone?: string }) {
  // Backend endpoint not yet implemented
  return;
}

export async function trackRegistration(user: { id: string; name?: string; email?: string; phone?: string }) {
  // Backend endpoint not yet implemented
  return;
}

export async function trackBidAccepted(user: { id: string; name?: string; email?: string; phone?: string }, bid: { bidId: string; rideId: string; transporterName?: string; amount?: string }) {
  // Backend endpoint not yet implemented
  return;
}
