import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Building2, Plus, Truck, Search } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterVehicles() {
  const [_, setLocation] = useLocation();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newVehicle, setNewVehicle] = useState({
    type: "",
    plateNumber: "",
    capacity: "",
  });
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const loadVehicles = async () => {
    if (!user?.transporterId) return;
    setLoading(true);
    try {
      const data = await api.vehicles.list({ transporterId: user.transporterId });
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [user?.transporterId]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.vehicles.create({
        type: newVehicle.type,
        plateNumber: newVehicle.plateNumber,
        capacity: newVehicle.capacity,
        transporterId: user.transporterId,
        status: "active",
      });
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Vehicle added successfully!");
        setShowAddDialog(false);
        setNewVehicle({ type: "", plateNumber: "", capacity: "" });
        loadVehicles();
      }
    } catch (error) {
      toast.error("Failed to add vehicle");
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => 
    vehicle.plateNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.type?.toLowerCase().includes(searchQuery.toLowerCase())
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
              <h1 className="text-xl font-bold text-gray-900">Manage Vehicles</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search vehicles..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-vehicles"
            />
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-vehicle">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddVehicle} className="space-y-4">
                <div>
                  <Label htmlFor="type">Vehicle Type</Label>
                  <Select 
                    value={newVehicle.type} 
                    onValueChange={(value) => setNewVehicle({...newVehicle, type: value})}
                  >
                    <SelectTrigger data-testid="select-vehicle-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mini Truck">Mini Truck</SelectItem>
                      <SelectItem value="Pickup">Pickup</SelectItem>
                      <SelectItem value="LCV">LCV (Light Commercial)</SelectItem>
                      <SelectItem value="Truck">Truck</SelectItem>
                      <SelectItem value="Trailer">Trailer</SelectItem>
                      <SelectItem value="Container">Container</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="plateNumber">Registration Number</Label>
                  <Input 
                    id="plateNumber" 
                    placeholder="e.g., MH12AB1234"
                    value={newVehicle.plateNumber}
                    onChange={(e) => setNewVehicle({...newVehicle, plateNumber: e.target.value.toUpperCase()})}
                    required
                    data-testid="input-plate-number"
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity (in tons)</Label>
                  <Input 
                    id="capacity" 
                    type="number"
                    placeholder="e.g., 5"
                    value={newVehicle.capacity}
                    onChange={(e) => setNewVehicle({...newVehicle, capacity: e.target.value})}
                    required
                    data-testid="input-capacity"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="button-submit-vehicle">
                  Add Vehicle
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map((vehicle) => (
              <Card key={vehicle.id} data-testid={`vehicle-card-${vehicle.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Truck className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{vehicle.plateNumber}</h3>
                        <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                          {vehicle.status}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Type: {vehicle.type}</p>
                        {vehicle.capacity && <p>Capacity: {vehicle.capacity} tons</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Truck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles yet</h3>
              <p className="text-gray-500 mb-4">Add vehicles to your fleet to start bidding on loads.</p>
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-vehicle">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Vehicle
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
