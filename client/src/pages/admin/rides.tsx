import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, User, Phone, Calendar, CheckCircle2, XCircle, Clock, Truck, IndianRupee } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Bid {
  id: string;
  rideId: string;
  userId: string;
  vehicleId: string;
  amount: string;
  status: string;
  createdAt: string;
  user?: any;
  vehicle?: any;
}

export default function AdminBids() {
  const [rides, setRides] = useState<any[]>([]);
  const [bidsByRide, setBidsByRide] = useState<Record<string, Bid[]>>({});
  const [loading, setLoading] = useState(true);
  const [processingBid, setProcessingBid] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await api.rides.list();
      const filteredRides = Array.isArray(data)
        ? data.filter((r: any) => ["bidding", "pending"].includes(r.status))
        : [];
      setRides(filteredRides);

      const bidsMap: Record<string, Bid[]> = {};
      for (const ride of filteredRides) {
        const rideBids = await api.bids.list({ rideId: ride.id });
        if (Array.isArray(rideBids)) {
          bidsMap[ride.id] = rideBids.filter((b: Bid) => b.status === "pending");
        }
      }
      setBidsByRide(bidsMap);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load rides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveBid = async (bidId: string, rideId: string) => {
    setProcessingBid(bidId);
    try {
      await api.bids.updateStatus(bidId, "accepted");
      toast.success("Bid approved! Driver has been assigned to this load.");
      await loadData();
    } catch (error) {
      toast.error("Failed to approve bid");
    } finally {
      setProcessingBid(null);
    }
  };

  const handleRejectBid = async (bidId: string) => {
    setProcessingBid(bidId);
    try {
      await api.bids.updateStatus(bidId, "rejected");
      toast.success("Bid rejected");
      await loadData();
    } catch (error) {
      toast.error("Failed to reject bid");
    } finally {
      setProcessingBid(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge className="bg-yellow-500">Awaiting Bids</Badge>;
      case "bidding": return <Badge className="bg-blue-600">Bids Received</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />

      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bid Approvals</h1>
          <p className="text-gray-500">Review and approve driver/transporter bids for active loads</p>
        </div>

        <div className="grid gap-6">
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <div className="animate-pulse">Loading rides and bids...</div>
              </CardContent>
            </Card>
          ) : rides.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No pending loads or bids to review</p>
              </CardContent>
            </Card>
          ) : (
            rides.map((ride) => {
              const rideBids = bidsByRide[ride.id] || [];
              return (
                <Card key={ride.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`ride-card-${ride.id}`}>
                  <CardHeader className="bg-white border-b pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-3">
                          Load #{ride.id.substring(0, 8)}
                          {getStatusBadge(ride.status)}
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-1 flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" /> {ride.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" /> {ride.pickupTime}
                          </span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase">Base Price</p>
                        <p className="text-xl font-bold text-gray-900">₹{ride.price}</p>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
                      {/* Load Details */}
                      <div className="p-6 space-y-4">
                        <h4 className="font-semibold text-sm text-gray-500 uppercase">Load Details</h4>

                        <div className="space-y-3">
                          <div className="flex gap-3">
                            <div className="mt-1"><div className="w-3 h-3 rounded-full bg-green-500" /></div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Pickup</p>
                              <p className="font-medium">{ride.pickupLocation}</p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <div className="mt-1"><div className="w-3 h-3 rounded-full bg-red-500" /></div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Drop</p>
                              <p className="font-medium">{ride.dropLocation}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span>{ride.cargoType}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{ride.weight}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>{ride.customerName || "Customer"}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Phone className="h-3 w-3" /> {ride.customerPhone || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bids Section */}
                      <div className="p-6 bg-gray-50/50">
                        <h4 className="font-semibold text-sm text-gray-500 uppercase mb-4 flex items-center justify-between">
                          Bids Received
                          <Badge variant="outline">{rideBids.length}</Badge>
                        </h4>

                        {rideBids.length > 0 ? (
                          <div className="space-y-3">
                            {rideBids.map((bid) => (
                              <div
                                key={bid.id}
                                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow transition-shadow"
                                data-testid={`bid-card-${bid.id}`}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <p className="font-semibold flex items-center gap-2">
                                      <Truck className="h-4 w-4 text-blue-600" />
                                      Driver Bid
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Vehicle ID: {bid.vehicleId?.substring(0, 8)}...
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xl font-bold text-green-600 flex items-center gap-1">
                                      <IndianRupee className="h-5 w-5" />
                                      {bid.amount}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApproveBid(bid.id, ride.id)}
                                    disabled={processingBid === bid.id}
                                    data-testid={`button-approve-${bid.id}`}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    {processingBid === bid.id ? "Processing..." : "Approve"}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                                    onClick={() => handleRejectBid(bid.id)}
                                    disabled={processingBid === bid.id}
                                    data-testid={`button-reject-${bid.id}`}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No bids yet</p>
                            <p className="text-xs mt-1">Waiting for drivers to submit bids</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
