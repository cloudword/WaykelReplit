import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, MoreHorizontal, FileText, User, Phone, Mail, Building2, Truck, Star, IndianRupee, X, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, transportersData, vehiclesData, ridesData] = await Promise.all([
        api.users.list(),
        api.transporters.list(),
        api.vehicles.list(),
        api.rides.list(),
      ]);
      const driversList = Array.isArray(usersData) ? usersData.filter((u: any) => u.role === "driver") : [];
      setDrivers(driversList);
      setTransporters(Array.isArray(transportersData) ? transportersData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setRides(Array.isArray(ridesData) ? ridesData : []);
    } catch (error) {
      console.error("Failed to load drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const getTransporterName = (transporterId: string | null) => {
    if (!transporterId) return "Independent";
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter?.companyName || "Unknown";
  };

  const getDriverVehicles = (driverId: string) => {
    return vehicles.filter(v => v.userId === driverId);
  };

  const getDriverRides = (driverId: string) => {
    return rides.filter(r => r.assignedDriverId === driverId);
  };

  const getDriverEarnings = (driverId: string) => {
    const driverRides = getDriverRides(driverId).filter(r => r.status === "completed");
    return driverRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
  };

  const filteredDrivers = drivers.filter(driver =>
    driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.phone?.includes(searchQuery) ||
    driver.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openDriverDetails = (driver: any) => {
    setSelectedDriver(driver);
    setShowDetailDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Driver Management</h1>
            <p className="text-gray-500">Manage drivers, documents and assignments ({drivers.length} total)</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2 w-full max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input 
                  placeholder="Search drivers by name, phone, or email..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredDrivers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Transporter</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDrivers.map((driver) => (
                    <TableRow key={driver.id} data-testid={`row-driver-${driver.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{driver.name}</p>
                            <p className="text-xs text-gray-500">#{driver.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {driver.phone}
                          </div>
                          {driver.email && (
                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                              <Mail className="h-3 w-3" />
                              {driver.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{getTransporterName(driver.transporterId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span>{getDriverVehicles(driver.id).length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                          <span>{driver.rating || "0.00"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-green-600 font-medium">
                          <IndianRupee className="h-3 w-3" />
                          {getDriverEarnings(driver.id).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={driver.isOnline ? "default" : "secondary"}>
                          {driver.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-actions-${driver.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDriverDetails(driver)}>
                              <User className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Truck className="h-4 w-4 mr-2" />
                              View Vehicles
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? "No drivers match your search" : "No drivers found"}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xl">{selectedDriver?.name}</p>
                <p className="text-sm text-gray-500 font-normal">Driver Details</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedDriver && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                <TabsTrigger value="rides">Rides</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{selectedDriver.phone}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{selectedDriver.email || "N/A"}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Transporter</p>
                    <p className="font-medium">{getTransporterName(selectedDriver.transporterId)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={selectedDriver.isOnline ? "default" : "secondary"}>
                      {selectedDriver.isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Rating</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="font-medium">{selectedDriver.rating || "0.00"}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Trips</p>
                    <p className="font-medium">{selectedDriver.totalTrips || 0}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                    <p className="text-sm text-gray-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-600">₹{getDriverEarnings(selectedDriver.id).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="vehicles" className="mt-4">
                {getDriverVehicles(selectedDriver.id).length > 0 ? (
                  <div className="space-y-3">
                    {getDriverVehicles(selectedDriver.id).map(vehicle => (
                      <div key={vehicle.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Truck className="h-6 w-6 text-gray-400" />
                          <div>
                            <p className="font-medium">{vehicle.plateNumber}</p>
                            <p className="text-sm text-gray-500">{vehicle.model} • {vehicle.type}</p>
                          </div>
                        </div>
                        <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                          {vehicle.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No vehicles registered</p>
                )}
              </TabsContent>

              <TabsContent value="rides" className="mt-4">
                {getDriverRides(selectedDriver.id).length > 0 ? (
                  <div className="space-y-3">
                    {getDriverRides(selectedDriver.id).slice(0, 5).map(ride => (
                      <div key={ride.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm text-gray-500">#{ride.id.slice(0, 8)}</p>
                          <Badge variant={ride.status === "completed" ? "default" : "secondary"}>
                            {ride.status}
                          </Badge>
                        </div>
                        <p className="font-medium">{ride.pickupLocation?.split(',')[0]} → {ride.dropLocation?.split(',')[0]}</p>
                        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                          <span>{ride.date}</span>
                          <span className="text-green-600 font-medium">₹{parseFloat(ride.price || "0").toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No rides assigned</p>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <div className="space-y-3">
                  {['Driving License', 'Aadhar Card', 'PAN Card'].map((doc, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span>{doc}</span>
                      </div>
                      <Badge variant="secondary">Not Uploaded</Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
