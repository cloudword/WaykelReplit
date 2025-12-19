import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MapPin, Package, Calendar, Clock, IndianRupee, Truck, ArrowRight,
  Search, Filter, X, RefreshCw, Eye, Timer, CheckCircle2, ChevronDown
} from "lucide-react";
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

  const [searchQuery, setSearchQuery] = useState("");
  const [cargoFilter, setCargoFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadRides();
  }, [user?.id]);

  const loadRides = async () => {
    if (!user?.id) return;
    setLoading(true);
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

  const clearFilters = () => {
    setSearchQuery("");
    setCargoFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchQuery || cargoFilter !== "all" || dateFrom || dateTo;

  const uniqueCargoTypes = Array.from(new Set(rides.map(r => r.cargoType).filter(Boolean)));

  const filterRides = (rideList: any[]) => {
    return rideList.filter(ride => {
      const matchesSearch = 
        ride.pickupLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ride.dropLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ride.cargoType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ride.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCargo = cargoFilter === "all" || ride.cargoType === cargoFilter;
      
      let matchesDateRange = true;
      if (dateFrom && ride.date) {
        matchesDateRange = matchesDateRange && ride.date >= dateFrom;
      }
      if (dateTo && ride.date) {
        matchesDateRange = matchesDateRange && ride.date <= dateTo;
      }
      
      return matchesSearch && matchesCargo && matchesDateRange;
    });
  };

  const activeRides = filterRides(rides.filter(r => ["active", "assigned", "scheduled"].includes(r.status)));
  const completedRides = filterRides(rides.filter(r => r.status === "completed"));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-amber-100 text-amber-800";
      case "assigned": return "bg-blue-100 text-blue-800";
      case "scheduled": return "bg-blue-100 text-blue-800";
      case "completed": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return "In Transit";
      case "assigned": return "Assigned";
      case "scheduled": return "Scheduled";
      case "completed": return "Completed";
      default: return status;
    }
  };

  const viewRideDetails = (ride: any) => {
    setSelectedRide(ride);
    setShowDetailsDialog(true);
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Rides</h1>
            <p className="text-sm text-gray-500">Track your assigned and completed trips</p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full" />}
            </Button>
            <Button variant="outline" size="icon" onClick={loadRides} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {showFilters && (
        <div className="bg-white border-b px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-700">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by location, cargo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2">
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
            
            <div className="flex gap-1">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
                className="text-xs"
                data-testid="input-date-from"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
                className="text-xs"
                data-testid="input-date-to"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-3 flex items-center gap-3">
              <Timer className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-700">{activeRides.length}</p>
                <p className="text-xs text-green-600">Active Rides</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-50 border-gray-100">
            <CardContent className="p-3 flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-700">{completedRides.length}</p>
                <p className="text-xs text-gray-600">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <main className="p-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeRides.length})
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              History ({completedRides.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-3">
            {loading ? (
              <div className="text-center py-10">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">Loading...</p>
              </div>
            ) : activeRides.length > 0 ? (
              activeRides.map(ride => (
                <Card 
                  key={ride.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  data-testid={`ride-card-${ride.id}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(ride.status)}>
                          {getStatusLabel(ride.status)}
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
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" /> {ride.cargoType}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setLocation(`/driver/trip/${ride.id}`)}
                        data-testid={`button-track-${ride.id}`}
                      >
                        {ride.status === "active" ? "Track Trip" : "View Trip"}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); viewRideDetails(ride); }}
                        data-testid={`button-details-${ride.id}`}
                      >
                        <Eye className="h-4 w-4" />
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
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">Clear filters</Button>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-3">
            {loading ? (
              <div className="text-center py-10">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
              </div>
            ) : completedRides.length > 0 ? (
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

                    <div className="flex justify-end pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => viewRideDetails(ride)}
                        data-testid={`button-view-history-${ride.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p>No completed rides yet</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2">Clear filters</Button>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle>Ride Details</DialogTitle>
            <DialogDescription>
              Ride #{selectedRide?.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedRide && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between items-start">
                <Badge className={getStatusColor(selectedRide.status)}>
                  {selectedRide.status}
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Earnings</p>
                  <p className="text-xl font-bold text-green-600 flex items-center justify-end">
                    <IndianRupee className="h-4 w-4" />
                    {parseFloat(selectedRide.price || "0").toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Pickup</p>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
                    <p className="text-sm font-medium">{selectedRide.pickupLocation}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Drop</p>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5" />
                    <p className="text-sm font-medium">{selectedRide.dropLocation}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t text-sm">
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="font-medium">{selectedRide.date}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="font-medium">{selectedRide.pickupTime}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cargo</p>
                  <p className="font-medium">{selectedRide.cargoType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Weight</p>
                  <p className="font-medium">{selectedRide.weight}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="font-medium">{selectedRide.distance}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="font-medium">{selectedRide.customerName || "N/A"}</p>
                </div>
              </div>

              {(selectedRide.status === "active" || selectedRide.status === "assigned") && (
                <Button 
                  className="w-full mt-4" 
                  onClick={() => {
                    setShowDetailsDialog(false);
                    setLocation(`/driver/trip/${selectedRide.id}`);
                  }}
                >
                  {selectedRide.status === "active" ? "Track Trip" : "View Trip"}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MobileNav />
    </div>
  );
}
