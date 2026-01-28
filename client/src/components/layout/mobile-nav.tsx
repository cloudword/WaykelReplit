import { Link, useLocation } from "wouter";
import { Home, Truck, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/driver", icon: Home, label: "Home" },
    { href: "/driver/rides", icon: Truck, label: "My Trips" },
    { href: "/driver/earnings", icon: Wallet, label: "Earnings" },
    { href: "/driver/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="bg-white/90 dark:bg-black/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pointer-events-auto pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "relative flex flex-col items-center justify-center w-full h-full cursor-pointer transition-colors group px-2",
                  isActive ? "text-primary dark:text-primary" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                )}>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-active-driver-home"
                      className="absolute -top-[1px] w-8 h-[2px] rounded-b-full bg-primary"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      "p-1.5 rounded-xl transition-all duration-300",
                      isActive ? "bg-primary/10" : "bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-gray-800"
                    )}
                  >
                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={cn("transition-transform", isActive && "scale-105")} />
                  </motion.div>
                  <span className={cn("text-[10px] mt-0.5 font-medium", isActive && "font-bold")}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
