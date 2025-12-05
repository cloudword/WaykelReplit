import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Package, Calendar, Clock, IndianRupee, Truck, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function DriverRides() {
  const [_, setLocation] = useLocation();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const loadRides = async () => {
      if (!user?.id) return;
      try {
        const data = await api.rides.list({ driverId: user.id });
        setRides(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load rides:", error);
        toast.error("Failed to load rides");
      } finally {
        setLoading(false);
      }
    };
    loadRides();
  }, [user?.id]);

  const activeRides = rides.filter(r => ["active", "scheduled"].includes(r.status));
  const completedRides = rides.filter(r => r.status === "completed");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b">
        <h1 className="text-xl font-bold">My Rides</h1>
        <p className="text-sm text-gray-500">Track your assigned and completed trips</p>
      </header>

      <main className="p-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="active" data-testid="tab-active">Active ({activeRides.length})</TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History ({completedRides.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-4">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : activeRides.length > 0 ? (
              activeRides.map(ride => (
                <Card 
                  key={ride.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/driver/active-ride/${ride.id}`)}
                  data-testid={`ride-card-${ride.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(ride.status)}>
                          {ride.status === "active" ? "In Progress" : "Scheduled"}
                        </Badge>
                        <span className="text-xs text-gray-500">#{ride.id.slice(0, 8)}</span>
                      </div>
                      <div className="flex items-center text-green-600 font-bold">
                        <IndianRupee className="h-4 w-4" />
                        {parseFloat(ride.price || "0").toLocaleString()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="mt-1"><div className="w-2 h-2 rounded-full bg-green-500" /></div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Pickup</p>
                          <p className="text-sm font-medium">{ride.pickupLocation}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1"><div className="w-2 h-2 rounded-full bg-red-500" /></div>
                        <div className="flex-1">
                          <p className="text-xs text-gray-500">Drop</p>
                          <p className="text-sm font-medium">{ride.dropLocation}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {ride.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {ride.pickupTime}
                        </span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-primary">
                        View <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-10">
                <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400">No active rides</p>
                <p className="text-sm text-gray-400 mt-1">Accept rides from the dashboard to get started</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {completedRides.length > 0 ? (
              completedRides.map(ride => (
                <Card key={ride.id} data-testid={`history-card-${ride.id}`}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs text-gray-500">#{ride.id.slice(0, 8)}</p>
                        <p className="font-medium">{ride.cargoType}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center text-green-600 font-bold">
                          <IndianRupee className="h-4 w-4" />
                          {parseFloat(ride.price || "0").toLocaleString()}
                        </div>
                        <p className="text-xs text-gray-500">{ride.date}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{ride.pickupLocation}</span>
                      <span>→</span>
                      <span className="truncate">{ride.dropLocation}</span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <p>No completed rides yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav />
    </div>
  );
}
