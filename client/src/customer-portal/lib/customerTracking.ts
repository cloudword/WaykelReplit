import { getApiUrl } from "./waykelApi";
import { withCsrfHeader } from "@/lib/api";

export async function trackLogin(user: { id: string; name?: string; email?: string; phone?: string }) {
  try {
    await fetch(getApiUrl("/customer-events"), {
      method: "POST",
      headers: withCsrfHeader({ "Content-Type": "application/json" }) as HeadersInit,
      credentials: "include",
      body: JSON.stringify({
        event: "customer_login",
        user,
      }),
    });
  } catch (error) {
    console.error("Failed to track login", error);
  }
}

export async function trackRegistration(user: { id: string; name?: string; email?: string; phone?: string }) {
  try {
    await fetch(getApiUrl("/customer-events"), {
      method: "POST",
      headers: withCsrfHeader({ "Content-Type": "application/json" }) as HeadersInit,
      credentials: "include",
      body: JSON.stringify({
        event: "customer_registration",
        user,
      }),
    });
  } catch (error) {
    console.error("Failed to track registration", error);
  }
}

export async function trackBidAccepted(user: { id: string; name?: string; email?: string; phone?: string }, bid: { bidId: string; rideId: string; transporterName?: string; amount?: string }) {
  try {
    await fetch(getApiUrl("/customer-events"), {
      method: "POST",
      headers: withCsrfHeader({ "Content-Type": "application/json" }) as HeadersInit,
      credentials: "include",
      body: JSON.stringify({
        event: "customer_bid_accepted",
        user,
        bid,
      }),
    });
  } catch (error) {
    console.error("Failed to track bid acceptance", error);
  }
}
