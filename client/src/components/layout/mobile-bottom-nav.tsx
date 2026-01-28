import { Link, useLocation } from "wouter";
import { Home, Truck, Wallet, Bell, User, MapPin, Package, Clock, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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

  const isDriver = variant === "driver";

  const activeColorClass = isDriver ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400";
  const activeBgClass = isDriver ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-blue-100 dark:bg-blue-900/30";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Glassmorphic Container - using pointer-events-auto to capture clicks only on the bar */}
      <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pointer-events-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {items.map((item) => {
            const Icon = iconMap[item.icon] || Home;
            const isActive = location === item.href ||
              (item.href !== "/" && location.startsWith(item.href));

            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "relative flex flex-col items-center justify-center w-16 h-full cursor-pointer group",
                    isActive ? activeColorClass : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                  )}
                  data-testid={`nav-${item.icon}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId={`mobile-nav-active-${variant}`}
                      className="absolute -top-[1px] w-10 h-[2px] rounded-b-full bg-current"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}

                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "p-1.5 rounded-xl transition-all duration-300",
                      isActive ? activeBgClass : "bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 transition-transform duration-300", isActive && "scale-110")} />
                  </motion.div>

                  <span className={cn(
                    "text-[10px] mt-1 font-medium transition-all duration-300",
                    isActive ? "font-bold scale-105" : "scale-100"
                  )}>
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
