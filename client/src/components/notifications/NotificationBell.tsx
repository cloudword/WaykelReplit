import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead
} from "@/lib/notificationsApi";
import { Bell } from "lucide-react";

interface Notification {
  id: number;
  recipientId: string | null;
  recipientTransporterId: string | null;
  type: string;
  title: string;
  message: string;
  rideId: string | null;
  bidId: string | null;
  isRead: boolean;
  createdAt: string;
  matchScore: number | null;
  matchReason: string | null;
  notificationType: string | null;
  actionType: string | null;
  entityType: string | null;
  entityId: string | null;
  deepLink: string | null;
}

export default function NotificationBell() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUnread() {
    try {
      const res = await getUnreadCount();
      setUnreadCount(res.count || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }

  async function openDropdown() {
    setOpen(!open);
    if (!open) {
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    }
  }

  function getNotificationDestination(notification: Notification): string | null {
    const { type, rideId, deepLink } = notification;
    
    if (deepLink) {
      console.log("[NotificationBell] Deep link available:", deepLink);
    }
    
    const user = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const role = user?.role || "customer";
    const isAdmin = user?.isSuperAdmin;
    
    switch (type) {
      case "new_booking":
        if (rideId) {
          if (isAdmin) return `/admin/trips`;
          if (role === "transporter") return `/transporter/marketplace`;
          if (role === "driver") return `/driver/rides`;
        }
        return null;
        
      case "bid_placed":
        if (rideId) {
          if (isAdmin) return `/admin/rides`;
          return `/customer/trips/${rideId}`;
        }
        return null;
        
      case "bid_accepted":
      case "ride_assigned":
        if (rideId) {
          if (isAdmin) return `/admin/trips`;
          if (role === "transporter") return `/transporter/trips`;
          if (role === "driver") return `/driver/rides`;
          return `/customer/trips/${rideId}`;
        }
        return null;
        
      case "system":
        if (notification.title?.includes("Document")) {
          if (rideId) {
            if (role === "transporter") return `/transporter/trips`;
            if (role === "driver") return `/driver/profile`;
          }
          if (role === "transporter") return `/transporter/documents`;
          return null;
        }
        if (notification.title?.includes("Account Approved") || notification.title?.includes("Account Verification")) {
          if (role === "transporter") return `/transporter`;
          return null;
        }
        return null;
        
      default:
        return null;
    }
  }

  async function handleNotificationClick(notification: any) {
    if (!notification.isRead) {
      await markAsRead(notification.id);
      setNotifications(n =>
        n.map(x => x.id === notification.id ? { ...x, isRead: true } : x)
      );
      fetchUnread();
    }
    
    const destination = getNotificationDestination(notification);
    if (destination) {
      setOpen(false);
      setLocation(destination);
    }
  }

  async function handleMarkAllRead() {
    await markAllRead();
    setNotifications(n => n.map(x => ({ ...x, isRead: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" data-testid="notification-bell">
      <button 
        onClick={openDropdown}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
        data-testid="notification-bell-button"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
            data-testid="notification-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div 
          className="fixed right-4 top-16 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[60] flex flex-col"
          style={{ maxHeight: 'min(70vh, 500px)' }}
          data-testid="notification-dropdown"
        >
          <div className="p-3 border-b font-semibold flex justify-between items-center flex-shrink-0">
            <span>Notifications</span>
            {notifications.length > 0 && (
              <button 
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline"
                data-testid="mark-all-read-button"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 min-h-0">
            {notifications.length === 0 && (
              <div className="p-4 text-center text-gray-500" data-testid="no-notifications">
                No notifications
              </div>
            )}

            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  n.isRead ? "opacity-60" : "bg-blue-50 dark:bg-blue-900/20"
                }`}
                data-testid={`notification-item-${n.id}`}
              >
                <div className="font-medium text-sm">{n.title}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{n.message}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div 
          className="fixed inset-0 z-[55] bg-black/20" 
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
