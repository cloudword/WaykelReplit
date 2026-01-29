import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Package, Truck, Calendar, Clock, User, Phone, ArrowLeft, IndianRupee, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { api } from "@/lib/api";

interface BidInfo {
  id: string;
  amount: string;
  status: string;
  transporterName: string;
  vehicle: {
    type: string;
    model: string;
    plateNumber: string;
  } | null;
  createdAt: string;
}

function RideBidsSection({ rideId }: { rideId: string }) {
  const [bids, setBids] = useState<BidInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const loadBids = async () => {
      try {
        const data = await api.rides.getCheapestBids(rideId, 5);
        setBids(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load bids:", error);
      } finally {
        setLoading(false);
      }
    };
    loadBids();
  }, [rideId]);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
        <p className="text-xs text-blue-700">Loading bids...</p>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
        <p className="text-xs font-semibold text-yellow-800">Awaiting Bids</p>
        <p className="text-sm text-yellow-700 mt-1">Drivers will bid on your load soon</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex justify-between items-center"
        data-testid="button-toggle-bids"
      >
        <div>
          <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
            <IndianRupee className="h-3 w-3" />
            {bids.length} Bid{bids.length > 1 ? 's' : ''} Received
          </p>
          <p className="text-sm text-blue-700 mt-0.5">
            Lowest: ₹{parseFloat(bids[0]?.amount || "0").toLocaleString()}
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-blue-600" /> : <ChevronDown className="h-4 w-4 text-blue-600" />}
      </button>

      {expanded && (
        <div className="border-t border-blue-200 p-3 space-y-2">
          {bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`p-3 rounded-lg ${index === 0 ? 'bg-green-100 border border-green-200' : 'bg-white border border-gray-100'}`}
              data-testid={`bid-card-${bid.id}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{bid.transporterName}</p>
                    {bid.vehicle && (
                      <p className="text-xs text-gray-500">
                        {bid.vehicle.type} • {bid.vehicle.model}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}>
                    ₹{parseFloat(bid.amount).toLocaleString()}
                  </p>
                  {index === 0 && (
                    <Badge className="bg-green-600 text-white text-[10px]">Lowest</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-center text-gray-500 mt-2">
            Admin will select the best transporter for your load
          </p>
        </div>
      )}
    </div>
  );
}

export default function CustomerRides() {
  const [_, setLocation] = useLocation();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const loadRides = async () => {
      try {
        const data = await api.rides.list();
        setRides(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load rides:", error);
      } finally {
        setLoading(false);
      }
    };
    loadRides();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "bidding": return "bg-blue-100 text-blue-800";
      case "accepted": return "bg-purple-100 text-purple-800";
      case "assigned": return "bg-indigo-100 text-indigo-800";
      case "active": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Awaiting Bids";
      case "bidding": return "Bids Received";
      case "accepted": return "Bid Approved";
      case "assigned": return "Driver Assigned";
      case "active": return "In Transit";
      case "completed": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return status;
    }
  };

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  const activeRides = rides.filter(r => ["pending", "bidding", "accepted", "assigned", "active"].includes(r.status));
  const pastRides = rides.filter(r => ["completed", "cancelled"].includes(r.status));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full h-8 w-8"
          onClick={() => setLocation("/customer")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">My Rides</h1>
          <p className="text-xs text-muted-foreground">Track your shipments</p>
        </div>
      </header>

      <main className="p-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active">Active ({activeRides.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastRides.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Loading your rides...</p>
              </div>
            ) : activeRides.length > 0 ? (
              activeRides.map((ride) => (
                <Card key={ride.id} className="border-none shadow-md" data-testid={`ride-card-${ride.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500">Ride #{ride.id.substring(0, 8)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{ride.cargoType}</Badge>
                          <Badge variant="outline">{ride.weight}</Badge>
                        </div>
                      </div>
                      <Badge className={getStatusColor(ride.status)}>
                        {getStatusLabel(ride.status)}
                      </Badge>
                    </div>

                    <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                      <div className="flex gap-2">
                        <div className="mt-1"><div className="w-2 h-2 rounded-full bg-green-500" /></div>
                        <div>
                          <p className="text-xs text-gray-500">Pickup</p>
                          <p className="font-medium text-sm">{ride.pickupLocation}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="mt-1"><div className="w-2 h-2 rounded-full bg-red-500" /></div>
                        <div>
                          <p className="text-xs text-gray-500">Drop</p>
                          <p className="font-medium text-sm">{ride.dropLocation}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {ride.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {ride.pickupTime}
                      </span>
                    </div>

                    {ride.status === "active" && ride.assignedDriverId && (
                      <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                        <p className="text-xs font-semibold text-green-800">Driver Assigned</p>
                        <p className="text-sm text-green-700 mt-1">Your shipment is on its way!</p>
                      </div>
                    )}

                    {(ride.status === "bidding" || ride.status === "pending" || ride.status === "accepted") && (
                      <RideBidsSection rideId={ride.id} />
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No active rides</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setLocation("/customer")}
                >
                  Book a Ride
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastRides.length > 0 ? (
              pastRides.map((ride) => (
                <Card key={ride.id} className="border-none shadow-md">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500">Ride #{ride.id.substring(0, 8)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{ride.cargoType}</Badge>
                        </div>
                      </div>
                      <Badge className={getStatusColor(ride.status)}>
                        {getStatusLabel(ride.status)}
                      </Badge>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span>{ride.pickupLocation}</span>
                      <span className="text-gray-400">→</span>
                      <span>{ride.dropLocation}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{ride.date}</span>
                      {ride.price !== "0" && (
                        <span className="font-semibold text-gray-900">₹{ride.price}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No past rides</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16">
          <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/customer")}>
            <Truck size={20} />
            <span className="text-[10px]">Book</span>
          </Button>
          <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-primary">
            <Package size={20} />
            <span className="text-[10px]">My Rides</span>
          </Button>
          <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/customer/profile")}>
            <User size={20} />
            <span className="text-[10px]">Profile</span>
          </Button>
        </div>
      </nav>
    </div>
  );
}
