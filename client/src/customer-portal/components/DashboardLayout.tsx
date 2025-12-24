import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import NotificationBell from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "../lib/auth";
import { LayoutDashboard, MapPin, CreditCard, User, LogOut, Plus, HelpCircle } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: "My Trips", href: "/customer/dashboard" },
  { icon: MapPin, label: "Track Shipment", href: "/customer/dashboard/track" },
  { icon: CreditCard, label: "Payments", href: "/customer/dashboard/payments" },
  { icon: User, label: "Profile", href: "/customer/dashboard/profile" },
  { icon: HelpCircle, label: "Help & Support", href: "/customer/dashboard/help" },
];

export function DashboardLayout({ children, currentPage }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3.5rem",
  } as React.CSSProperties;

  const userName = user?.name || "User";
  const userPhone = user?.phone?.replace("+91", "") || "";
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader className="p-4 border-b border-sidebar-border">
            <Link href="/customer" className="flex items-center">
              <div className="font-black text-xl">WAYKEL</div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-2 mb-4">
                  <Link href="/customer/book">
                    <Button className="w-full gap-2 h-11" data-testid="button-new-booking">
                      <Plus className="w-4 h-4" />
                      Book New Trip
                    </Button>
                  </Link>
                </div>

                <SidebarMenu>
                  {menuItems.map(item => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.href || currentPage === item.href}
                        className="h-11"
                      >
                        <Link href={item.href} data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">+91 {userPhone}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 h-14 border-b border-border bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
