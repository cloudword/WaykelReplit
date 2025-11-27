import { Link, useLocation } from "wouter";
import { Home, Clock, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/driver", icon: Home, label: "Home" },
    { href: "/driver/rides", icon: Clock, label: "Rides" },
    { href: "/driver/earnings", icon: Wallet, label: "Earnings" },
    { href: "/driver/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-bottom z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer transition-colors",
                isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
              )}>
                <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
