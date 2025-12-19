import { API_BASE } from "./api";

export async function getNotifications() {
  try {
    const res = await fetch(`${API_BASE}/notifications`, { credentials: "include" });
    if (!res.ok) {
      console.error("[notificationsApi] Failed to fetch notifications:", res.status);
      return [];
    }
    const data = await res.json();
    // Always return an array to prevent .map() errors
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[notificationsApi] Error fetching notifications:", error);
    return [];
  }
}

export async function getUnreadCount() {
  try {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, { credentials: "include" });
    if (!res.ok) {
      return { count: 0 };
    }
    const data = await res.json();
    return { count: data?.count ?? 0 };
  } catch (error) {
    console.error("[notificationsApi] Error fetching unread count:", error);
    return { count: 0 };
  }
}

export async function markAsRead(id: string) {
  return fetch(`${API_BASE}/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
}

export async function markAllRead() {
  return fetch(`${API_BASE}/notifications/mark-all-read`, { method: "PATCH", credentials: "include" });
}
