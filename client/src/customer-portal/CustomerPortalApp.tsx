import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./lib/auth";
import Dashboard from "./pages/Dashboard";
import Book from "./pages/Book";
import ActiveBookings from "./pages/ActiveBookings";
import BookingHistory from "./pages/BookingHistory";
import Payments from "./pages/Payments";
import Track from "./pages/Track";
import Profile from "./pages/Profile";
import Addresses from "./pages/Addresses";
import Help from "./pages/Help";
import Notifications from "@/pages/notifications";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/customer" component={Dashboard} />
      <Route path="/customer/dashboard" component={Dashboard} />
      <Route path="/customer/book" component={Book} />
      <Route path="/customer/dashboard/active" component={ActiveBookings} />
      <Route path="/customer/dashboard/history" component={BookingHistory} />
      <Route path="/customer/dashboard/payments" component={Payments} />
      <Route path="/customer/dashboard/track" component={Track} />
      <Route path="/customer/dashboard/profile" component={Profile} />
      <Route path="/customer/dashboard/addresses" component={Addresses} />
      <Route path="/customer/dashboard/help" component={Help} />
      <Route path="/customer/notifications" component={Notifications} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function CustomerPortalApp() {
  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </AuthProvider>
  );
}
