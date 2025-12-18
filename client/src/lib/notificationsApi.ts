export async function getNotifications() {
  const res = await fetch("/api/notifications");
  return res.json();
}

export async function getUnreadCount() {
  const res = await fetch("/api/notifications/unread-count");
  return res.json();
}

export async function markAsRead(id: string) {
  return fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllRead() {
  return fetch(`/api/notifications/mark-all-read`, { method: "PATCH" });
}
