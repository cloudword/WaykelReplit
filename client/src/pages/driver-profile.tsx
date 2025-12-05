import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Truck, LogOut, Star, ChevronRight, ShieldCheck, Phone, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function DriverProfile() {
  const [_, setLocation] = useLocation();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const loadVehicles = async () => {
      if (!user?.id) return;
      try {
        const data = await api.vehicles.list({ userId: user.id });
        setVehicles(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load vehicles:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVehicles();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      localStorage.removeItem("currentUser");
      toast.success("Logged out successfully");
      setLocation("/auth");
    } catch (error) {
      localStorage.removeItem("currentUser");
      setLocation("/auth");
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'DR';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-6 pb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-blue-50">
            <AvatarImage src="" />
            <AvatarFallback className="text-xl bg-blue-100 text-blue-700">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-driver-name">{user.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Phone className="h-3 w-3" />
              <span data-testid="text-driver-phone">{user.phone}</span>
            </div>
            {user.email && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                <Mail className="h-3 w-3" />
                <span data-testid="text-driver-email">{user.email}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="font-medium" data-testid="text-driver-rating">{user.rating || "0.00"}</span>
              <span className="text-gray-400 text-sm">• {user.totalTrips || 0} trips</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 -mt-4 space-y-4">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-4">
            <p className="text-sm text-green-100">Today's Earnings</p>
            <p className="text-3xl font-bold" data-testid="text-today-earnings">₹{user.earningsToday || "0.00"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Registered Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-gray-500 text-center py-4">Loading vehicles...</p>
            ) : vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <div key={vehicle.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center" data-testid={`vehicle-row-${vehicle.id}`}>
                  <div>
                    <p className="font-semibold text-sm">{vehicle.plateNumber}</p>
                    <p className="text-xs text-muted-foreground">{vehicle.model || vehicle.type} • {vehicle.capacity}</p>
                  </div>
                  <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                    {vehicle.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">No vehicles registered yet</p>
            )}
            <Button 
              variant="outline" 
              className="w-full text-primary border-dashed border-primary/30"
              onClick={() => setLocation("/driver/add-vehicle")}
              data-testid="button-add-vehicle"
            >
              + Add New Vehicle
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {['Driving License', 'Aadhar Card', 'Vehicle Insurance', 'Fitness Certificate'].map((doc, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{doc}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Button 
          variant="destructive" 
          className="w-full mt-4" 
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </main>

      <MobileNav />
    </div>
  );
}
