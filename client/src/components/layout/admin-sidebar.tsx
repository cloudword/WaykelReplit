import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Truck, Wallet, Settings, LogOut, Building2, Gavel, Calendar, Shield, UserCheck, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AdminSidebar() {
  const [location] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "/auth/login";
  };

  const navItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/users", icon: Users, label: "User Management" },
    { href: "/admin/rides", icon: Gavel, label: "Bid Approvals" },
    { href: "/admin/transporters", icon: Building2, label: "Transporters" },
    { href: "/admin/customers", icon: UserCheck, label: "Customers" },
    { href: "/admin/vehicles", icon: Truck, label: "Vehicles" },
    { href: "/admin/trips", icon: Calendar, label: "Trip Scheduler" },
    { href: "/admin/earnings", icon: Wallet, label: "Revenue" },
    { href: "/admin/api-explorer", icon: Code, label: "API Explorer" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 bottom-0">
      <div className="p-6">
        <h1 className="text-2xl font-black tracking-tighter">
          WAY<span className="text-blue-500">KEL</span>
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Shield className="h-4 w-4 text-yellow-500" />
          <p className="text-xs text-yellow-500 font-semibold">Super Admin Panel</p>
        </div>
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
        <div className="mb-4 px-4">
          <p className="text-xs text-slate-500">Logged in as</p>
          <p className="text-sm font-medium text-white">Super Admin</p>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-3"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          Logout
        </Button>
      </div>
    </div>
  );
}
