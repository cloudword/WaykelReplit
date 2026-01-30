import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { startSessionHeartbeat, stopSessionHeartbeat } from "./lib/api";

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
import NotFound from "@/pages/not-found";
import SplashScreen from "@/pages/splash";
import AuthPage from "@/pages/auth";
import ForgotPasswordPage from "@/pages/forgot-password";
import DriverDashboard from "@/pages/driver-dashboard";
import DriverRides from "@/pages/driver-rides";
import DriverEarnings from "@/pages/driver-earnings";
import DriverProfile from "@/pages/driver-profile";
import ActiveRide from "@/pages/active-ride";
import BookRide from "@/pages/book-ride";
import DriverAddVehicle from "@/pages/driver-add-vehicle";
import DriverTripDetails from "@/pages/driver/trip-details";
import DriverTripDocuments from "@/pages/driver/trip-documents";

import Notifications from "@/pages/notifications";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminDrivers from "@/pages/admin/drivers";
import AdminVehicles from "@/pages/admin/vehicles";
import AdminBids from "@/pages/admin/rides";
import AdminTransporters from "@/pages/admin/transporters";
import AdminCalendar from "@/pages/admin/calendar";
import AdminEarnings from "@/pages/admin/earnings";
import AdminSettings from "@/pages/admin/settings";
import AdminCustomers from "@/pages/admin/customers";
import AdminApiExplorer from "@/pages/admin/api-explorer";
import AdminApiLogs from "@/pages/admin/api-logs";
import AdminUsers from "@/pages/admin/users";
import AdminTrips from "@/pages/admin/trips";
import AdminRoles from "@/pages/admin/roles";
import AdminStorage from "@/pages/admin/storage";
import AdminPlatformSettings from "@/pages/admin/platform-settings";
import VerificationOverview from "@/pages/admin/verification/index";
import VerificationTransporters from "@/pages/admin/verification/transporters";
import VerificationDrivers from "@/pages/admin/verification/drivers";
import VerificationVehicles from "@/pages/admin/verification/vehicles";

import TransporterDashboard from "@/pages/transporter/dashboard";
import TransporterBids from "@/pages/transporter/bids";
import TransporterDrivers from "@/pages/transporter/drivers";
import TransporterVehicles from "@/pages/transporter/vehicles";
import TransporterMarketplace from "@/pages/transporter/marketplace";
import TransporterTrips from "@/pages/transporter/trips";
import TransporterDocuments from "@/pages/transporter/documents";
import TransporterPostTrip from "@/pages/transporter/post-trip";
import TransporterAddresses from "@/pages/transporter/addresses";
import TransporterAnalytics from "@/pages/transporter/analytics";
import TransporterSettings from "@/pages/transporter/settings";

import CustomerPortalApp from "./customer-portal/CustomerPortalApp";

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashScreen} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/login" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />

      {/* Driver App Routes */}
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/driver/rides" component={DriverRides} />
      <Route path="/driver/earnings" component={DriverEarnings} />
      <Route path="/driver/profile" component={DriverProfile} />
      <Route path="/driver/active-ride/:id" component={ActiveRide} />
      <Route path="/driver/book-ride" component={BookRide} />
      <Route path="/driver/add-vehicle" component={DriverAddVehicle} />
      <Route path="/driver/trip/:id" component={DriverTripDetails} />
      <Route path="/trips/:tripId/documents" component={DriverTripDocuments} />
      <Route path="/driver/notifications" component={Notifications} />

      {/* Transporter Admin Panel Routes */}
      <Route path="/transporter" component={TransporterDashboard} />
      <Route path="/transporter/bids" component={TransporterBids} />
      <Route path="/transporter/drivers" component={TransporterDrivers} />
      <Route path="/transporter/vehicles" component={TransporterVehicles} />
      <Route path="/transporter/marketplace" component={TransporterMarketplace} />
      <Route path="/transporter/trips" component={TransporterTrips} />
      <Route path="/transporter/documents" component={TransporterDocuments} />
      <Route path="/transporter/post-trip" component={TransporterPostTrip} />
      <Route path="/transporter/addresses" component={TransporterAddresses} />
      <Route path="/transporter/analytics" component={TransporterAnalytics} />
      <Route path="/transporter/settings" component={TransporterSettings} />

      {/* Customer/Rider Portal */}
      <Route path="/customer/:rest*">
        <CustomerPortalApp />
      </Route>
      <Route path="/customer">
        <CustomerPortalApp />
      </Route>

      {/* Legacy Redirects to Modern Portal */}
      <Route path="/dashboard/:rest*">
        {(params) => <Redirect to={`/customer/dashboard/${params["rest*"]}`} />}
      </Route>
      <Route path="/dashboard">
        <Redirect to="/customer/dashboard" />
      </Route>

      {/* Super Admin Panel Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/drivers" component={AdminDrivers} />
      <Route path="/admin/vehicles" component={AdminVehicles} />
      <Route path="/admin/rides" component={AdminBids} />
      <Route path="/admin/bids" component={AdminBids} />
      <Route path="/admin/transporters" component={AdminTransporters} />
      <Route path="/admin/calendar" component={AdminCalendar} />
      <Route path="/admin/trips" component={AdminTrips} />
      <Route path="/admin/earnings" component={AdminEarnings} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/api-explorer" component={AdminApiExplorer} />
      <Route path="/admin/api-logs" component={AdminApiLogs} />
      <Route path="/admin/roles" component={AdminRoles} />
      <Route path="/admin/storage" component={AdminStorage} />
      <Route path="/admin/platform-settings" component={AdminPlatformSettings} />
      <Route path="/admin/verification" component={VerificationOverview} />
      <Route path="/admin/verification/transporters" component={VerificationTransporters} />
      <Route path="/admin/verification/drivers" component={VerificationDrivers} />
      <Route path="/admin/verification/vehicles" component={VerificationVehicles} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Start session heartbeat to keep sessions alive for active users
  useEffect(() => {
    // Only start heartbeat if not on auth pages
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/auth') && currentPath !== '/' && !currentPath.includes('/forgot-password')) {
      startSessionHeartbeat();
    }

    return () => {
      stopSessionHeartbeat();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
