import { useState, useEffect, useCallback } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, MoreHorizontal, Truck, AlertCircle, Building2, User, FileText, MapPin, Package, Loader2, Eye, Edit2, CheckCircle, XCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useAdminSessionGate } from "@/hooks/useAdminSession";

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const { isReady, isChecking } = useAdminSessionGate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehiclesRes, transportersRes, usersRes, ridesRes] = await Promise.all([
        api.vehicles.list(),
        api.transporters.list(),
        api.users.list(),
        api.rides.list(),
      ]);
      setVehicles(Array.isArray(vehiclesRes) ? vehiclesRes : []);
      setTransporters(Array.isArray(transportersRes) ? transportersRes : []);
      setDrivers(Array.isArray(usersRes) ? usersRes.filter((u: any) => u.role === "driver") : []);
      setRides(Array.isArray(ridesRes) ? ridesRes : []);
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    loadData();
  }, [isReady, loadData]);

  const getTransporterName = (transporterId: string | null) => {
    if (!transporterId) return "Individual";
    const transporter = transporters.find(t => t.id === transporterId);
    return transporter?.companyName || "Unknown";
  };

  const getDriverName = (userId: string | null) => {
    if (!userId) return "Unassigned";
    const driver = drivers.find(d => d.id === userId);
    return driver?.name || "Unknown";
  };

  const getVehicleRides = (vehicleId: string) => {
    return rides.filter(r => r.assignedVehicleId === vehicleId);
  };

  const getVehicleEarnings = (vehicleId: string) => {
    const vehicleRides = getVehicleRides(vehicleId).filter(r => r.status === "completed");
    return vehicleRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "inactive": return "secondary";
      case "maintenance": return "outline";
      default: return "secondary";
    }
  };

  const filteredVehicles = vehicles.filter(vehicle =>
    vehicle.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.type?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openVehicleDetails = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setShowDetailDialog(true);
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />

      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Vehicle Fleet</h1>
            <p className="text-gray-500">Track and manage registered vehicles ({vehicles.length} total)</p>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2 w-full max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by plate number, model, or type..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-vehicles"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {(isChecking || loading) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredVehicles.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle ID</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Body Type</TableHead>
                    <TableHead>Owner/Fleet</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Trips</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow key={vehicle.id} data-testid={`vehicle-row-${vehicle.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {vehicle.entityId || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                            <Truck className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium">{vehicle.plateNumber}</p>
                            <p className="text-xs text-gray-500">{vehicle.model}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{vehicle.type}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">{vehicle.bodyType || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{getTransporterName(vehicle.transporterId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{getDriverName(vehicle.userId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{vehicle.capacityKg ? `${vehicle.capacityKg} kg` : vehicle.capacity}</span>
                          {vehicle.capacityTons && <span className="text-xs text-gray-400">({vehicle.capacityTons} T)</span>}
                        </div>
                      </TableCell>
                      <TableCell>{getVehicleRides(vehicle.id).length}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(vehicle.status)}>
                          {vehicle.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`button-actions-${vehicle.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openVehicleDetails(vehicle)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <FileText className="h-4 w-4 mr-2" />
                              View Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit Vehicle
                            </DropdownMenuItem>
                            {vehicle.status === "active" && (
                              <DropdownMenuItem className="text-orange-600">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Mark Maintenance
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
                <p className="text-gray-500">
                  {searchQuery ? "Try adjusting your search criteria" : "No vehicles registered yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <Truck className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="text-xl">{selectedVehicle?.plateNumber}</p>
                <p className="text-sm text-gray-500 font-normal">{selectedVehicle?.model} • {selectedVehicle?.type}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedVehicle && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="trips">Trips</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Plate Number</p>
                    <p className="font-medium">{selectedVehicle.plateNumber}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={getStatusVariant(selectedVehicle.status)}>
                      {selectedVehicle.status}
                    </Badge>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Model</p>
                    <p className="font-medium">{selectedVehicle.model}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{selectedVehicle.type}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Capacity</p>
                    <p className="font-medium">{selectedVehicle.capacity}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Total Trips</p>
                    <p className="font-medium">{getVehicleRides(selectedVehicle.id).length}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Building2 className="h-3 w-3" /> Fleet/Owner</p>
                    <p className="font-medium">{getTransporterName(selectedVehicle.transporterId)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 flex items-center gap-1"><User className="h-3 w-3" /> Assigned Driver</p>
                    <p className="font-medium">{getDriverName(selectedVehicle.userId)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg col-span-2">
                    <p className="text-sm text-gray-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-600">₹{getVehicleEarnings(selectedVehicle.id).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="trips" className="mt-4">
                {getVehicleRides(selectedVehicle.id).length > 0 ? (
                  <div className="space-y-3">
                    {getVehicleRides(selectedVehicle.id).map(ride => (
                      <div key={ride.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm text-gray-500">#{ride.id.slice(0, 8)}</p>
                          <Badge variant={ride.status === "completed" ? "default" : "secondary"}>
                            {ride.status}
                          </Badge>
                        </div>
                        <p className="font-medium">{ride.pickupLocation?.split(',')[0]} → {ride.dropLocation?.split(',')[0]}</p>
                        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                          <span>{ride.date} • {ride.cargoType}</span>
                          <span className="text-green-600 font-medium">₹{parseFloat(ride.price || "0").toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No trips assigned to this vehicle</p>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <div className="space-y-3">
                  {['Registration Certificate (RC)', 'Insurance', 'Fitness Certificate', 'Pollution Certificate', 'Permit'].map((doc, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span>{doc}</span>
                      </div>
                      <Badge variant="secondary">Not Uploaded</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-gray-400 mt-4">
                  Document upload feature coming soon
                </p>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
