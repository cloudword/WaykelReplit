import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, Building2, Truck, Users, FileText, TrendingUp, 
  Plus, LogOut, Settings, Calendar, IndianRupee
} from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterDashboard() {
  const [_, setLocation] = useLocation();
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalVehicles: 0,
    activeBids: 0,
    completedRides: 0,
    pendingBids: 0,
    totalEarnings: 0,
  });
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.transporterId) return;
      
      try {
        const [bidsData, vehiclesData, usersData] = await Promise.all([
          api.bids.list({ transporterId: user.transporterId }),
          api.vehicles.list({ transporterId: user.transporterId }),
          api.users.list({ transporterId: user.transporterId, role: "driver" }),
        ]);

        const bids = Array.isArray(bidsData) ? bidsData : [];
        const vehiclesList = Array.isArray(vehiclesData) ? vehiclesData : [];
        const driversList = Array.isArray(usersData) ? usersData : [];

        setRecentBids(bids.slice(0, 5));
        setVehicles(vehiclesList);
        setDrivers(driversList);

        const pendingBids = bids.filter((b: any) => b.status === "pending").length;
        const acceptedBids = bids.filter((b: any) => b.status === "accepted");
        const totalEarnings = acceptedBids.reduce((sum: number, b: any) => sum + parseFloat(b.amount || 0), 0);

        setStats({
          totalDrivers: driversList.length,
          totalVehicles: vehiclesList.length,
          activeBids: bids.length,
          completedRides: acceptedBids.length,
          pendingBids,
          totalEarnings,
        });
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.transporterId]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      localStorage.removeItem("currentUser");
      setLocation("/auth");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Transporter Panel</h1>
                <p className="text-xs text-gray-500">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setLocation("/transporter/settings")} data-testid="button-settings">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout} data-testid="button-logout">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-4 overflow-x-auto py-2">
            <Button variant="ghost" className="text-blue-600 border-b-2 border-blue-600 rounded-none" data-testid="nav-dashboard">
              Dashboard
            </Button>
            <Button variant="ghost" className="text-gray-600" onClick={() => setLocation("/transporter/drivers")} data-testid="nav-drivers">
              Drivers
            </Button>
            <Button variant="ghost" className="text-gray-600" onClick={() => setLocation("/transporter/vehicles")} data-testid="nav-vehicles">
              Vehicles
            </Button>
            <Button variant="ghost" className="text-gray-600" onClick={() => setLocation("/transporter/bids")} data-testid="nav-bids">
              Bids
            </Button>
            <Button variant="ghost" className="text-gray-600" onClick={() => setLocation("/transporter/marketplace")} data-testid="nav-marketplace">
              Marketplace
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card data-testid="stat-drivers">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Drivers</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDrivers}</div>
              <p className="text-xs text-gray-500">Active drivers in your fleet</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-vehicles">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVehicles}</div>
              <p className="text-xs text-gray-500">Registered vehicles</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-bids">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Bids</CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingBids}</div>
              <p className="text-xs text-gray-500">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-earnings">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
              <IndianRupee className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-gray-500">From completed rides</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" data-testid="recent-bids-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Bids</CardTitle>
                <CardDescription>Your latest bid submissions</CardDescription>
              </div>
              <Button size="sm" onClick={() => setLocation("/transporter/marketplace")} data-testid="button-new-bid">
                <Plus className="h-4 w-4 mr-1" />
                New Bid
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : recentBids.length > 0 ? (
                <div className="space-y-4">
                  {recentBids.map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`bid-row-${bid.id}`}>
                      <div>
                        <p className="font-medium text-sm">Bid #{bid.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-500">₹{parseFloat(bid.amount).toLocaleString()}</p>
                      </div>
                      <Badge variant={
                        bid.status === "accepted" ? "default" :
                        bid.status === "pending" ? "secondary" : "destructive"
                      }>
                        {bid.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No bids yet. Browse the marketplace to place bids.</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="quick-actions-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your fleet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/drivers/add")} data-testid="button-add-driver">
                <Users className="h-4 w-4 mr-2" />
                Add New Driver
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/vehicles/add")} data-testid="button-add-vehicle">
                <Truck className="h-4 w-4 mr-2" />
                Add New Vehicle
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/marketplace")} data-testid="button-browse-loads">
                <FileText className="h-4 w-4 mr-2" />
                Browse Available Loads
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/earnings")} data-testid="button-view-earnings">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Earnings Report
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card data-testid="drivers-overview-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Drivers</CardTitle>
                <CardDescription>Your fleet drivers</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setLocation("/transporter/drivers")} data-testid="button-view-all-drivers">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {drivers.length > 0 ? (
                <div className="space-y-3">
                  {drivers.slice(0, 3).map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`driver-row-${driver.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{driver.name}</p>
                          <p className="text-xs text-gray-500">{driver.phone}</p>
                        </div>
                      </div>
                      <Badge variant={driver.isOnline ? "default" : "secondary"}>
                        {driver.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No drivers added yet</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="vehicles-overview-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vehicles</CardTitle>
                <CardDescription>Your fleet vehicles</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setLocation("/transporter/vehicles")} data-testid="button-view-all-vehicles">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {vehicles.length > 0 ? (
                <div className="space-y-3">
                  {vehicles.slice(0, 3).map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`vehicle-row-${vehicle.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Truck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{vehicle.plateNumber}</p>
                          <p className="text-xs text-gray-500">{vehicle.type}</p>
                        </div>
                      </div>
                      <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                        {vehicle.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No vehicles added yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
