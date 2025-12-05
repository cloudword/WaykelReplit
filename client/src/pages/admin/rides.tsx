import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MapPin, Package, Truck, User, Phone, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AdminBids() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRides = async () => {
      try {
        const data = await api.rides.list();
        setRides(Array.isArray(data) ? data.filter(r => r.status === "bid_placed" || r.status === "pending") : []);
      } catch (error) {
        console.error("Failed to load rides:", error);
        toast.error("Failed to load rides");
      } finally {
        setLoading(false);
      }
    };
    loadRides();
  }, []);

  const handleApproveBid = async (bidId: string) => {
    try {
      await api.bids.updateStatus(bidId, "accepted");
      toast.success("Bid approved successfully!");
      // Reload rides
      const data = await api.rides.list();
      setRides(Array.isArray(data) ? data.filter(r => r.status === "bid_placed" || r.status === "pending") : []);
    } catch (error) {
      toast.error("Failed to approve bid");
    }
  };

  const handleRejectBid = async (bidId: string) => {
    try {
      await api.bids.updateStatus(bidId, "rejected");
      toast.success("Bid rejected successfully!");
      // Reload rides
      const data = await api.rides.list();
      setRides(Array.isArray(data) ? data.filter(r => r.status === "bid_placed" || r.status === "pending") : []);
    } catch (error) {
      toast.error("Failed to reject bid");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bid Management</h1>
          <p className="text-gray-500">Review active loads and approve driver/transporter bids</p>
        </div>

        {/* List of Loads with Bids */}
        <div className="grid gap-6">
          {loading ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                Loading rides...
              </CardContent>
            </Card>
          ) : rides.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No pending bids to review
              </CardContent>
            </Card>
          ) : (
            rides.map((ride) => (
              <Card key={ride.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row border-b md:border-b-0">
                  {/* Trip Details Section */}
                  <div className="flex-1 p-6 border-r bg-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          Load #{ride.id.substring(0, 8)}
                          <Badge variant="outline" className="font-normal">
                            {ride.cargoType} • {ride.weight}
                          </Badge>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">Posted on {ride.date || "2025-12-05"}</p>
                      </div>
                      <div className="text-right">
                         <p className="text-xs text-gray-500 uppercase">Budget</p>
                         <p className="text-xl font-bold text-gray-900">₹{ride.price}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-4">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <div className="mt-1"><div className="w-2 h-2 rounded-full bg-green-500" /></div>
                          <div>
                             <p className="text-xs text-gray-500 uppercase">Pickup</p>
                             <p className="font-medium text-sm">{ride.pickupLocation}</p>
                             <p className="text-xs text-gray-400">{ride.pickupTime}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="mt-1"><div className="w-2 h-2 rounded-full bg-red-500" /></div>
                          <div>
                             <p className="text-xs text-gray-500 uppercase">Drop</p>
                             <p className="font-medium text-sm">{ride.dropLocation}</p>
                             <p className="text-xs text-gray-400">{ride.dropTime || "Not specified"}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{ride.customerName || "TechCorp"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{ride.customerPhone || "9111122223"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{ride.cargoType}, {ride.weight}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bids List Section */}
                  <div className="w-full md:w-[450px] bg-gray-50/50 p-6">
                    <h4 className="font-semibold text-sm text-gray-900 mb-4 flex items-center justify-between">
                      Status 
                      <Badge className="bg-blue-600">{ride.status}</Badge>
                    </h4>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {ride.status === "bid_placed" ? "Bids received - Ready for approval" : "Awaiting bids from drivers"}
                      </p>
                      {ride.status === "bid_placed" && (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                          <p className="font-semibold text-gray-900">Pending Admin Review</p>
                          <p className="text-sm text-gray-600 mt-1">Click the approve button above to assign this load</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
