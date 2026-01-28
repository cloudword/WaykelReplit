import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Truck, Wallet, Settings, LogOut, Building2, Gavel, Calendar, Shield, UserCheck, Code, ScrollText, ShieldCheck, HardDrive, DollarSign, ClipboardCheck, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NavSection {
  title: string;
  items: { href: string; icon: React.ComponentType<{ size?: number; className?: string }>; label: string }[];
  defaultExpanded?: boolean;
}

const sections: NavSection[] = [
  {
    title: "Overview",
    defaultExpanded: true,
    items: [
      { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    title: "Operations",
    defaultExpanded: true,
    items: [
      { href: "/admin/rides", icon: Gavel, label: "Bid Approvals" },
      { href: "/admin/trips", icon: Calendar, label: "Trip Scheduler" },
      { href: "/admin/transporters", icon: Building2, label: "Transporters" },
      { href: "/admin/customers", icon: UserCheck, label: "Customers" },
      { href: "/admin/vehicles", icon: Truck, label: "Vehicles" },
      { href: "/admin/earnings", icon: Wallet, label: "Revenue" },
    ],
  },
  {
    title: "Verification",
    defaultExpanded: true,
    items: [
      { href: "/admin/verification", icon: ClipboardCheck, label: "Verification Center" },
    ],
  },
  {
    title: "System",
    defaultExpanded: false,
    items: [
      { href: "/admin/users", icon: Users, label: "User Management" },
      { href: "/admin/roles", icon: ShieldCheck, label: "Roles & Permissions" },
      { href: "/admin/platform-settings", icon: DollarSign, label: "Monetization" },
      { href: "/admin/api-explorer", icon: Code, label: "API Explorer" },
      { href: "/admin/api-logs", icon: ScrollText, label: "API Logs" },
      { href: "/admin/storage", icon: HardDrive, label: "Storage" },
      { href: "/admin/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLDivElement>(null);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Overview": true,
    "Operations": true,
    "Verification": true,
    "System": false,
  });

  useEffect(() => {
    if (activeItemRef.current && navRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [location]);

  useEffect(() => {
    sections.forEach(section => {
      const hasActiveItem = section.items.some(item => location === item.href);
      if (hasActiveItem && !expandedSections[section.title]) {
        setExpandedSections(prev => ({ ...prev, [section.title]: true }));
      }
    });
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    window.location.href = "/auth/login";
  };

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="w-72 bg-sidebar border-r border-sidebar-border text-sidebar-foreground min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-50 transition-colors duration-300">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="text-primary-foreground h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none">WAYKEL</h1>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Admin Portal</span>
            </div>
          </motion.div>
          <NotificationBell />
        </div>
      </div>

      <nav
        ref={navRef}
        className="flex-1 px-4 overflow-y-auto min-h-0 space-y-6 pb-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {sections.map((section) => {
          const isExpanded = expandedSections[section.title];

          return (
            <div key={section.title} className="space-y-1">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>{section.title}</span>
                <ChevronDown
                  size={14}
                  className={cn("transition-transform duration-200", isExpanded ? "" : "-rotate-90")}
                />
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-1"
                  >
                    {section.items.map((item) => {
                      const isActive = location === item.href;

                      return (
                        <Link key={item.href} href={item.href}>
                          <motion.div
                            ref={isActive ? activeItemRef : undefined}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                              isActive
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                            )}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="active-indicator"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"
                              />
                            )}
                            <item.icon size={18} className={isActive ? "text-primary" : "opacity-70"} />
                            <span>{item.label}</span>
                          </motion.div>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border bg-sidebar/50 backdrop-blur-sm">
        <div className="bg-sidebar-accent/50 rounded-xl p-3 flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-inner">
            <span className="text-xs font-black text-white">SA</span>
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold truncate">Super Admin</p>
            <p className="text-xs text-muted-foreground truncate">System Root</p>
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
