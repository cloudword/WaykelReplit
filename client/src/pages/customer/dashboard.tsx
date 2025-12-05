import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Package, Truck, Calendar, Clock, Bell, User } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function CustomerDashboard() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [formData, setFormData] = useState({
    pickupLocation: "",
    dropLocation: "",
    cargoType: "",
    weight: "",
    date: "",
    pickupTime: "",
    customerName: user?.name || "",
    customerPhone: user?.phone || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const rideData = {
        pickupLocation: formData.pickupLocation,
        dropLocation: formData.dropLocation,
        pickupTime: formData.pickupTime,
        date: formData.date,
        status: "pending",
        price: "0",
        distance: "TBD",
        cargoType: formData.cargoType,
        weight: formData.weight,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        createdById: user?.id,
      };

      await api.rides.create(rideData);
      toast.success("Ride request submitted! Drivers will start bidding.");
      setLocation("/customer/rides");
    } catch (error) {
      toast.error("Failed to submit ride request");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-primary">Waykel</h1>
          <p className="text-xs text-muted-foreground">Book Commercial Transport</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="rounded-full h-8 w-8"
            onClick={() => setLocation("/customer/notifications")}
          >
            <Bell className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Book a Commercial Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-green-500" />
                  Pickup Location
                </Label>
                <Input 
                  placeholder="e.g. Fort, Mumbai"
                  value={formData.pickupLocation}
                  onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
                  required
                  data-testid="input-pickup"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-red-500" />
                  Drop Location
                </Label>
                <Input 
                  placeholder="e.g. Pune City"
                  value={formData.dropLocation}
                  onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value })}
                  required
                  data-testid="input-drop"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-blue-500" />
                    Cargo Type
                  </Label>
                  <Select onValueChange={(v) => setFormData({ ...formData, cargoType: v })}>
                    <SelectTrigger data-testid="select-cargo">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="Textiles">Textiles</SelectItem>
                      <SelectItem value="Machinery">Machinery</SelectItem>
                      <SelectItem value="Food Items">Food Items</SelectItem>
                      <SelectItem value="Chemicals">Chemicals</SelectItem>
                      <SelectItem value="Furniture">Furniture</SelectItem>
                      <SelectItem value="General">General Goods</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Weight</Label>
                  <Select onValueChange={(v) => setFormData({ ...formData, weight: v })}>
                    <SelectTrigger data-testid="select-weight">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-2 Ton">1-2 Ton</SelectItem>
                      <SelectItem value="2-5 Ton">2-5 Ton</SelectItem>
                      <SelectItem value="5-10 Ton">5-10 Ton</SelectItem>
                      <SelectItem value="10-16 Ton">10-16 Ton</SelectItem>
                      <SelectItem value="16+ Ton">16+ Ton</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    Date
                  </Label>
                  <Input 
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    data-testid="input-date"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-orange-500" />
                    Pickup Time
                  </Label>
                  <Input 
                    type="time"
                    value={formData.pickupTime}
                    onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                    required
                    data-testid="input-time"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 mt-4" 
                disabled={isLoading}
                data-testid="button-submit"
              >
                {isLoading ? "Submitting..." : "Get Quotes from Drivers"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 text-sm">How it works</h3>
          <ol className="text-xs text-blue-600 mt-2 space-y-1 list-decimal list-inside">
            <li>Submit your transport request</li>
            <li>Drivers and transporters will bid on your load</li>
            <li>Admin reviews and approves the best bid</li>
            <li>Driver picks up and delivers your cargo</li>
          </ol>
        </div>
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16">
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-primary">
             <Truck size={20} />
             <span className="text-[10px]">Book</span>
           </Button>
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/customer/rides")}>
             <Package size={20} />
             <span className="text-[10px]">My Rides</span>
           </Button>
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/customer/profile")}>
             <User size={20} />
             <span className="text-[10px]">Profile</span>
           </Button>
        </div>
      </nav>
    </div>
  );
}
