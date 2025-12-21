import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Truck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function DriverAddVehicle() {
  const [_, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    model: "",
    plateNumber: "",
    capacity: "",
  });
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const result = await api.vehicles.create({
        type: formData.type,
        model: formData.model,
        plateNumber: formData.plateNumber,
        capacity: formData.capacity,
        userId: user.id,
        transporterId: user.transporterId || null,
        status: "active",
      });
      
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Vehicle registered successfully!");
        setLocation("/driver/profile");
      }
    } catch (error) {
      toast.error("Failed to register vehicle");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white px-4 py-4 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <Button 
          size="icon" 
          variant="ghost" 
          className="rounded-full h-8 w-8"
          onClick={() => setLocation("/driver/profile")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Add Vehicle</h1>
          <p className="text-xs text-muted-foreground">Register a new vehicle</p>
        </div>
      </header>

      <main className="p-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Vehicle Details</CardTitle>
                <CardDescription>Enter your vehicle information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Vehicle Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData({...formData, type: value})}
                  required
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mini Truck">Mini Truck (Tata Ace, etc.)</SelectItem>
                    <SelectItem value="Pickup">Pickup</SelectItem>
                    <SelectItem value="LCV">LCV (Light Commercial)</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Trailer">Trailer</SelectItem>
                    <SelectItem value="Container">Container</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="model">Make & Model *</Label>
                <Input 
                  id="model" 
                  placeholder="e.g., Tata Ace Gold, Mahindra Bolero Pickup"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  required
                  data-testid="input-model"
                />
              </div>

              <div>
                <Label htmlFor="plateNumber">Registration Number *</Label>
                <Input 
                  id="plateNumber" 
                  placeholder="e.g., MH12AB1234"
                  value={formData.plateNumber}
                  onChange={(e) => setFormData({...formData, plateNumber: e.target.value.toUpperCase()})}
                  required
                  data-testid="input-plate"
                />
                <p className="text-xs text-gray-500 mt-1">Enter your vehicle's license plate number</p>
              </div>

              <div>
                <Label htmlFor="capacity">Load Capacity (Kg) *</Label>
                <Input 
                  id="capacity" 
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                  required
                  data-testid="input-capacity"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full mt-6"
                disabled={loading}
                data-testid="button-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register Vehicle"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
