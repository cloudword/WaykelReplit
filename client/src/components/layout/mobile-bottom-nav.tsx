import { Link, useLocation } from "wouter";
import { Home, Truck, Wallet, Bell, User, MapPin, Package, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

type IconName = "home" | "truck" | "wallet" | "bell" | "user" | "map" | "package" | "clock" | "settings";

interface NavItem {
  href: string;
  icon: IconName;
  label: string;
}

interface MobileBottomNavProps {
  variant?: "driver" | "customer";
  items: NavItem[];
}

const iconMap: Record<IconName, typeof Home> = {
  home: Home,
  truck: Truck,
  wallet: Wallet,
  bell: Bell,
  user: User,
  map: MapPin,
  package: Package,
  clock: Clock,
  settings: Settings,
};

export function MobileBottomNav({ variant = "driver", items }: MobileBottomNavProps) {
  const [location] = useLocation();

  const accentColor = variant === "driver" ? "emerald" : "blue";
  const activeClass = variant === "driver" 
    ? "text-emerald-600" 
    : "text-blue-600";
  const bgClass = variant === "driver"
    ? "bg-emerald-50"
    : "bg-blue-50";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || Home;
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full transition-colors",
                  isActive ? activeClass : "text-gray-500"
                )}
                data-testid={`nav-${item.icon}`}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isActive && bgClass
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn(
                  "text-xs mt-0.5 font-medium",
                  isActive ? "font-semibold" : ""
                )}>
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
