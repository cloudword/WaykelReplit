import { Link, useLocation } from "wouter";
import { LayoutDashboard, Truck, Users, FileText, MapPin, Package, Gavel, BarChart3, LogOut, Building2, Settings, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import { motion } from "framer-motion";

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
    { href: "/transporter/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border/60 text-sidebar-foreground min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-all duration-300 shadow-xl shadow-black/5">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <Truck className="text-white h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">WAYKEL</h1>
              <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-widest">Transporter</span>
            </div>
          </motion.div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 px-4 overflow-y-auto min-h-0 space-y-1 pb-6" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Menu</p>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 shadow-sm"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-indicator-transporter"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-emerald-500 rounded-r-full"
                  />
                )}
                <item.icon size={18} className={isActive ? "text-emerald-600 dark:text-emerald-400" : "opacity-70"} />
                <span>{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
        <div className="bg-sidebar-accent/50 rounded-xl p-3 flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-inner">
            <span className="text-xs font-black text-white">TR</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">Transporter</p>
            <p className="text-xs text-muted-foreground truncate">
              {(() => {
                try {
                  const stored = localStorage.getItem("currentUser");
                  const user = stored ? JSON.parse(stored) : null;
                  return user?.entityId || "Portal";
                } catch { return "Portal"; }
              })()}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9"
          onClick={handleLogout}
        >
          <LogOut size={16} className="mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
}
