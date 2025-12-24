import { CUSTOMER_API_BASE } from "../config/api";

export async function trackLogin(user: { id: string; name?: string; email?: string; phone?: string }) {
  try {
    await fetch(`${CUSTOMER_API_BASE}/api/customer-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    await fetch(`${CUSTOMER_API_BASE}/api/customer-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    await fetch(`${CUSTOMER_API_BASE}/api/customer-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
