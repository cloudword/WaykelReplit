import { useState } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MOCK_RIDES, MOCK_USER } from "@/lib/mockData";
import { RideCard } from "@/components/ride-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Plus } from "lucide-react";
import { VehicleSelector } from "@/components/vehicle-selector";

export default function DriverDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);

  const activeRides = MOCK_RIDES.filter(r => r.status === "pending");

  const handleAcceptRide = (rideId: string) => {
    setSelectedRideId(rideId);
    setShowVehicleSelector(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-primary">Waykel</h1>
          <p className="text-xs text-muted-foreground">Welcome, {MOCK_USER.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
            <Label htmlFor="status-mode" className="text-xs font-medium cursor-pointer">
              {isOnline ? "Online" : "Offline"}
            </Label>
            <Switch 
              id="status-mode" 
              checked={isOnline} 
              onCheckedChange={setIsOnline}
              className="scale-75 data-[state=checked]:bg-green-500"
            />
          </div>
          <Button size="icon" variant="ghost" className="rounded-full h-8 w-8">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {/* Quick Action for external loads */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-primary text-sm">Got a load from network?</h3>
            <p className="text-xs text-muted-foreground">Book a ride manually</p>
          </div>
          <Button size="sm" className="gap-1 h-8">
            <Plus className="h-4 w-4" /> Book Ride
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">New Requests</h2>
            <span className="text-xs font-medium bg-primary text-white px-2 py-0.5 rounded-full">
              {activeRides.length}
            </span>
          </div>

          {activeRides.length > 0 ? (
            activeRides.map((ride) => (
              <RideCard 
                key={ride.id} 
                ride={ride} 
                onAccept={() => handleAcceptRide(ride.id)} 
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
        onConfirm={(vehicleId) => {
          console.log(`Ride ${selectedRideId} accepted with vehicle ${vehicleId}`);
          setShowVehicleSelector(false);
          // Here you would normally navigate to active ride screen
        }}
      />

      <MobileNav />
    </div>
  );
}
