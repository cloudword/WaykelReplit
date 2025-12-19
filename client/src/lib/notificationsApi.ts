import { API_BASE } from "./api";

export async function getNotifications() {
  const res = await fetch(`${API_BASE}/notifications`, { credentials: "include" });
  return res.json();
}

export async function getUnreadCount() {
  const res = await fetch(`${API_BASE}/notifications/unread-count`, { credentials: "include" });
  return res.json();
}

export async function markAsRead(id: string) {
  return fetch(`${API_BASE}/notifications/${id}/read`, { method: "PATCH", credentials: "include" });
}

export async function markAllRead() {
  return fetch(`${API_BASE}/notifications/mark-all-read`, { method: "PATCH", credentials: "include" });
}
