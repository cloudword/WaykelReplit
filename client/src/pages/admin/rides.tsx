import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Package, User, Phone, Calendar, CheckCircle2, XCircle, Clock, Truck, IndianRupee, ChevronDown, ChevronUp, Info, UserCheck, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [expandedRides, setExpandedRides] = useState<Record<string, boolean>>({});

  const toggleExpand = (rideId: string) => {
    setExpandedRides((prev: Record<string, boolean>) => ({ ...prev, [rideId]: !prev[rideId] }));
  };

  const loadData = async () => {
    try {
      const data = await api.rides.list();
      // Show pending, bidding, and newly accepted ones for verification
      const filteredRides = Array.isArray(data)
        ? data.filter((r: any) => ["bidding", "pending", "accepted", "assigned"].includes(r.status))
        : [];
      setRides(filteredRides);

      const bidsMap: Record<string, Bid[]> = {};
      for (const ride of filteredRides) {
        if (ride.status === "pending" || ride.status === "bidding") {
          const rideBids = await api.bids.list({ rideId: ride.id });
          if (Array.isArray(rideBids)) {
            bidsMap[ride.id] = rideBids.filter((b: Bid) => b.status === "pending");
          }
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
      toast.success("Bid approved! Trip has been assigned.");
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
      case "pending": return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Awaiting Bids</Badge>;
      case "bidding": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Bids Received</Badge>;
      case "accepted":
      case "assigned":
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Trip Assigned</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <AdminSidebar />

      <main className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Bid Approvals</h1>
          <p className="text-gray-500 mt-1">Review and manage bids for active trips</p>
        </div>

        <div className="grid gap-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
              <p>Loading trips and bids...</p>
            </div>
          ) : rides.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="pt-12 pb-12 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-200" />
                <p className="text-lg font-medium">No pending trips or bids</p>
                <p className="text-sm">Everything is currently up to date.</p>
              </CardContent>
            </Card>
          ) : (
            rides.map((ride: any) => {
              const rideBids = bidsByRide[ride.id] || [];
              const isExpanded = expandedRides[ride.id];
              const isAssigned = ["accepted", "assigned"].includes(ride.status);

              return (
                <Collapsible
                  key={ride.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(ride.id)}
                  className="bg-white border rounded-xl shadow-sm overflow-hidden hover:border-blue-200 transition-all"
                >
                  {/* Compact Header */}
                  <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-gray-900">Trip #{ride.entityId || ride.id.substring(0, 8)}</h3>
                          {getStatusBadge(ride.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                            <MapPin className="h-3 w-3 text-green-500" /> {ride.pickupLocation.split(',')[0]}
                          </span>
                          <span className="text-gray-300">→</span>
                          <span className="flex items-center gap-1 font-medium text-gray-700">
                            <MapPin className="h-3 w-3 text-red-500" /> {ride.dropLocation.split(',')[0]}
                          </span>
                          <span className="h-3 w-px bg-gray-200" />
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {ride.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {ride.pickupTime}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Base Price</p>
                        <p className="text-lg font-bold text-gray-900">₹{Number(ride.price).toLocaleString()}</p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>

                  <CollapsibleContent className="border-t bg-gray-50/30">
                    <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x">
                      {/* Section 1: Detailed Meta */}
                      <div className="p-5 space-y-4">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Customer Metadata</p>
                          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                            <div className="w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{ride.customerName || "Walk-in Customer"}</p>
                              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Phone className="h-2 w-2" /> {ride.customerPhone || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-widest">Load Specifications</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
                              <Package className="h-3 w-3 text-blue-500" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400">Type</p>
                                <p className="text-xs font-medium truncate">{ride.cargoType}</p>
                              </div>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
                              <Info className="h-3 w-3 text-orange-500" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400">Weight</p>
                                <p className="text-xs font-medium truncate">{ride.weight}</p>
                              </div>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
                              <Clock className="h-3 w-3 text-indigo-500" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400">Category</p>
                                <p className="text-xs font-medium truncate capitalize">{ride.type || "On-Demand"}</p>
                              </div>
                            </div>
                            <div className="bg-white p-2.5 rounded-lg border border-gray-100 flex items-center gap-2">
                              <Truck className="h-3 w-3 text-green-500" />
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400">Vehicle</p>
                                <p className="text-xs font-medium truncate">{ride.requiredVehicleType || "Any"}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Full Locations */}
                      <div className="p-5 space-y-4">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Route Information</p>
                        <div className="space-y-4 relative">
                          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200 border-dashed border-l" />
                          <div className="flex gap-3 relative z-10">
                            <div className="mt-1 w-[22px] flex justify-center">
                              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Pickup Point</p>
                              <p className="text-xs font-medium text-gray-700 leading-relaxed">{ride.pickupLocation}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">PIN: {ride.pickupPincode || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex gap-3 relative z-10">
                            <div className="mt-1 w-[22px] flex justify-center">
                              <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase font-bold">Drop Point</p>
                              <p className="text-xs font-medium text-gray-700 leading-relaxed">{ride.dropLocation}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">PIN: {ride.dropPincode || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Bids or Assigned Team */}
                      <div className="p-5">
                        {isAssigned ? (
                          <div className="h-full flex flex-col">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest">Assigned Team</p>
                            <div className="flex-1 space-y-3">
                              <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm flex-shrink-0">
                                  <UserCheck className="h-5 w-5 text-green-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-green-800">Assigned Successfully</p>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                      <span className="font-semibold text-gray-800">Transporter:</span> {ride.transporter?.name || "N/A"}
                                    </p>
                                    <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                      <span className="font-semibold text-gray-800">Driver:</span> {ride.driver?.name || "N/A"}
                                    </p>
                                    <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
                                      <span className="font-semibold text-gray-800">Vehicle:</span> {ride.vehicle?.plateNumber || "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 bg-white border rounded-lg p-2.5 mt-auto">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                <span className="text-[10px] font-medium text-gray-600">Verification confirmed by Platform</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full flex flex-col">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-widest flex items-center justify-between">
                              Bids Received
                              <Badge variant="outline" className="bg-white">{rideBids.length}</Badge>
                            </p>
                            <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar">
                              {rideBids.length > 0 ? (
                                rideBids.map((bid: Bid) => (
                                  <div key={bid.id} className="bg-white border rounded-lg p-3 shadow-sm hover:shadow transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                      <div className="min-w-0">
                                        <p className="text-[11px] font-bold text-gray-700 truncate">{bid.user?.name || "Transporter"}</p>
                                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">V: {bid.vehicle?.plateNumber || bid.vehicleId.slice(0, 6)}</p>
                                      </div>
                                      <p className="text-sm font-black text-green-600">₹{Number(bid.amount).toLocaleString()}</p>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="h-7 text-[10px] flex-1 bg-green-600 hover:bg-green-700 font-bold"
                                        onClick={() => handleApproveBid(bid.id, ride.id)}
                                        disabled={!!processingBid}
                                      >
                                        {processingBid === bid.id ? "..." : "Approve"}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-[10px] flex-1 border-red-100 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
                                        onClick={() => handleRejectBid(bid.id)}
                                        disabled={!!processingBid}
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-6 bg-white/50 border border-dashed rounded-lg">
                                  <Clock className="h-6 w-6 text-gray-300 mb-2" />
                                  <p className="text-[10px] text-gray-400 font-medium">Waiting for bids</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
