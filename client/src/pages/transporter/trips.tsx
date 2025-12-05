import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Building2, MapPin, Calendar, Clock, IndianRupee, Truck, Package, User } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterTrips() {
  const [_, setLocation] = useLocation();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const loadTrips = async () => {
      if (!user?.transporterId) return;
      try {
        const allRides = await api.rides.list();
        const transporterRides = Array.isArray(allRides) 
          ? allRides.filter((r: any) => r.transporterId === user.transporterId)
          : [];
        setRides(transporterRides);
      } catch (error) {
        console.error("Failed to load trips:", error);
        toast.error("Failed to load trips");
      } finally {
        setLoading(false);
      }
    };
    loadTrips();
  }, [user?.transporterId]);

  const upcomingTrips = rides.filter(r => r.status === "scheduled");
  const activeTrips = rides.filter(r => r.status === "active");
  const completedTrips = rides.filter(r => r.status === "completed");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const TripCard = ({ trip }: { trip: any }) => (
    <Card className="mb-4" data-testid={`trip-card-${trip.id}`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-gray-500">Trip #{trip.id.slice(0, 8)}</p>
            <p className="font-semibold text-lg">{trip.cargoType}</p>
          </div>
          <Badge className={getStatusColor(trip.status)}>
            {trip.status}
          </Badge>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-2">
            <div className="mt-1"><div className="w-2 h-2 rounded-full bg-green-500" /></div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="text-sm font-medium">{trip.pickupLocation}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="mt-1"><div className="w-2 h-2 rounded-full bg-red-500" /></div>
            <div className="flex-1">
              <p className="text-xs text-gray-500">Drop</p>
              <p className="text-sm font-medium">{trip.dropLocation}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600 border-t pt-3">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{trip.date}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{trip.pickupTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{trip.weight}</span>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          <div className="flex items-center text-green-600 font-bold text-lg">
            <IndianRupee className="h-4 w-4" />
            {parseFloat(trip.price || "0").toLocaleString()}
          </div>
          <Button size="sm" variant="outline" onClick={() => setLocation(`/transporter/trips/${trip.id}`)}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );

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
              <h1 className="text-xl font-bold text-gray-900">My Trips</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeTrips.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Upcoming ({upcomingTrips.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedTrips.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : activeTrips.length > 0 ? (
              activeTrips.map(trip => <TripCard key={trip.id} trip={trip} />)
            ) : (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active trips</p>
                <p className="text-sm text-gray-400 mt-1">Trips will appear here once bids are accepted</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {loading ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : upcomingTrips.length > 0 ? (
              upcomingTrips.map(trip => <TripCard key={trip.id} trip={trip} />)
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No upcoming trips scheduled</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {loading ? (
              <p className="text-center py-8 text-gray-500">Loading...</p>
            ) : completedTrips.length > 0 ? (
              completedTrips.map(trip => <TripCard key={trip.id} trip={trip} />)
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No completed trips yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
