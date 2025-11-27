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

function Router() {
  return (
    <Switch>
      <Route path="/" component={SplashScreen} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/driver/rides" component={DriverRides} />
      <Route path="/driver/earnings" component={DriverEarnings} />
      <Route path="/driver/profile" component={DriverProfile} />
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
