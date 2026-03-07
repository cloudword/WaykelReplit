import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

import NotFound from "@/pages/not-found";
import Notifications from "@/pages/notifications";
import Dashboard from "./customer-portal/pages/Dashboard";
import CustomerAuth from "./customer-portal/pages/Auth";
import Book from "./customer-portal/pages/Book";
import ActiveBookings from "./customer-portal/pages/ActiveBookings";
import BookingHistory from "./customer-portal/pages/BookingHistory";
import Payments from "./customer-portal/pages/Payments";
import Track from "./customer-portal/pages/Track";
import Profile from "./customer-portal/pages/Profile";
import Addresses from "./customer-portal/pages/Addresses";
import Help from "./customer-portal/pages/Help";
import TripDetails from "./customer-portal/pages/TripDetails";
import { AuthProvider as CustomerAuthProvider } from "./customer-portal/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";

function CustomerRouter() {
  return (
    <Switch>
      <Route path="/customer/auth" component={CustomerAuth} />
      <Route path="/customer/book" component={Book} />
      <Route path="/customer/dashboard/active" component={ActiveBookings} />
      <Route path="/customer/dashboard/history" component={BookingHistory} />
      <Route path="/customer/dashboard/payments" component={Payments} />
      <Route path="/customer/dashboard/track" component={Track} />
      <Route path="/customer/dashboard/profile" component={Profile} />
      <Route path="/customer/dashboard/addresses" component={Addresses} />
      <Route path="/customer/dashboard/help" component={Help} />
      <Route path="/customer/dashboard/trip/:id" component={TripDetails} />
      <Route path="/customer/dashboard" component={Dashboard} />
      <Route path="/customer/notifications" component={Notifications} />
      <Route path="/customer">
        <Redirect to="/customer/dashboard" />
      </Route>
      <Route path="/">
        <Redirect to="/customer/dashboard" />
      </Route>
      <Route component={NotFound} />
    </Switch>
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
      <CustomerAuthProvider>
        <TooltipProvider>
          <CustomerRouter />
          <Toaster />
        </TooltipProvider>
      </CustomerAuthProvider>
    </QueryClientProvider>
  );
}

export default CustomerApp;
