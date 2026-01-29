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
import { LayoutDashboard, MapPin, CreditCard, User, LogOut, Plus, HelpCircle, Truck, MapPinned, History } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

const menuItems = [
  { icon: LayoutDashboard, label: "My Trips", href: "/customer/dashboard" },
  { icon: Truck, label: "Active Bookings", href: "/customer/dashboard/active" },
  { icon: History, label: "Past Orders", href: "/customer/dashboard/history" },
  { icon: MapPin, label: "Track Shipment", href: "/customer/dashboard/track" },
  { icon: MapPinned, label: "Saved Addresses", href: "/customer/dashboard/addresses" },
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
      <div className="flex min-h-svh w-full bg-background font-inter tracking-tight">
        <Sidebar className="border-r border-sidebar-border/60">
          <SidebarHeader className="p-6 h-20 flex flex-col justify-center">
            <Link href="/customer" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
                <Truck className="w-5 h-5 fill-current" />
              </div>
              <div className="font-black text-xl tracking-tighter text-foreground group-hover:text-primary transition-colors">WAYKEL</div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup className="px-4">
              <SidebarGroupContent>
                <div className="py-6">
                  <Link href="/customer/book">
                    <Button
                      className="w-full gap-2 h-12 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all font-bold"
                      data-testid="button-new-booking"
                    >
                      <Plus className="w-4 h-4 stroke-[3px]" />
                      New Booking
                    </Button>
                  </Link>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[0.2em] px-3 mb-2">Main Menu</p>
                  <SidebarMenu>
                    {menuItems.map(item => {
                      const isActive = location === item.href || currentPage === item.href;
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={`h-11 px-3 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20' : 'hover:bg-muted font-medium'}`}
                          >
                            <Link href={item.href} data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                              <item.icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5px]' : 'text-muted-foreground'}`} />
                              <span className={isActive ? "font-bold" : ""}>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-sidebar-border bg-sidebar-accent/30">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-background/50 border border-white/10 shadow-sm">
              <Avatar className="w-10 h-10 border-2 border-background shadow-md rounded-lg">
                <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate leading-none text-foreground">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate tracking-tight mt-1 font-medium">+91 {userPhone}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-col h-screen overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-6 h-16 border-b border-border/60 bg-background/80 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="md:hidden" />
              <div className="hidden md:block">
                <SidebarTrigger data-testid="button-sidebar-toggle-desktop" />
              </div>
              <div className="h-6 w-px bg-border/60 hidden sm:block" />
              <div className="hidden sm:block">
                <nav className="flex items-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Portal</span>
                  <div className="mx-3 w-1 h-1 rounded-full bg-border" />
                  <span className="text-primary">{location.split('/').pop()?.replace('-', ' ') || 'Dashboard'}</span>
                </nav>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center p-1 bg-muted/40 rounded-lg gap-1 border border-border/40">
                <NotificationBell />
                <div className="h-4 w-px bg-border/60" />
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted/[0.15]">
            <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
