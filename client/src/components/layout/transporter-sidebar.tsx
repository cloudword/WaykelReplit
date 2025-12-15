import { Link, useLocation } from "wouter";
import { LayoutDashboard, Truck, Users, FileText, MapPin, Package, Gavel, BarChart3, LogOut, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function TransporterSidebar() {
  const [location] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "/auth/login";
  };

  const navItems = [
    { href: "/transporter", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/transporter/trips", icon: Package, label: "Trips" },
    { href: "/transporter/marketplace", icon: MapPin, label: "Marketplace" },
    { href: "/transporter/bids", icon: Gavel, label: "Bids" },
    { href: "/transporter/vehicles", icon: Truck, label: "Vehicles" },
    { href: "/transporter/drivers", icon: Users, label: "Drivers" },
    { href: "/transporter/documents", icon: FileText, label: "Documents" },
    { href: "/transporter/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/transporter/addresses", icon: MapPin, label: "Saved Addresses" },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-50">
      <div className="p-6">
        <h1 className="text-2xl font-black tracking-tighter">
          WAY<span className="text-blue-500">KEL</span>
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <Building2 className="h-4 w-4 text-emerald-500" />
          <p className="text-xs text-emerald-500 font-semibold">Transporter Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div 
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors",
                location === item.href 
                  ? "bg-blue-600 text-white" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <item.icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="mb-4 px-4">
          <p className="text-xs text-slate-500">Logged in as</p>
          <p className="text-sm font-medium text-white">Transporter</p>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-3"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut size={20} />
          Logout
        </Button>
      </div>
    </div>
  );
}
