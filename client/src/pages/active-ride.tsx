import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Phone, MessageSquare, Navigation, IndianRupee, Shield, CheckCircle, Package, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function ActiveRide() {
  const [_, params] = useRoute("/driver/active-ride/:id");
  const [__, setLocation] = useLocation();
  const [ride, setRide] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [tripStatus, setTripStatus] = useState<"not_started" | "started" | "picked_up" | "completed">("not_started");

  useEffect(() => {
    const loadRide = async () => {
      if (!params?.id) return;
      try {
        const data = await api.rides.get(params.id);
        setRide(data);
        if (data.status === "completed") {
          setTripStatus("completed");
        } else if (data.status === "active") {
          setTripStatus("started");
        }
      } catch (error) {
        console.error("Failed to load ride:", error);
        toast.error("Failed to load ride details");
      } finally {
        setLoading(false);
      }
    };
    loadRide();
  }, [params?.id]);

  const handleStartTrip = async () => {
    setUpdating(true);
    try {
      await api.rides.updateStatus(ride.id, "active");
      setTripStatus("started");
      toast.success("Trip started! Drive safely.");
    } catch (error) {
      toast.error("Failed to start trip");
    } finally {
      setUpdating(false);
    }
  };

  const handlePickedUp = async () => {
    setTripStatus("picked_up");
    toast.success("Cargo picked up. Proceed to drop location.");
  };

  const handleCompleteTrip = async () => {
    setUpdating(true);
    try {
      await api.rides.updateStatus(ride.id, "completed");
      setTripStatus("completed");
      toast.success("Trip completed! Earnings credited to your account.");
      setTimeout(() => setLocation("/driver/earnings"), 2000);
    } catch (error) {
      toast.error("Failed to complete trip");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Ride not found</p>
        <Button onClick={() => setLocation("/driver")}>Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="relative h-[35vh] w-full bg-gradient-to-br from-blue-500 to-blue-700">
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute top-4 left-4 z-10 rounded-full shadow-md"
          onClick={() => setLocation("/driver")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white">
            <Navigation className="h-16 w-16 mx-auto mb-2" />
            <p className="text-lg font-semibold">
              {tripStatus === "completed" ? "Trip Completed!" :
               tripStatus === "picked_up" ? "En Route to Drop" :
               tripStatus === "started" ? "Navigate to Pickup" :
               "Ready to Start"}
            </p>
          </div>
        </div>
        
        {tripStatus === "started" && (
          <div className="absolute bottom-4 right-4">
            <Button className="rounded-full h-12 px-6 shadow-lg gap-2 bg-white text-blue-700 hover:bg-gray-100">
              <Navigation className="h-5 w-5" />
              Open Maps
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-6 pb-safe-area-bottom overflow-y-auto">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

        <div className="space-y-6">
          {ride.customerName && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-gray-100">
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {ride.customerName?.split(' ').map((n: string) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg" data-testid="text-customer-name">{ride.customerName}</h3>
                  <p className="text-sm text-muted-foreground">{ride.customerPhone || "Customer"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {ride.customerPhone && (
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="rounded-full h-10 w-10 border-green-200 bg-green-50 text-green-600"
                    onClick={() => window.open(`tel:${ride.customerPhone}`)}
                    data-testid="button-call"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                )}
                <Button size="icon" variant="outline" className="rounded-full h-10 w-10 border-blue-200 bg-blue-50 text-blue-600">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="h-px bg-gray-100" />

          <div className="space-y-6 relative">
            <div className="absolute left-[11px] top-2 bottom-8 w-0.5 bg-gray-200" />
            
            <div className="flex gap-4 relative">
              <div className={`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 z-10 ${tripStatus !== "not_started" ? "bg-green-500" : "bg-green-100"}`}>
                {tripStatus !== "not_started" ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <div className="w-2 h-2 bg-green-600 rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">PICKUP</p>
                <p className="font-semibold text-gray-900 leading-tight" data-testid="text-pickup">{ride.pickupLocation}</p>
                <p className="text-xs text-gray-500 mt-1">{ride.pickupTime} • {ride.date}</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className={`w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center shrink-0 z-10 ${tripStatus === "completed" ? "bg-green-500" : "bg-red-100"}`}>
                {tripStatus === "completed" ? (
                  <CheckCircle className="w-4 h-4 text-white" />
                ) : (
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">DROP OFF</p>
                <p className="font-semibold text-gray-900 leading-tight" data-testid="text-dropoff">{ride.dropLocation}</p>
                <p className="text-xs text-gray-500 mt-1">{ride.distance}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg flex items-center gap-3">
            <Package className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium">{ride.cargoType}</p>
              <p className="text-xs text-gray-500">{ride.weight}</p>
            </div>
          </div>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-green-100 font-medium uppercase mb-1">Trip Earnings</p>
                <div className="flex items-center text-2xl font-bold">
                  <IndianRupee className="h-5 w-5" />
                  <span data-testid="text-earnings">{parseFloat(ride.price || "0").toLocaleString()}</span>
                </div>
              </div>
              {ride.incentive && parseFloat(ride.incentive) > 0 && (
                <div className="text-right">
                  <p className="text-xs text-green-100 font-medium uppercase mb-1">Incentive</p>
                  <div className="flex items-center justify-end text-lg font-bold">
                    + <IndianRupee className="h-3 w-3" />
                    {parseFloat(ride.incentive).toLocaleString()}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="pt-2">
            {tripStatus === "not_started" && (
              <Button 
                className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 rounded-xl"
                onClick={handleStartTrip}
                disabled={updating}
                data-testid="button-start-trip"
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Start Trip
              </Button>
            )}
            
            {tripStatus === "started" && (
              <Button 
                className="w-full h-14 text-lg font-bold shadow-xl shadow-blue-500/20 rounded-xl bg-blue-600 hover:bg-blue-700"
                onClick={handlePickedUp}
                disabled={updating}
                data-testid="button-picked-up"
              >
                Confirm Pickup
              </Button>
            )}
            
            {tripStatus === "picked_up" && (
              <Button 
                className="w-full h-14 text-lg font-bold shadow-xl shadow-green-500/20 rounded-xl bg-green-600 hover:bg-green-700"
                onClick={handleCompleteTrip}
                disabled={updating}
                data-testid="button-complete-trip"
              >
                {updating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                Complete Delivery
              </Button>
            )}
            
            {tripStatus === "completed" && (
              <Button 
                className="w-full h-14 text-lg font-bold rounded-xl"
                variant="outline"
                onClick={() => setLocation("/driver/earnings")}
                data-testid="button-view-earnings"
              >
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                View Earnings
              </Button>
            )}
            
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <Shield className="h-3 w-3" />
              <span>Waykel Secure Trip</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
