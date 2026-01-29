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
  SidebarInset,
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
      <div className="flex min-h-svh w-full bg-background">
        <Sidebar>
          <SidebarHeader className="p-4 border-b border-sidebar-border h-14 flex items-center">
            <Link href="/customer" className="flex items-center">
              <div className="font-black text-xl tracking-tighter">WAYKEL</div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <div className="px-3 py-4">
                  <Link href="/customer/book">
                    <Button className="w-full gap-2 h-11 shadow-sm" data-testid="button-new-booking">
                      <Plus className="w-4 h-4" />
                      Book New Trip
                    </Button>
                  </Link>
                </div>

                <SidebarMenu className="px-2">
                  {menuItems.map(item => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.href || currentPage === item.href}
                        className="h-10 px-3"
                      >
                        <Link href={item.href} data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                          <item.icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar-accent/50">
            <div className="flex items-center gap-3">
              <Avatar className="w-9 h-9 border-2 border-background shadow-sm">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate tracking-tight">+91 {userPhone}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 text-muted-foreground hover:text-foreground" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col h-screen overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 h-14 border-b border-border bg-background sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="md:hidden" />
              <div className="hidden md:block">
                <SidebarTrigger data-testid="button-sidebar-toggle-desktop" />
              </div>
              <div className="h-4 w-px bg-border hidden sm:block" />
              <div className="hidden sm:block">
                <nav className="flex items-center text-sm font-medium">
                  <span className="text-muted-foreground">Portal</span>
                  <span className="mx-2 text-muted-foreground">/</span>
                  <span className="text-foreground capitalize">{location.split('/').pop() || 'Dashboard'}</span>
                </nav>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/20">
            <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
