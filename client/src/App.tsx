import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/not-found";
import SplashScreen from "@/pages/splash";
import AuthPage from "@/pages/auth";
import DriverDashboard from "@/pages/driver-dashboard";
import DriverRides from "@/pages/driver-rides";
import DriverEarnings from "@/pages/driver-earnings";
import DriverProfile from "@/pages/driver-profile";
import ActiveRide from "@/pages/active-ride";
import BookRide from "@/pages/book-ride";

import Notifications from "@/pages/notifications";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminDrivers from "@/pages/admin/drivers";
import AdminVehicles from "@/pages/admin/vehicles";
import AdminBids from "@/pages/admin/rides";
import AdminTransporters from "@/pages/admin/transporters";
import AdminCalendar from "@/pages/admin/calendar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashScreen} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Driver App Routes */}
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/driver/rides" component={DriverRides} />
      <Route path="/driver/earnings" component={DriverEarnings} />
      <Route path="/driver/profile" component={DriverProfile} />
      <Route path="/driver/active-ride/:id" component={ActiveRide} />
      <Route path="/driver/book-ride" component={BookRide} />
      <Route path="/driver/notifications" component={Notifications} />

      {/* Admin Panel Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/drivers" component={AdminDrivers} />
      <Route path="/admin/vehicles" component={AdminVehicles} />
      <Route path="/admin/bids" component={AdminBids} />
      <Route path="/admin/transporters" component={AdminTransporters} />
      <Route path="/admin/calendar" component={AdminCalendar} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
