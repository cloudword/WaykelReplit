import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { RideCard } from "@/components/ride-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2, RefreshCw } from "lucide-react";
import { VehicleSelector } from "@/components/vehicle-selector";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterMarketplace() {
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

  const loadRides = async () => {
    setLoading(true);
    try {
      const data = await api.rides.list({ status: "pending" });
      setRides(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load rides:", error);
      toast.error("Failed to load available loads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/transporter")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Load Marketplace</h1>
            </div>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={loadRides} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">How Bidding Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                <span>Browse available loads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>Select vehicle & place bid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                <span>Wait for Super Admin approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</span>
                <span>Start delivery after approval</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg">Available Loads ({rides.length})</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading available loads...</p>
          </div>
        ) : rides.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rides.map((ride) => (
              <Card key={ride.id} className="relative" data-testid={`ride-card-${ride.id}`}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-lg">{ride.pickup} → {ride.dropoff}</p>
                      <p className="text-sm text-gray-500">{ride.vehicleType} • {ride.distance || "N/A"}</p>
                    </div>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-gray-500">Base Price</p>
                        <p className="text-xl font-bold text-green-600">₹{parseFloat(ride.price).toLocaleString()}</p>
                      </div>
                      <Button 
                        onClick={() => handlePlaceBid(ride.id, parseFloat(ride.price))} 
                        data-testid={`button-bid-${ride.id}`}
                      >
                        Place Bid
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No loads available for bidding</p>
            <p className="text-sm">Check back later for new opportunities</p>
          </div>
        )}
      </main>
      
      <VehicleSelector 
        open={showVehicleSelector} 
        onOpenChange={setShowVehicleSelector}
        basePrice={selectedRidePrice}
        onConfirm={handleBidConfirm}
      />
    </div>
  );
}
