import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Truck, Wallet, Settings, LogOut, Building2, Gavel, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AdminSidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/transporters", icon: Building2, label: "Transporters" },
    { href: "/admin/bids", icon: Gavel, label: "Manage Bids" },
    { href: "/admin/drivers", icon: Users, label: "Drivers" },
    { href: "/admin/vehicles", icon: Truck, label: "Vehicles" },
    { href: "/admin/calendar", icon: Calendar, label: "Schedule" },
    { href: "/admin/earnings", icon: Wallet, label: "Earnings" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 bottom-0">
      <div className="p-6">
        <h1 className="text-2xl font-black tracking-tighter">
          WAY<span className="text-blue-500">KEL</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">Admin Panel</p>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors",
              location === item.href 
                ? "bg-blue-600 text-white" 
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}>
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <Button variant="ghost" className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-3">
          <LogOut size={20} />
          Logout
        </Button>
      </div>
    </div>
  );
}
