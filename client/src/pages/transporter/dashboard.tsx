import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { RideCard } from "@/components/ride-card";
import { Button } from "@/components/ui/button";
import { Bell, Building2, FileText, Truck, User } from "lucide-react";
import { VehicleSelector } from "@/components/vehicle-selector";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterDashboard() {
  const [_, setLocation] = useLocation();
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedRidePrice, setSelectedRidePrice] = useState<number>(0);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

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

  const handlePlaceBid = (rideId: string, price: number) => {
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
      toast.success("Bid submitted! Awaiting Super Admin approval.");
      setLocation("/transporter/bids");
    } catch (error) {
      toast.error("Failed to place bid");
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
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-bold text-primary">Waykel Business</h1>
          </div>
          <p className="text-xs text-muted-foreground">{user.name} • Transporter</p>
        </div>
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" className="rounded-full h-8 w-8">
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 text-sm">How it works</h3>
          <p className="text-xs text-blue-600 mt-1">
            1. Browse loads → 2. Place your bid → 3. Wait for Super Admin approval → 4. Start delivery
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">Marketplace (Available Loads)</h2>
            <span className="text-xs font-medium bg-primary text-white px-2 py-0.5 rounded-full">
              {rides.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Loading available loads...</p>
            </div>
          ) : rides.length > 0 ? (
            rides.map((ride) => (
              <div key={ride.id} className="relative">
                <RideCard 
                  ride={ride} 
                  data-testid={`ride-card-${ride.id}`}
                />
                <div className="absolute bottom-4 right-4">
                   <Button 
                     onClick={() => handlePlaceBid(ride.id, parseFloat(ride.price))} 
                     className="h-9 shadow-lg"
                     data-testid={`button-bid-${ride.id}`}
                   >
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
        onConfirm={handleBidConfirm}
      />
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16">
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-primary">
             <Truck size={20} />
             <span className="text-[10px]">Marketplace</span>
           </Button>
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/transporter/bids")}>
             <FileText size={20} />
             <span className="text-[10px]">My Bids</span>
           </Button>
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/transporter/profile")}>
             <User size={20} />
             <span className="text-[10px]">Profile</span>
           </Button>
        </div>
      </nav>
    </div>
  );
}
