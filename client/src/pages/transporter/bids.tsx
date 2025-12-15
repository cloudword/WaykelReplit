import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gavel, MapPin, IndianRupee, Clock, Truck, RefreshCw } from "lucide-react";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterBids() {
  const [_, setLocation] = useLocation();
  const [bids, setBids] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const loadData = async () => {
    if (!user?.transporterId) return;
    setLoading(true);
    try {
      const [bidsData, ridesData, vehiclesData] = await Promise.all([
        api.bids.list({ transporterId: user.transporterId }),
        api.rides.list(),
        api.vehicles.list({ transporterId: user.transporterId }),
      ]);
      setBids(Array.isArray(bidsData) ? bidsData : []);
      setRides(Array.isArray(ridesData) ? ridesData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
    } catch (error) {
      console.error("Failed to load bids:", error);
      toast.error("Failed to load bids");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.transporterId]);

  const getRideDetails = (rideId: string) => {
    return rides.find(r => r.id === rideId);
  };

  const getVehicleDetails = (vehicleId: string) => {
    return vehicles.find(v => v.id === vehicleId);
  };

  const pendingBids = bids.filter(b => b.status === "pending");
  const acceptedBids = bids.filter(b => b.status === "accepted");
  const rejectedBids = bids.filter(b => b.status === "rejected");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const BidCard = ({ bid }: { bid: any }) => {
    const ride = getRideDetails(bid.rideId);
    const vehicle = getVehicleDetails(bid.vehicleId);

    return (
      <Card className="mb-4" data-testid={`bid-card-${bid.id}`}>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs text-gray-500">Bid #{bid.id.slice(0, 8)}</p>
              <p className="font-semibold">
                {ride?.pickupLocation?.split(',')[0]} → {ride?.dropLocation?.split(',')[0]}
              </p>
            </div>
            <Badge className={getStatusColor(bid.status)}>
              {bid.status}
            </Badge>
          </div>

          {ride && (
            <div className="bg-gray-50 p-3 rounded-lg mb-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{ride.pickupLocation}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-red-400" />
                <span className="text-gray-600">{ride.dropLocation}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{ride.date} at {ride.pickupTime}</span>
              </div>
            </div>
          )}

          {vehicle && (
            <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
              <Truck className="h-4 w-4" />
              <span>{vehicle.plateNumber} - {vehicle.type}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t">
            <div>
              <p className="text-xs text-gray-500">Your Bid</p>
              <div className="flex items-center text-green-600 font-bold text-xl">
                <IndianRupee className="h-4 w-4" />
                {parseFloat(bid.amount || "0").toLocaleString()}
              </div>
            </div>
            {ride && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Original Price</p>
                <p className="text-gray-600">₹{parseFloat(ride.price || "0").toLocaleString()}</p>
              </div>
            )}
          </div>

          {bid.status === "accepted" && (
            <Button 
              className="w-full mt-4" 
              onClick={() => setLocation(`/transporter/trips`)}
              data-testid="button-view-trip"
            >
              View Trip Details
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <TransporterSidebar />
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Gavel className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">My Bids</h1>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={loadData} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-600">{pendingBids.length}</p>
              <p className="text-sm text-gray-500">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{acceptedBids.length}</p>
              <p className="text-sm text-gray-500">Accepted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{rejectedBids.length}</p>
              <p className="text-sm text-gray-500">Rejected</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingBids.length})
            </TabsTrigger>
            <TabsTrigger value="accepted" data-testid="tab-accepted">
              Accepted ({acceptedBids.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedBids.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {loading ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : pendingBids.length > 0 ? (
              pendingBids.map(bid => <BidCard key={bid.id} bid={bid} />)
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No pending bids</p>
                <Button 
                  className="mt-4" 
                  variant="outline"
                  onClick={() => setLocation("/transporter/marketplace")}
                >
                  Browse Marketplace
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {acceptedBids.length > 0 ? (
              acceptedBids.map(bid => <BidCard key={bid.id} bid={bid} />)
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No accepted bids yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedBids.length > 0 ? (
              rejectedBids.map(bid => <BidCard key={bid.id} bid={bid} />)
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No rejected bids</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
