import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { SplashScreen } from "@capacitor/splash-screen";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import DriverDashboard from "@/pages/driver-dashboard";
import DriverRides from "@/pages/driver-rides";
import DriverEarnings from "@/pages/driver-earnings";
import DriverProfile from "@/pages/driver-profile";
import ActiveRide from "@/pages/active-ride";
import BookRide from "@/pages/book-ride";
import DriverAddVehicle from "@/pages/driver-add-vehicle";
import Notifications from "@/pages/notifications";

function DriverRouter() {
  return (
    <Switch>
      <Route path="/">
        <Redirect to="/driver" />
      </Route>
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/login" component={AuthPage} />
      
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/driver/rides" component={DriverRides} />
      <Route path="/driver/earnings" component={DriverEarnings} />
      <Route path="/driver/profile" component={DriverProfile} />
      <Route path="/driver/active-ride/:id" component={ActiveRide} />
      <Route path="/driver/book-ride" component={BookRide} />
      <Route path="/driver/add-vehicle" component={DriverAddVehicle} />
      <Route path="/driver/notifications" component={Notifications} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function DriverApp() {
  useEffect(() => {
    async function initNativeFeatures() {
      if (Capacitor.isNativePlatform()) {
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#059669" });
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
      <DriverRouter />
      <Toaster />
    </QueryClientProvider>
  );
}

export default DriverApp;
