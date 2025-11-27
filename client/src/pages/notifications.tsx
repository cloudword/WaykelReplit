import { useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ArrowLeft, Bell, Calendar, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: "New Load Available",
    message: "A new load matching your vehicle type is available in Andheri East.",
    time: "2 mins ago",
    type: "info",
    read: false
  },
  {
    id: 2,
    title: "Payment Received",
    message: "Weekly payout of ₹14,350 has been credited to your bank account.",
    time: "2 hours ago",
    type: "success",
    read: true
  },
  {
    id: 3,
    title: "Document Expiring Soon",
    message: "Your vehicle insurance for MH 12 DE 1432 expires in 5 days. Please renew.",
    time: "1 day ago",
    type: "warning",
    read: true
  },
  {
    id: 4,
    title: "Ride Completed",
    message: "You successfully completed the trip ID #8823. Earnings added.",
    time: "2 days ago",
    type: "success",
    read: true
  }
];

export default function Notifications() {
  const [_, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/driver")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Notifications</h1>
      </header>

      <main className="p-4 space-y-4">
        {MOCK_NOTIFICATIONS.map((notification) => (
          <div 
            key={notification.id} 
            className={cn(
              "bg-white p-4 rounded-xl shadow-sm border-l-4",
              notification.read ? "opacity-70" : "opacity-100",
              notification.type === "info" && "border-l-blue-500",
              notification.type === "success" && "border-l-green-500",
              notification.type === "warning" && "border-l-yellow-500"
            )}
          >
            <div className="flex gap-3">
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                notification.type === "info" && "bg-blue-50 text-blue-600",
                notification.type === "success" && "bg-green-50 text-green-600",
                notification.type === "warning" && "bg-yellow-50 text-yellow-600"
              )}>
                {notification.type === "info" && <Bell className="h-5 w-5" />}
                {notification.type === "success" && <CheckCircle className="h-5 w-5" />}
                {notification.type === "warning" && <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{notification.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {notification.message}
                </p>
                <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {notification.time}
                </p>
              </div>
            </div>
          </div>
        ))}
      </main>
      <MobileNav />
    </div>
  );
}
