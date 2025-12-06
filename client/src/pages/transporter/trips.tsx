import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  ArrowLeft, Building2, MapPin, Calendar, Clock, IndianRupee, Truck, Package, User,
  Search, Filter, X, RefreshCw, Eye, Timer, CheckCircle2, AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterTrips() {
  const [_, setLocation] = useLocation();
  const [rides, setRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");
  const [cargoFilter, setCargoFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.transporterId]);

  const loadData = async () => {
    if (!user?.transporterId) return;
    setLoading(true);
    try {
      const [transporterRides, allUsers] = await Promise.all([
        api.rides.list({ transporterId: user.transporterId }),
        api.users.list({ transporterId: user.transporterId })
      ]);
      
      setRides(Array.isArray(transporterRides) ? transporterRides : []);
      
      const transporterDrivers = Array.isArray(allUsers) 
        ? allUsers.filter((u: any) => u.role === "driver")
        : [];
      setDrivers(transporterDrivers);
    } catch (error) {
      console.error("Failed to load trips:", error);
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setDriverFilter("all");
    setCargoFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || driverFilter !== "all" || cargoFilter !== "all" || dateFrom || dateTo;

  const uniqueCargoTypes = Array.from(new Set(rides.map(r => r.cargoType).filter(Boolean)));

  const filterRides = (rideList: any[]) => {
    return rideList.filter(ride => {
      const matchesSearch = 
        ride.pickupLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ride.dropLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ride.cargoType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ride.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDriver = driverFilter === "all" || ride.assignedDriverId === driverFilter;
      const matchesCargo = cargoFilter === "all" || ride.cargoType === cargoFilter;
      
      let matchesDateRange = true;
      if (dateFrom && ride.date) {
        matchesDateRange = matchesDateRange && ride.date >= dateFrom;
      }
      if (dateTo && ride.date) {
        matchesDateRange = matchesDateRange && ride.date <= dateTo;
      }
      
      return matchesSearch && matchesDriver && matchesCargo && matchesDateRange;
    });
  };

  const activeTrips = filterRides(rides.filter(r => r.status === "active"));
  const upcomingTrips = filterRides(rides.filter(r => r.status === "scheduled"));
  const completedTrips = filterRides(rides.filter(r => r.status === "completed"));
  const pendingTrips = filterRides(rides.filter(r => r.status === "pending" || r.status === "bid_placed"));

  const allFilteredTrips = [...activeTrips, ...upcomingTrips, ...completedTrips, ...pendingTrips];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "bid_placed": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || "Unassigned";
  };

  const viewTripDetails = (trip: any) => {
    setSelectedTrip(trip);
    setShowDetailsDialog(true);
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
          {trip.assignedDriverId && (
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{getDriverName(trip.assignedDriverId)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mt-4 pt-3 border-t">
          <div className="flex items-center text-green-600 font-bold text-lg">
            <IndianRupee className="h-4 w-4" />
            {parseFloat(trip.price || "0").toLocaleString()}
          </div>
          <Button size="sm" variant="outline" onClick={() => viewTripDetails(trip)} data-testid={`button-view-${trip.id}`}>
            <Eye className="h-4 w-4 mr-1" />
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setLocation("/transporter")} data-testid="button-back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <Building2 className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900">My Trips</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} data-testid="button-toggle-filters">
                <Filter className="h-4 w-4 mr-1" />
                Filters
                {hasActiveFilters && <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-1.5">!</span>}
              </Button>
              <Button variant="outline" size="icon" onClick={loadData} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {showFilters && (
        <div className="bg-white border-b px-4 py-4">
          <div className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search trips..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              <Select value={driverFilter} onValueChange={setDriverFilter}>
                <SelectTrigger data-testid="select-driver">
                  <SelectValue placeholder="Driver" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={cargoFilter} onValueChange={setCargoFilter}>
                <SelectTrigger data-testid="select-cargo">
                  <SelectValue placeholder="Cargo Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cargo</SelectItem>
                  {uniqueCargoTypes.map(cargo => (
                    <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="From"
                  className="text-sm"
                  data-testid="input-date-from"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="To"
                  className="text-sm"
                  data-testid="input-date-to"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-green-50">
              <CardContent className="p-4 text-center">
                <Timer className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{activeTrips.length}</p>
                <p className="text-xs text-green-600">Active</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="p-4 text-center">
                <Calendar className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{upcomingTrips.length}</p>
                <p className="text-xs text-blue-600">Scheduled</p>
              </CardContent>
            </Card>
            <Card className="bg-yellow-50">
              <CardContent className="p-4 text-center">
                <AlertCircle className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-700">{pendingTrips.length}</p>
                <p className="text-xs text-yellow-600">Pending</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-50">
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-700">{completedTrips.length}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeTrips.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Scheduled ({upcomingTrips.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingTrips.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedTrips.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Loading...</p>
              </div>
            ) : activeTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No active trips</p>
                {hasActiveFilters && <Button variant="link" onClick={clearFilters}>Clear filters</Button>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              </div>
            ) : upcomingTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No scheduled trips</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              </div>
            ) : pendingTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
              </div>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No pending trips</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              </div>
            ) : completedTrips.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No completed trips yet</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trip Details</DialogTitle>
            <DialogDescription>
              Trip #{selectedTrip?.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedTrip && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-start">
                <Badge className={getStatusColor(selectedTrip.status)}>
                  {selectedTrip.status}
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Trip Value</p>
                  <p className="text-xl font-bold text-green-600 flex items-center justify-end">
                    <IndianRupee className="h-4 w-4" />
                    {parseFloat(selectedTrip.price || "0").toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <p className="font-medium">{selectedTrip.pickupLocation}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Drop Location</p>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                    <p className="font-medium">{selectedTrip.dropLocation}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{selectedTrip.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium">{selectedTrip.pickupTime}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cargo Type</p>
                  <p className="font-medium">{selectedTrip.cargoType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Weight</p>
                  <p className="font-medium">{selectedTrip.weight}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{selectedTrip.customerName || "N/A"}</p>
                  <p className="text-sm text-gray-500">{selectedTrip.customerPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Assigned Driver</p>
                  <p className="font-medium">{getDriverName(selectedTrip.assignedDriverId)}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500">Distance</p>
                <p className="font-medium">{selectedTrip.distance}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
