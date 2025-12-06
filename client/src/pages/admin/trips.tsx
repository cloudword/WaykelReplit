import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, RefreshCw, MapPin, Calendar, Clock, Package, Truck, 
  IndianRupee, User, Building2, Filter, X, Eye, CheckCircle2,
  AlertCircle, Timer, Ban
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Ride {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  dropTime: string;
  date: string;
  status: string;
  price: string;
  distance: string;
  cargoType: string;
  weight: string;
  customerName: string;
  customerPhone: string;
  transporterId: string;
  assignedDriverId: string;
  createdAt: string;
}

interface Transporter {
  id: string;
  companyName: string;
}

interface Driver {
  id: string;
  name: string;
}

export default function AdminTrips() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [transporterFilter, setTransporterFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cargoFilter, setCargoFilter] = useState<string>("all");
  
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ridesData, transportersData, driversData] = await Promise.all([
        api.rides.list(),
        api.transporters.list(),
        api.drivers.list()
      ]);
      setRides(Array.isArray(ridesData) ? ridesData : []);
      setTransporters(Array.isArray(transportersData) ? transportersData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTransporterFilter("all");
    setDriverFilter("all");
    setDateFrom("");
    setDateTo("");
    setCargoFilter("all");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Timer className="h-4 w-4" />;
      case "completed": return <CheckCircle2 className="h-4 w-4" />;
      case "scheduled": return <Calendar className="h-4 w-4" />;
      case "pending": return <AlertCircle className="h-4 w-4" />;
      case "cancelled": return <Ban className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 border-green-200";
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200";
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "bid_placed": return "bg-purple-100 text-purple-800 border-purple-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTransporterName = (transporterId: string) => {
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter?.companyName || "Unassigned";
  };

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver?.name || "Unassigned";
  };

  const uniqueCargoTypes = Array.from(new Set(rides.map(r => r.cargoType).filter(Boolean)));

  const filteredRides = rides.filter(ride => {
    const matchesSearch = 
      ride.pickupLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropLocation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.cargoType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ride.status === statusFilter;
    const matchesTransporter = transporterFilter === "all" || ride.transporterId === transporterFilter;
    const matchesDriver = driverFilter === "all" || ride.assignedDriverId === driverFilter;
    const matchesCargo = cargoFilter === "all" || ride.cargoType === cargoFilter;
    
    let matchesDateRange = true;
    if (dateFrom && ride.date) {
      matchesDateRange = matchesDateRange && ride.date >= dateFrom;
    }
    if (dateTo && ride.date) {
      matchesDateRange = matchesDateRange && ride.date <= dateTo;
    }
    
    return matchesSearch && matchesStatus && matchesTransporter && matchesDriver && matchesCargo && matchesDateRange;
  });

  const tripStats = {
    total: rides.length,
    active: rides.filter(r => r.status === "active").length,
    scheduled: rides.filter(r => r.status === "scheduled").length,
    completed: rides.filter(r => r.status === "completed").length,
    pending: rides.filter(r => r.status === "pending" || r.status === "bid_placed").length,
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || transporterFilter !== "all" || 
    driverFilter !== "all" || dateFrom || dateTo || cargoFilter !== "all";

  const viewRideDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setShowDetailsDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">Trip Scheduler</h1>
            <p className="text-gray-500">View and manage all platform trips</p>
          </div>
          <Button onClick={loadData} variant="outline" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className={`cursor-pointer transition-all ${statusFilter === "all" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setStatusFilter("all")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Package className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold">{tripStats.total}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">All Trips</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "active" ? "ring-2 ring-green-500" : ""}`} onClick={() => setStatusFilter("active")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Timer className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{tripStats.active}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Active</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "scheduled" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setStatusFilter("scheduled")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Calendar className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold">{tripStats.scheduled}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Scheduled</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "pending" ? "ring-2 ring-yellow-500" : ""}`} onClick={() => setStatusFilter("pending")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <span className="text-2xl font-bold">{tripStats.pending}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Pending</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${statusFilter === "completed" ? "ring-2 ring-gray-500" : ""}`} onClick={() => setStatusFilter("completed")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <CheckCircle2 className="h-8 w-8 text-gray-600" />
                <span className="text-2xl font-bold">{tripStats.completed}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by location, cargo, customer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
              </div>
              
              <Select value={transporterFilter} onValueChange={setTransporterFilter}>
                <SelectTrigger data-testid="select-transporter">
                  <SelectValue placeholder="Transporter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Transporters</SelectItem>
                  {transporters.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
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
                  <SelectItem value="all">All Cargo Types</SelectItem>
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
              </div>
            </div>
            
            <div className="grid grid-cols-6 gap-4 mt-4">
              <div className="col-span-5" />
              <div className="flex gap-2">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trips ({filteredRides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Loading trips...</p>
              </div>
            ) : filteredRides.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No trips found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters}>Clear filters</Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trip ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Transporter</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRides.map((ride) => (
                    <TableRow key={ride.id} data-testid={`trip-row-${ride.id}`}>
                      <TableCell className="font-mono text-xs">
                        #{ride.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="truncate max-w-[120px]">{ride.pickupLocation}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="truncate max-w-[120px]">{ride.dropLocation}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{ride.date}</p>
                          <p className="text-gray-500">{ride.pickupTime}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{ride.cargoType}</p>
                          <p className="text-gray-500">{ride.weight}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{ride.customerName || "N/A"}</p>
                          <p className="text-gray-500 text-xs">{ride.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[100px]">{getTransporterName(ride.transporterId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[100px]">{getDriverName(ride.assignedDriverId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getStatusColor(ride.status)} flex items-center gap-1 w-fit`}>
                          {getStatusIcon(ride.status)}
                          {ride.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-green-600 font-semibold">
                          <IndianRupee className="h-3 w-3" />
                          {parseFloat(ride.price || "0").toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => viewRideDetails(ride)}
                          data-testid={`button-view-${ride.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Trip Details</DialogTitle>
            <DialogDescription>
              Trip #{selectedRide?.id.substring(0, 8)}
            </DialogDescription>
          </DialogHeader>
          {selectedRide && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-start">
                <Badge variant="outline" className={`${getStatusColor(selectedRide.status)} flex items-center gap-1`}>
                  {getStatusIcon(selectedRide.status)}
                  {selectedRide.status}
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Trip Value</p>
                  <p className="text-2xl font-bold text-green-600 flex items-center justify-end">
                    <IndianRupee className="h-5 w-5" />
                    {parseFloat(selectedRide.price || "0").toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500 mt-1" />
                      <p className="font-medium">{selectedRide.pickupLocation}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Drop Location</p>
                    <div className="flex items-start gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500 mt-1" />
                      <p className="font-medium">{selectedRide.dropLocation}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Date</p>
                      <p className="font-medium">{selectedRide.date}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Time</p>
                      <p className="font-medium">{selectedRide.pickupTime}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Cargo Type</p>
                      <p className="font-medium">{selectedRide.cargoType}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Weight</p>
                      <p className="font-medium">{selectedRide.weight}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Customer</p>
                    <p className="font-medium">{selectedRide.customerName || "N/A"}</p>
                    <p className="text-sm text-gray-500">{selectedRide.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Transporter</p>
                    <p className="font-medium">{getTransporterName(selectedRide.transporterId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Driver</p>
                    <p className="font-medium">{getDriverName(selectedRide.assignedDriverId)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Distance</p>
                    <p className="font-medium">{selectedRide.distance}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="font-medium">{new Date(selectedRide.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
