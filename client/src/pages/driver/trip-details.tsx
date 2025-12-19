import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Clock, 
  Package, 
  User,
  Phone,
  Play,
  CheckCircle2,
  Camera,
  IndianRupee,
  Calendar
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

function getStatusLabel(status: string): string {
  switch (status) {
    case "assigned": return "Assigned";
    case "active": return "In Transit";
    case "completed": return "Completed";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "assigned": return "bg-blue-100 text-blue-700";
    case "active": return "bg-amber-100 text-amber-700";
    case "completed": return "bg-green-100 text-green-700";
    case "cancelled": return "bg-red-100 text-red-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export default function DriverTripDetails() {
  const [_, setLocation] = useLocation();
  const [, params] = useRoute("/driver/trip/:id");
  const tripId = params?.id;
  
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pickupDone, setPickupDone] = useState(false);
  const [deliveryDone, setDeliveryDone] = useState(false);

  useEffect(() => {
    const loadTrip = async () => {
      if (!tripId) return;
      try {
        const data = await api.rides.get(tripId);
        setTrip(data);
        setPickupDone(data.pickupCompleted || false);
        setDeliveryDone(data.deliveryCompleted || false);
      } catch (error) {
        console.error("Failed to load trip:", error);
        toast.error("Failed to load trip details");
      } finally {
        setLoading(false);
      }
    };
    loadTrip();
  }, [tripId]);

  const handleStartTrip = async () => {
    if (!trip) return;
    try {
      const result = await api.rides.startTrip(trip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTrip({ ...trip, status: "active" });
      toast.success("Trip started!");
    } catch (error) {
      toast.error("Failed to start trip");
    }
  };

  const handleMarkPickup = async () => {
    if (!trip) return;
    try {
      const result = await api.rides.markPickupComplete(trip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPickupDone(true);
      toast.success("Pickup marked as done!");
    } catch (error) {
      toast.error("Failed to update pickup status");
    }
  };

  const handleMarkDelivery = async () => {
    if (!trip) return;
    try {
      const result = await api.rides.markDeliveryComplete(trip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setDeliveryDone(true);
      toast.success("Delivery marked as done!");
    } catch (error) {
      toast.error("Failed to update delivery status");
    }
  };

  const handleUploadProof = () => {
    // Navigate to trip documents - uses existing trip document system
    setLocation(`/trips/${tripId}/documents`);
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;
    try {
      const result = await api.rides.completeTrip(trip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTrip({ ...trip, status: "completed" });
      toast.success("Trip completed successfully!");
      setTimeout(() => setLocation("/driver"), 1500);
    } catch (error) {
      toast.error("Failed to complete trip");
    }
  };

  const openGoogleMaps = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, "_blank");
  };

  const callCustomer = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Button variant="ghost" onClick={() => setLocation("/driver")} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <p className="text-center text-muted-foreground">Trip not found</p>
      </div>
    );
  }

  const isAssigned = trip.status === "assigned";
  const isActive = trip.status === "active";
  const isCompleted = trip.status === "completed";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/driver")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">Trip Details</h1>
        </div>
        <Badge className={getStatusColor(trip.status)}>
          {getStatusLabel(trip.status)}
        </Badge>
      </header>

      <main className="p-4 space-y-4">
        {/* Route Card */}
        <Card data-testid="card-route">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Pickup */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                  <div className="w-0.5 h-full bg-gray-300 my-1" />
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pickup</p>
                  <p className="font-semibold mt-1">{trip.pickupLocation}</p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    <span>{trip.date}</span>
                    <Clock className="h-4 w-4 ml-2" />
                    <span>{trip.pickupTime}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 gap-2"
                    onClick={() => openGoogleMaps(trip.pickupLocation)}
                    data-testid="button-navigate-pickup"
                  >
                    <Navigation className="h-4 w-4" /> Navigate
                  </Button>
                </div>
              </div>

              {/* Drop */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Drop</p>
                  <p className="font-semibold mt-1">{trip.dropLocation}</p>
                  {trip.dropTime && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{trip.dropTime}</span>
                    </div>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 gap-2"
                    onClick={() => openGoogleMaps(trip.dropLocation)}
                    data-testid="button-navigate-drop"
                  >
                    <Navigation className="h-4 w-4" /> Navigate
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cargo Details */}
        <Card data-testid="card-cargo">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Cargo Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium">{trip.cargoType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Weight</span>
              <span className="font-medium">{trip.weight}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="font-medium">{trip.distance}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-muted-foreground">Fare</span>
              <span className="font-bold text-lg text-primary flex items-center">
                <IndianRupee className="h-4 w-4" />{trip.price}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Contact */}
        {trip.customerPhone && (
          <Card data-testid="card-customer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-medium">{trip.customerName || "Customer"}</p>
                    <p className="text-sm text-muted-foreground">{trip.customerPhone}</p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => callCustomer(trip.customerPhone)}
                  data-testid="button-call-customer"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {!isCompleted && (
          <div className="space-y-3 pt-4">
            {isAssigned && (
              <Button 
                className="w-full h-14 text-base gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleStartTrip}
                data-testid="button-start-trip"
              >
                <Play className="h-5 w-5" /> Start Trip
              </Button>
            )}

            {isActive && !pickupDone && (
              <Button 
                className="w-full h-14 text-base gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={handleMarkPickup}
                data-testid="button-mark-pickup"
              >
                <CheckCircle2 className="h-5 w-5" /> Mark Pickup Done
              </Button>
            )}

            {isActive && pickupDone && !deliveryDone && (
              <Button 
                className="w-full h-14 text-base gap-2 bg-amber-600 hover:bg-amber-700"
                onClick={handleMarkDelivery}
                data-testid="button-mark-delivery"
              >
                <CheckCircle2 className="h-5 w-5" /> Mark Delivery Done
              </Button>
            )}

            {isActive && pickupDone && deliveryDone && (
              <>
                <Button 
                  variant="outline"
                  className="w-full h-14 text-base gap-2"
                  onClick={handleUploadProof}
                  data-testid="button-upload-proof"
                >
                  <Camera className="h-5 w-5" /> Upload Delivery Proof
                </Button>
                <Button 
                  className="w-full h-14 text-base gap-2 bg-green-600 hover:bg-green-700"
                  onClick={handleCompleteTrip}
                  data-testid="button-complete-trip"
                >
                  <CheckCircle2 className="h-5 w-5" /> Complete Trip
                </Button>
              </>
            )}
          </div>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-green-700">Trip Completed</p>
            <p className="text-muted-foreground">Thank you for completing this delivery!</p>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
