import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { RideCard } from "@/components/ride-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { VehicleSelector } from "@/components/vehicle-selector";
import { api } from "@/lib/api";

export default function DriverDashboard() {
  const [_, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedRidePrice, setSelectedRidePrice] = useState<number>(0);
  const [rides, setRides] = useState<any[]>([]);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRides = async () => {
      try {
        const data = await api.rides.list({ status: "pending" });
        setRides(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load rides:", error);
      } finally {
        setLoading(false);
      }
    };
    loadRides();
  }, []);

  const handleOnlineToggle = async (checked: boolean) => {
    setIsOnline(checked);
    if (user?.id) {
      try {
        await api.users.updateOnlineStatus(user.id, checked);
      } catch (error) {
        console.error("Failed to update online status:", error);
      }
    }
  };

  const handleAcceptRide = (rideId: string, price: number) => {
    setSelectedRideId(rideId);
    setSelectedRidePrice(price);
    setShowVehicleSelector(true);
  };

  const handleBidConfirm = async (vehicleId: string, bidAmount: string) => {
    if (!selectedRideId || !user?.id) return;
    
    try {
      await api.bids.create({
        rideId: selectedRideId,
        userId: user.id,
        transporterId: user.transporterId,
        vehicleId,
        amount: bidAmount,
      });
      setShowVehicleSelector(false);
      setLocation(`/driver/active-ride/${selectedRideId}`);
    } catch (error) {
      console.error("Failed to place bid:", error);
    }
  };

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-primary">Waykel</h1>
          <p className="text-xs text-muted-foreground">Welcome, {user.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
            <Label htmlFor="status-mode" className="text-xs font-medium cursor-pointer">
              {isOnline ? "Online" : "Offline"}
            </Label>
            <Switch 
              id="status-mode" 
              checked={isOnline} 
              onCheckedChange={handleOnlineToggle}
              className="scale-75 data-[state=checked]:bg-green-500"
            />
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="rounded-full h-8 w-8"
            onClick={() => setLocation("/driver/notifications")}
          >
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-primary text-sm">Got a load from network?</h3>
            <p className="text-xs text-muted-foreground">Book a ride manually & earn incentive</p>
          </div>
          <Button size="sm" className="gap-1 h-8" onClick={() => setLocation("/driver/book-ride")}>
            <Plus className="h-4 w-4" /> Book Ride
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">New Requests</h2>
            <span className="text-xs font-medium bg-primary text-white px-2 py-0.5 rounded-full">
              {rides.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading available rides...</p>
            </div>
          ) : rides.length > 0 ? (
            rides.map((ride) => (
              <RideCard 
                key={ride.id} 
                ride={ride} 
                onAccept={() => handleAcceptRide(ride.id, parseFloat(ride.price))} 
                data-testid={`ride-card-${ride.id}`}
              />
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No new requests nearby.</p>
            </div>
          )}
        </div>
      </main>
      
      <VehicleSelector 
        open={showVehicleSelector} 
        onOpenChange={setShowVehicleSelector}
        basePrice={selectedRidePrice}
        onConfirm={handleBidConfirm}
        data-testid="vehicle-selector"
      />

      <MobileNav />
    </div>
  );
}
