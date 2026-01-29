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
import { useTransporterSessionGate } from "@/hooks/useTransporterSession";

export default function TransporterBids() {
  const [_, setLocation] = useLocation();
  const [bids, setBids] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: sessionUser, isReady: sessionReady, isChecking: sessionChecking } = useTransporterSessionGate();
  const user = sessionUser;

  const loadData = async () => {
    if (!sessionReady || !sessionUser?.transporterId) return;
    setLoading(true);
    try {
      const [bidsData, ridesData, vehiclesData] = await Promise.all([
        api.bids.list({ transporterId: sessionUser.transporterId }),
        api.rides.list(),
        api.vehicles.list({ transporterId: sessionUser.transporterId }),
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
  }, [sessionReady, sessionUser?.transporterId]);

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
    // Prefer embedded ride data from join, fallback to local lookup
    const ride = bid.ride || getRideDetails(bid.rideId);
    const vehicle = getVehicleDetails(bid.vehicleId);

    return (
      <Card className="overflow-hidden border-card-border hover:shadow-md transition-shadow h-full flex flex-col" data-testid={`bid-card-${bid.id}`}>
        <div className="bg-muted/30 px-4 py-2 border-b flex justify-between items-center">
          <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-tight">Bid #{bid.id.slice(0, 8)}</span>
          <Badge variant="outline" className={`${getStatusColor(bid.status)} border-none text-[10px] font-bold uppercase`}>
            {bid.status}
          </Badge>
        </div>
        <CardContent className="p-4 flex-1 flex flex-col">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">
                  {ride?.pickupLocation?.split(',')[0]} → {ride?.dropLocation?.split(',')[0]}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Route Details</p>
              </div>
            </div>

            {ride && (
              <div className="space-y-2 mb-4 text-sm bg-muted/20 p-2.5 rounded-lg border border-border/50">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight line-clamp-1">{ride.pickupLocation}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight line-clamp-1">{ride.dropLocation}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] text-muted-foreground font-bold">{ride.date} • {ride.pickupTime}</span>
                </div>
              </div>
            )}

            {vehicle && (
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="text-[11px] font-bold text-muted-foreground uppercase">{vehicle.plateNumber}</span>
                <span className="text-[11px] text-muted-foreground">• {vehicle.type}</span>
              </div>
            )}
          </div>

          <div className="mt-auto pt-3 border-t flex items-end justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Your Bid</p>
              <div className="flex items-center text-primary font-bold text-xl">
                <span className="text-sm mr-0.5">₹</span>
                {parseFloat(bid.amount || "0").toLocaleString()}
              </div>
            </div>
            {ride && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5">Original</p>
                <p className="text-xs font-bold text-muted-foreground">₹{parseFloat(ride.price || "0").toLocaleString()}</p>
              </div>
            )}
          </div>

          {bid.status === "accepted" && (
            <Button
              className="w-full mt-4 h-9 text-xs font-bold"
              onClick={() => setLocation(`/transporter/trips`)}
              data-testid="button-view-trip"
            >
              Manage Trip
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (!sessionUser && !sessionChecking) {
    setLocation("/auth");
    return null;
  }

  if (sessionChecking || !sessionReady) {
    return (
      <div className="min-h-screen bg-gray-50 pl-64 flex items-center justify-center text-gray-500">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        Checking session...
      </div>
    );
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
              <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground animate-pulse">Fetching your bids...</p>
              </div>
            ) : pendingBids.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingBids.map(bid => <BidCard key={bid.id} bid={bid} />)}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-muted shadow-sm">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gavel className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-bold mb-1">No Pending Bids</h3>
                <p className="text-muted-foreground mb-6 max-w-xs mx-auto text-sm italic">You haven't placed any bids that are currently awaiting a response.</p>
                <Button
                  variant="default"
                  className="font-bold h-10 px-8"
                  onClick={() => setLocation("/transporter/marketplace")}
                >
                  Find New Trips
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="accepted">
            {acceptedBids.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {acceptedBids.map(bid => <BidCard key={bid.id} bid={bid} />)}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-muted">
                <p className="text-muted-foreground italic">No accepted bids found in your history.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedBids.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rejectedBids.map(bid => <BidCard key={bid.id} bid={bid} />)}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl border border-muted">
                <p className="text-muted-foreground italic">No rejected bids found in your history.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
