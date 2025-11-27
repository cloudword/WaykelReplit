import { useState } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { MOCK_RIDES, MOCK_USER } from "@/lib/mockData";
import { RideCard } from "@/components/ride-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Building2 } from "lucide-react";
import { VehicleSelector } from "@/components/vehicle-selector";

export default function TransporterDashboard() {
  const [_, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(true);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedRidePrice, setSelectedRidePrice] = useState<number>(0);

  // Transporters see all pending rides in the market
  const marketRides = MOCK_RIDES.filter(r => r.status === "pending");

  const handlePlaceBid = (rideId: string, price: number) => {
    setSelectedRideId(rideId);
    setSelectedRidePrice(price);
    setShowVehicleSelector(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-primary">Waykel Business</h1>
          </div>
          <p className="text-xs text-muted-foreground">FastTrack Logistics • Mumbai</p>
        </div>
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" className="rounded-full h-8 w-8">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Marketplace (Loads)</h2>
            <span className="text-xs font-medium bg-primary text-white px-2 py-0.5 rounded-full">
              {marketRides.length}
            </span>
          </div>

          {marketRides.length > 0 ? (
            marketRides.map((ride) => (
              <div key={ride.id} className="relative">
                <RideCard 
                  ride={ride} 
                  // Transporter "Accept" logic is actually "Place Bid"
                />
                <div className="absolute bottom-4 right-4">
                   <Button onClick={() => handlePlaceBid(ride.id, ride.price)} className="h-9 shadow-lg">
                     Place Bid
                   </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No loads available for bidding.</p>
            </div>
          )}
        </div>
      </main>
      
      <VehicleSelector 
        open={showVehicleSelector} 
        onOpenChange={setShowVehicleSelector}
        basePrice={selectedRidePrice}
        onConfirm={(vehicleId, bidAmount) => {
          console.log(`Transporter bid placed: Ride ${selectedRideId}, Vehicle ${vehicleId}, Amount ${bidAmount}`);
          setShowVehicleSelector(false);
          alert("Bid submitted successfully! You will be notified if the Admin accepts.");
        }}
      />
      
      {/* Custom Nav for Transporter */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16">
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-primary">
             <Building2 size={20} />
             <span className="text-[10px]">Market</span>
           </Button>
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/transporter/bids")}>
             <Building2 size={20} />
             <span className="text-[10px]">My Bids</span>
           </Button>
        </div>
      </nav>
    </div>
  );
}
