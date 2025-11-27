import { useState } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Search, Filter, MapPin, Package, Truck, User, Phone, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { MOCK_RIDES, Ride } from "@/lib/mockData";

export default function AdminBids() {
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const ridesWithBids = MOCK_RIDES.filter(r => r.bids && r.bids.length > 0);

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
          {ridesWithBids.map((ride) => (
            <Card key={ride.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row border-b md:border-b-0">
                {/* Trip Details Section */}
                <div className="flex-1 p-6 border-r bg-white">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        Load #{ride.id}
                        <Badge variant="outline" className="font-normal">
                          {ride.cargoType} • {ride.weight}
                        </Badge>
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">Posted on {ride.date || "2025-11-27"}</p>
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
                        <span className="font-medium">{ride.customerName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{ride.customerPhone}</span>
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
                    Received Bids 
                    <Badge className="bg-blue-600">{ride.bids?.length || 0}</Badge>
                  </h4>
                  
                  <div className="space-y-3">
                    {ride.bids?.map((bid, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{bid.driverName}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Truck className="h-3 w-3" />
                              {bid.vehicleId === 'v1' ? 'Tata Ace' : 'Ashok Leyland'}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600 text-lg">₹{bid.amount}</p>
                            <p className="text-[10px] text-gray-400">{bid.timestamp}</p>
                          </div>
                        </div>
                        
                        {bid.status === 'pending' ? (
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" className="flex-1 h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                              <XCircle className="h-3.5 w-3.5 mr-1.5" />
                              Reject
                            </Button>
                            <Button size="sm" className="flex-1 h-8 bg-green-600 hover:bg-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              Accept
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-2 pt-2 border-t flex items-center justify-center text-sm font-medium text-gray-600">
                            Status: <span className="capitalize ml-1">{bid.status}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}

          {ridesWithBids.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border border-dashed">
              <p className="text-gray-500">No active bids waiting for approval.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
