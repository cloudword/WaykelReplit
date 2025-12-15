import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Phone, Mail, Search } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";

export default function TransporterDrivers() {
  const [_, setLocation] = useLocation();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDriver, setNewDriver] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const loadDrivers = async () => {
    if (!user?.transporterId) return;
    setLoading(true);
    try {
      const data = await api.users.list({ transporterId: user.transporterId, role: "driver" });
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [user?.transporterId]);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.auth.register({
        name: newDriver.name,
        phone: newDriver.phone,
        email: newDriver.email || undefined,
        password: newDriver.password,
        role: "driver",
        transporterId: user.transporterId,
      });
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Driver added successfully!");
        setShowAddDialog(false);
        setNewDriver({ name: "", phone: "", email: "", password: "" });
        loadDrivers();
      }
    } catch (error) {
      toast.error("Failed to add driver");
    }
  };

  const filteredDrivers = drivers.filter(driver => 
    driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.phone?.includes(searchQuery)
  );

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <TransporterSidebar />
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Manage Drivers</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search drivers..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-drivers"
            />
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-driver">
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDriver} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                    required
                    data-testid="input-driver-name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                    required
                    data-testid="input-driver-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                    data-testid="input-driver-email"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password"
                    value={newDriver.password}
                    onChange={(e) => setNewDriver({...newDriver, password: e.target.value})}
                    required
                    data-testid="input-driver-password"
                  />
                  <p className="text-xs text-gray-500 mt-1">Min 8 chars, 1 uppercase, 1 number</p>
                </div>
                <Button type="submit" className="w-full" data-testid="button-submit-driver">
                  Add Driver
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading drivers...</p>
          </div>
        ) : filteredDrivers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => (
              <Card key={driver.id} data-testid={`driver-card-${driver.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold truncate">{driver.name}</h3>
                        <Badge variant={driver.isOnline ? "default" : "secondary"}>
                          {driver.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{driver.phone}</span>
                        </div>
                        {driver.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{driver.email}</span>
                          </div>
                        )}
                      </div>
                      {driver.rating && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Rating: {driver.rating}/5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers yet</h3>
              <p className="text-gray-500 mb-4">Add drivers to your fleet to start assigning them to rides.</p>
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-driver">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Driver
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
