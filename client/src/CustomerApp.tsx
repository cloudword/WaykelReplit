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
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <p className="text-muted-foreground animate-pulse">Redirecting to new customer portal...</p>
        <Redirect to="/customer" />
      </div>
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
