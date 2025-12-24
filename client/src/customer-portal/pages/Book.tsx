import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Truck, Shield, Clock } from "lucide-react";
import { BookingForm } from "../components/BookingForm";
import { PhoneLoginModal } from "../components/PhoneLoginModal";
import { useAuth } from "../lib/auth";
import { DashboardLayout } from "../components/DashboardLayout";

export default function Book() {
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLoginModalOpen(true);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <DashboardLayout currentPage="/customer/book">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="/customer/book">
      <div className="space-y-6">
        <div className="text-left">
          <h1 className="text-2xl font-semibold mb-2">Book a Commercial Vehicle</h1>
          <p className="text-muted-foreground">Fill in your requirements and get connected with verified transporters across India.</p>
        </div>

        {isAuthenticated ? (
          <BookingForm />
        ) : (
          <Card className="border-card-border max-w-2xl">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-3">Sign In to Book a Vehicle</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create an account or sign in to book commercial vehicles, track shipments, and manage all your logistics in one place.
              </p>
              <Button size="lg" onClick={() => setLoginModalOpen(true)} data-testid="button-login-to-book">
                Sign In to Continue
              </Button>

              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">Why create an account?</p>
                <div className="grid sm:grid-cols-3 gap-4 text-left">
                  <div className="flex gap-3">
                    <Truck className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Track Shipments</p>
                      <p className="text-xs text-muted-foreground">Real-time tracking for all your bookings</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Verified Partners</p>
                      <p className="text-xs text-muted-foreground">Access to trusted transporters only</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Clock className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Booking History</p>
                      <p className="text-xs text-muted-foreground">View and manage all your trips</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PhoneLoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </DashboardLayout>
  );
}
