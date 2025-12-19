import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Truck, Wallet, Settings, LogOut, Building2, Gavel, Calendar, Shield, UserCheck, Code, ScrollText, ShieldCheck, HardDrive, DollarSign, ClipboardCheck, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useEffect, useRef, useState } from "react";

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
      { href: "/admin/verification/transporters", icon: Building2, label: "Transporters" },
      { href: "/admin/verification/drivers", icon: Users, label: "Drivers" },
      { href: "/admin/verification/vehicles", icon: Truck, label: "Vehicles" },
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
  
  // Track which sections are expanded
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Overview": true,
    "Operations": true,
    "Verification": true,
    "System": false,
  });

  // Scroll active item into view when location changes
  useEffect(() => {
    if (activeItemRef.current && navRef.current) {
      activeItemRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }
  }, [location]);

  // Auto-expand section containing active item
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
    <div className="w-64 bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-50">
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tighter">
            WAY<span className="text-blue-500">KEL</span>
          </h1>
          <NotificationBell />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Shield className="h-3.5 w-3.5 text-amber-400" />
          <p className="text-xs text-amber-400 font-medium">Super Admin</p>
        </div>
      </div>

      <nav 
        ref={navRef}
        className="flex-1 px-3 py-4 overflow-y-auto min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#475569 #1e293b'
        }}
      >
        {sections.map((section, sectionIndex) => {
          const isExpanded = expandedSections[section.title];
          const hasActiveItem = section.items.some(item => location === item.href);
          
          return (
            <div key={section.title} className={cn(sectionIndex > 0 && "mt-3")}>
              <button
                onClick={() => toggleSection(section.title)}
                className={cn(
                  "flex items-center justify-between w-full px-3 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors",
                  hasActiveItem ? "text-slate-200" : "text-slate-500 hover:text-slate-300"
                )}
              >
                <span>{section.title}</span>
                {isExpanded ? (
                  <ChevronDown size={14} className="text-slate-500" />
                ) : (
                  <ChevronRight size={14} className="text-slate-500" />
                )}
              </button>
              
              {isExpanded && (
                <div className="mt-1 space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = location === item.href;
                    const isVerification = section.title === "Verification";
                    
                    return (
                      <Link key={item.href} href={item.href}>
                        <div 
                          ref={isActive ? activeItemRef : undefined}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150",
                            isActive 
                              ? isVerification 
                                ? "bg-emerald-600 text-white shadow-sm shadow-emerald-900/30" 
                                : "bg-blue-600 text-white shadow-sm shadow-blue-900/30"
                              : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
                          )}
                        >
                          <item.icon size={18} className={isActive ? "opacity-100" : "opacity-70"} />
                          <span className="font-medium text-sm">{item.label}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 flex-shrink-0 bg-slate-900/50">
        <div className="mb-3 px-2">
          <p className="text-xs text-slate-500">Logged in as</p>
          <p className="text-sm font-medium text-slate-200">Super Admin</p>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 gap-3 h-10"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          <span className="text-sm">Logout</span>
        </Button>
      </div>
    </div>
  );
}
