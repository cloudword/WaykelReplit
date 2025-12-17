import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerRides from "@/pages/customer/rides";
import CustomerProfile from "@/pages/customer/profile";
import Notifications from "@/pages/notifications";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";

const customerNavItems = [
  { href: "/customer", icon: "home" as const, label: "Home" },
  { href: "/customer/rides", icon: "package" as const, label: "Bookings" },
  { href: "/customer/notifications", icon: "bell" as const, label: "Alerts" },
  { href: "/customer/profile", icon: "user" as const, label: "Profile" },
];

function CustomerRouter() {
  const [location] = useLocation();
  const hideNavPaths = ["/auth"];
  const showNav = !hideNavPaths.some(path => location.startsWith(path));

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <Switch>
        <Route path="/">
          <Redirect to="/customer" />
        </Route>
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/login" component={AuthPage} />
        
        <Route path="/customer" component={CustomerDashboard} />
        <Route path="/customer/rides" component={CustomerRides} />
        <Route path="/customer/profile" component={CustomerProfile} />
        <Route path="/customer/notifications" component={Notifications} />
        
        <Route component={NotFound} />
      </Switch>
      
      {showNav && <MobileBottomNav variant="customer" items={customerNavItems} />}
    </div>
  );
}

function CustomerApp() {
  useEffect(() => {
    async function initNativeFeatures() {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#2563eb" });
        } catch (e) {
          console.log("StatusBar not available");
        }
        
        try {
          await SplashScreen.hide();
        } catch (e) {
          console.log("SplashScreen not available");
        }
      }
    }
    initNativeFeatures();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CustomerRouter />
      <Toaster />
    </QueryClientProvider>
  );
}

export default CustomerApp;
