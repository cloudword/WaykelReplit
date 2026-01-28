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
import { motion, AnimatePresence } from "framer-motion";

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
      case "active": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400";
      case "completed": return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
      case "scheduled": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "bidding": return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400";
      case "accepted": return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-800 border-gray-200 dark:text-gray-400";
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
    scheduled: rides.filter(r => r.status === "scheduled" || r.status === "assigned").length,
    completed: rides.filter(r => r.status === "completed").length,
    pending: rides.filter(r => r.status === "pending" || r.status === "bidding").length,
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || transporterFilter !== "all" ||
    driverFilter !== "all" || dateFrom || dateTo || cargoFilter !== "all";

  const viewRideDetails = (ride: Ride) => {
    setSelectedRide(ride);
    setShowDetailsDialog(true);
  };

  return (
    <div className="min-h-screen bg-background pl-72">
      <AdminSidebar />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="page-title">Trip Scheduler</h1>
            <p className="text-muted-foreground mt-1">View and manage all platform trips</p>
          </div>
          <Button onClick={loadData} variant="outline" data-testid="button-refresh" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-4">
          <Card
            className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === "all" ? "ring-2 ring-primary border-primary" : "hover:border-primary/50"}`}
            onClick={() => setStatusFilter("all")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                  <Package className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">{tripStats.total}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-medium">All Trips</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === "active" ? "ring-2 ring-green-500 border-green-500" : "hover:border-green-500/50"}`}
            onClick={() => setStatusFilter("active")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                  <Timer className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">{tripStats.active}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Active</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === "scheduled" ? "ring-2 ring-blue-500 border-blue-500" : "hover:border-blue-500/50"}`}
            onClick={() => setStatusFilter("scheduled")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                  <Calendar className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">{tripStats.scheduled}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Scheduled</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === "pending" ? "ring-2 ring-yellow-500 border-yellow-500" : "hover:border-yellow-500/50"}`}
            onClick={() => setStatusFilter("pending")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">{tripStats.pending}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Pending</p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:scale-105 ${statusFilter === "completed" ? "ring-2 ring-gray-500 border-gray-500" : "hover:border-gray-500/50"}`}
            onClick={() => setStatusFilter("completed")}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <span className="text-2xl font-bold">{tripStats.completed}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2 font-medium">Completed</p>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader className="pb-4 border-b border-border/50 bg-muted/5">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4 text-primary" />
                Advanced Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters" className="hover:bg-destructive/10 hover:text-destructive">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
          <CardHeader className="border-b border-border/50">
            <CardTitle>Trips ({filteredRides.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-20 flex flex-col items-center">
                <RefreshCw className="h-10 w-10 animate-spin mb-4 text-primary" />
                <p className="text-muted-foreground">Loading trips...</p>
              </div>
            ) : filteredRides.length === 0 ? (
              <div className="text-center py-20">
                <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-lg">No trips found</p>
                {hasActiveFilters && (
                  <Button variant="link" onClick={clearFilters} className="mt-2 text-primary">Clear filters</Button>
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
                    <TableRow key={ride.id} data-testid={`trip-row-${ride.id}`} className="group hover:bg-muted/30">
                      <TableCell className="font-mono text-xs text-muted-foreground group-hover:text-foreground">
                        #{ride.id.substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                            <span className="truncate max-w-[120px] font-medium">{ride.pickupLocation}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                            <span className="truncate max-w-[120px] font-medium">{ride.dropLocation}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{ride.date}</p>
                          <p className="text-muted-foreground text-xs">{ride.pickupTime}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{ride.cargoType}</p>
                          <p className="text-muted-foreground text-xs">{ride.weight}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{ride.customerName || "N/A"}</p>
                          <p className="text-muted-foreground text-xs">{ride.customerPhone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[100px]">{getTransporterName(ride.transporterId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[100px]">{getDriverName(ride.assignedDriverId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getStatusColor(ride.status)} flex items-center gap-1.5 w-fit px-2.5 py-0.5 border-none shadow-sm`}>
                          {getStatusIcon(ride.status)}
                          <span className="capitalize">{ride.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-green-600 font-bold">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {parseFloat(ride.price || "0").toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewRideDetails(ride)}
                          data-testid={`button-view-${ride.id}`}
                          className="hover:bg-primary/10 hover:text-primary"
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
              Trip ID: <span className="font-mono text-primary">#{selectedRide?.id.substring(0, 8)}</span>
            </DialogDescription>
          </DialogHeader>
          {selectedRide && (
            <div className="space-y-6 py-4">
              <div className="flex justify-between items-start bg-muted/30 p-4 rounded-xl">
                <Badge variant="secondary" className={`${getStatusColor(selectedRide.status)} flex items-center gap-2 px-3 py-1 text-base`}>
                  {getStatusIcon(selectedRide.status)}
                  <span className="capitalize font-semibold">{selectedRide.status}</span>
                </Badge>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Trip Value</p>
                  <p className="text-3xl font-bold text-green-600 flex items-center justify-end font-heading">
                    <IndianRupee className="h-6 w-6" />
                    {parseFloat(selectedRide.price || "0").toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Route Information</p>
                    <div className="relative pl-4 space-y-6 border-l-2 border-muted">
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 h-4 w-4 rounded-full border-2 border-white bg-green-500 shadow-sm" />
                        <p className="font-semibold">{selectedRide.pickupLocation}</p>
                        <p className="text-xs text-muted-foreground">Pickup</p>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 h-4 w-4 rounded-full border-2 border-white bg-red-500 shadow-sm" />
                        <p className="font-semibold">{selectedRide.dropLocation}</p>
                        <p className="text-xs text-muted-foreground">Dropoff</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Trip Details</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium">{selectedRide.date}</p>
                    </div>
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-medium">{selectedRide.pickupTime}</p>
                    </div>
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Cargo Type</p>
                      <p className="font-medium">{selectedRide.cargoType}</p>
                    </div>
                    <div className="bg-muted/20 p-3 rounded-lg">
                      <p className="text-xs text-muted-foreground">Weight</p>
                      <p className="font-medium">{selectedRide.weight}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600">
                      <User size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="font-medium text-sm">{selectedRide.customerName || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transporter</p>
                      <p className="font-medium text-sm">{getTransporterName(selectedRide.transporterId)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <Truck size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Driver</p>
                      <p className="font-medium text-sm">{getDriverName(selectedRide.assignedDriverId)}</p>
                    </div>
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
