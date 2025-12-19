import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  MapPin, 
  Navigation, 
  Clock, 
  Package, 
  ChevronDown, 
  ChevronUp,
  Play,
  CheckCircle2,
  Camera,
  Truck,
  IndianRupee,
  CheckCheck
} from "lucide-react";
import { api } from "@/lib/api";
import NotificationBell from "@/components/notifications/NotificationBell";
import { toast } from "sonner";

type TripStatus = "assigned" | "active" | "completed" | "cancelled";

interface Trip {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  dropTime?: string;
  date: string;
  status: TripStatus;
  price: string;
  distance: string;
  cargoType: string;
  weight: string;
  pickupCompleted?: boolean;
  deliveryCompleted?: boolean;
  acceptedAt?: string;
}

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

function CurrentTripCard({ trip, onAcceptTrip, onStartTrip, onMarkPickup, onMarkDelivery, onUploadProof, onNavigate }: {
  trip: Trip;
  onAcceptTrip: () => void;
  onStartTrip: () => void;
  onMarkPickup: () => void;
  onMarkDelivery: () => void;
  onUploadProof: () => void;
  onNavigate: (location: string) => void;
}) {
  const isAssigned = trip.status === "assigned";
  const isActive = trip.status === "active";
  const isAccepted = !!trip.acceptedAt;
  const pickupDone = trip.pickupCompleted;
  const deliveryDone = trip.deliveryCompleted;

  return (
    <Card className="border-2 border-primary/20 shadow-lg" data-testid={`card-current-trip-${trip.id}`}>
      <div className="bg-primary/5 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <span className="font-semibold text-primary">Current Trip</span>
        </div>
        <Badge className={getStatusColor(trip.status)}>
          {getStatusLabel(trip.status)}
        </Badge>
      </div>
      
      <CardContent className="p-4 space-y-4">
        {/* Route Info */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="w-0.5 h-8 bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-medium text-sm">{trip.pickupLocation}</p>
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Clock className="h-3 w-3" /> {trip.pickupTime}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Drop</p>
                <p className="font-medium text-sm">{trip.dropLocation}</p>
                {trip.dropTime && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <Clock className="h-3 w-3" /> {trip.dropTime}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span className="text-sm">{trip.cargoType} • {trip.weight}</span>
          </div>
          <div className="flex items-center text-primary font-bold">
            <IndianRupee className="h-4 w-4" />
            <span>{trip.price}</span>
          </div>
        </div>

        {/* Navigation CTA */}
        <Button 
          variant="outline" 
          className="w-full h-12 text-base gap-2"
          onClick={() => onNavigate(isActive && !pickupDone ? trip.pickupLocation : trip.dropLocation)}
          data-testid="button-navigate"
        >
          <Navigation className="h-5 w-5" />
          Open in Google Maps
        </Button>

        {/* Trip Actions */}
        <div className="space-y-2">
          {isAssigned && !isAccepted && (
            <Button 
              className="w-full h-14 text-base gap-2 bg-primary hover:bg-primary/90"
              onClick={onAcceptTrip}
              data-testid="button-accept-trip"
            >
              <CheckCheck className="h-5 w-5" />
              Accept Trip
            </Button>
          )}

          {isAssigned && isAccepted && (
            <Button 
              className="w-full h-14 text-base gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={onStartTrip}
              data-testid="button-start-trip"
            >
              <Play className="h-5 w-5" />
              Start Trip
            </Button>
          )}

          {isActive && !pickupDone && (
            <Button 
              className="w-full h-14 text-base gap-2 bg-blue-600 hover:bg-blue-700"
              onClick={onMarkPickup}
              data-testid="button-mark-pickup"
            >
              <CheckCircle2 className="h-5 w-5" />
              Mark Pickup Done
            </Button>
          )}

          {isActive && pickupDone && !deliveryDone && (
            <Button 
              className="w-full h-14 text-base gap-2 bg-amber-600 hover:bg-amber-700"
              onClick={onMarkDelivery}
              data-testid="button-mark-delivery"
            >
              <CheckCircle2 className="h-5 w-5" />
              Mark Delivery Done
            </Button>
          )}

          {isActive && pickupDone && deliveryDone && (
            <Button 
              className="w-full h-14 text-base gap-2"
              onClick={onUploadProof}
              data-testid="button-upload-proof"
            >
              <Camera className="h-5 w-5" />
              Upload Delivery Proof
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TripListItem({ trip, onClick }: { trip: Trip; onClick: () => void }) {
  return (
    <div 
      className="flex items-center justify-between p-4 bg-white rounded-lg border active:bg-gray-50 cursor-pointer"
      onClick={onClick}
      data-testid={`trip-item-${trip.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-3 w-3 text-green-500 shrink-0" />
          <p className="text-sm font-medium truncate">{trip.pickupLocation}</p>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3 w-3 text-red-500 shrink-0" />
          <p className="text-sm text-muted-foreground truncate">{trip.dropLocation}</p>
        </div>
        <p className="text-xs text-gray-400 mt-1">{trip.date} • {trip.pickupTime}</p>
      </div>
      <div className="text-right shrink-0 ml-3">
        <p className="font-bold text-primary flex items-center justify-end">
          <IndianRupee className="h-3 w-3" />{trip.price}
        </p>
        <Badge className={`${getStatusColor(trip.status)} text-[10px] mt-1`}>
          {getStatusLabel(trip.status)}
        </Badge>
      </div>
    </div>
  );
}

export default function DriverDashboard() {
  const [_, setLocation] = useLocation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  // Self-driver check: transporter with isSelfDriver=true can access driver app
  const isSelfDriver = user?.role === "transporter" && user?.isSelfDriver === true;
  const canAccessDriverApp = user?.role === "driver" || isSelfDriver;

  useEffect(() => {
    const loadTrips = async () => {
      try {
        // For drivers, the backend returns only assigned trips
        const data = await api.rides.list({});
        setTrips(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load trips:", error);
      } finally {
        setLoading(false);
      }
    };
    if (canAccessDriverApp) {
      loadTrips();
    }
  }, [canAccessDriverApp]);

  // Filter trips by status
  const currentTrip = trips.find(t => t.status === "active" || t.status === "assigned");
  const upcomingTrips = trips.filter(t => t.status === "assigned" && t.id !== currentTrip?.id);
  const completedTrips = trips.filter(t => t.status === "completed");

  const handleAcceptTrip = async () => {
    if (!currentTrip) return;
    try {
      const result = await api.rides.acceptTrip(currentTrip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTrips(prev => prev.map(t => 
        t.id === currentTrip.id ? { ...t, acceptedAt: new Date().toISOString() } : t
      ));
      toast.success("Trip accepted! You can now start the trip.");
    } catch (error) {
      console.error("Failed to accept trip:", error);
      toast.error("Failed to accept trip");
    }
  };

  const handleStartTrip = async () => {
    if (!currentTrip) return;
    try {
      const result = await api.rides.startTrip(currentTrip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTrips(prev => prev.map(t => 
        t.id === currentTrip.id ? { ...t, status: "active" as TripStatus } : t
      ));
      toast.success("Trip started!");
    } catch (error) {
      console.error("Failed to start trip:", error);
      toast.error("Failed to start trip");
    }
  };

  const handleMarkPickup = async () => {
    if (!currentTrip) return;
    try {
      const result = await api.rides.markPickupComplete(currentTrip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTrips(prev => prev.map(t => 
        t.id === currentTrip.id ? { ...t, pickupCompleted: true } : t
      ));
      toast.success("Pickup marked as done!");
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleMarkDelivery = async () => {
    if (!currentTrip) return;
    try {
      const result = await api.rides.markDeliveryComplete(currentTrip.id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setTrips(prev => prev.map(t => 
        t.id === currentTrip.id ? { ...t, deliveryCompleted: true } : t
      ));
      toast.success("Delivery marked as done!");
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const handleUploadProof = () => {
    if (!currentTrip) return;
    // Navigate to trip documents - uses existing trip document system
    setLocation(`/trips/${currentTrip.id}/documents`);
  };

  const openGoogleMaps = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`, "_blank");
  };

  const viewTripDetails = (tripId: string) => {
    setLocation(`/driver/trip/${tripId}`);
  };

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  if (!canAccessDriverApp) {
    setLocation("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-emerald-600">Waykel Driver</h1>
          <p className="text-xs text-muted-foreground">
            {isSelfDriver ? "Driver Mode (Self-Driven)" : `Welcome, ${user.name || "Driver"}`}
          </p>
        </div>
        <NotificationBell />
      </header>

      <main className="p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Current Trip */}
            {currentTrip ? (
              <CurrentTripCard
                trip={currentTrip}
                onAcceptTrip={handleAcceptTrip}
                onStartTrip={handleStartTrip}
                onMarkPickup={handleMarkPickup}
                onMarkDelivery={handleMarkDelivery}
                onUploadProof={handleUploadProof}
                onNavigate={openGoogleMaps}
              />
            ) : (
              <Card className="border-dashed border-2" data-testid="card-no-trips">
                <CardContent className="py-12 text-center">
                  <Truck className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-muted-foreground">No active trips</p>
                  <p className="text-sm text-gray-400 mt-1">Trips assigned to you will appear here</p>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Trips */}
            {upcomingTrips.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Upcoming
                  <Badge variant="secondary" className="ml-auto">{upcomingTrips.length}</Badge>
                </h2>
                <div className="space-y-2">
                  {upcomingTrips.map(trip => (
                    <TripListItem 
                      key={trip.id} 
                      trip={trip} 
                      onClick={() => viewTripDetails(trip.id)} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Completed Trips (Collapsed) */}
            {completedTrips.length > 0 && (
              <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between py-3 px-1">
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Completed
                      <Badge variant="secondary">{completedTrips.length}</Badge>
                    </h2>
                    {completedOpen ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-2">
                    {completedTrips.slice(0, 5).map(trip => (
                      <TripListItem 
                        key={trip.id} 
                        trip={trip} 
                        onClick={() => viewTripDetails(trip.id)} 
                      />
                    ))}
                    {completedTrips.length > 5 && (
                      <Button 
                        variant="ghost" 
                        className="w-full text-muted-foreground"
                        onClick={() => setLocation("/driver/trips/history")}
                        data-testid="button-view-all-completed"
                      >
                        View all {completedTrips.length} completed trips
                      </Button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Empty state when no trips at all */}
            {trips.length === 0 && !loading && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  No trips assigned yet. You'll be notified when a trip is assigned to you.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
