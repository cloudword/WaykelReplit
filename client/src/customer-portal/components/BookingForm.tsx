import { useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Hash, Truck, Calendar, Clock, Zap, Package } from "lucide-react";
import { waykelApi } from "../lib/waykelApi";
import { useAuth } from "../lib/auth";
import { queryClient } from "@/lib/queryClient";
import { VEHICLE_CATEGORIES, VEHICLE_TYPES, getVehicleTypeDisplay, parseWeightInput, WeightUnit } from "@shared/vehicleData";

export function BookingForm() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    pickupLocation: "",
    dropLocation: "",
    pickupPincode: "",
    dropPincode: "",
    cargoType: "",
    weightValue: "",
    weightUnit: "kg" as WeightUnit,
    requiredVehicleType: "",
    date: "",
    pickupTime: "",
    budgetPrice: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Please log in", description: "Sign in to book a vehicle", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const weightParsed = formData.weightValue
        ? parseWeightInput(formData.weightValue, formData.weightUnit)
        : { kg: 0, tons: 0 };

      const displayWeight = formData.weightValue
        ? `${formData.weightValue} ${formData.weightUnit === "kg" ? "Kg" : "Tons"}`
        : "";

      const ride = await waykelApi.rides.createRide({
        pickupLocation: formData.pickupLocation,
        dropLocation: formData.dropLocation,
        pickupTime: formData.pickupTime,
        date: formData.date,
        price: formData.budgetPrice || "0.00",
        distance: "TBD",
        cargoType: formData.cargoType,
        weight: displayWeight || "",
        createdById: user.id,
      });

      // Fire-and-forget notify call
      try {
        await fetch(`/api/rides/${ride.id}/notify-transporters`, { method: "POST", credentials: "include" });
      } catch (notifyError) {
        console.warn("Could not notify transporters automatically", notifyError);
      }

      toast({ title: "Booking submitted!", description: "Matching transporters will be notified." });
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      setLocation("/customer/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit booking";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Book a Commercial Vehicle
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-green-500" />
                Pickup Location
              </Label>
              <Input
                placeholder="e.g. Fort, Mumbai"
                value={formData.pickupLocation}
                onChange={e => setFormData({ ...formData, pickupLocation: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-green-400" />
                Pickup Pincode
              </Label>
              <Input
                placeholder="e.g. 400001"
                value={formData.pickupPincode}
                onChange={e => setFormData({ ...formData, pickupPincode: e.target.value })}
                maxLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-red-500" />
                Drop Location
              </Label>
              <Input
                placeholder="e.g. Pune City"
                value={formData.dropLocation}
                onChange={e => setFormData({ ...formData, dropLocation: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Hash className="h-4 w-4 text-red-400" />
                Drop Pincode
              </Label>
              <Input
                placeholder="e.g. 411001"
                value={formData.dropPincode}
                onChange={e => setFormData({ ...formData, dropPincode: e.target.value })}
                maxLength={6}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-blue-500" />
                Cargo Type
              </Label>
              <Input
                placeholder="e.g. Electronics"
                value={formData.cargoType}
                onChange={e => setFormData({ ...formData, cargoType: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Truck className="h-4 w-4 text-indigo-500" />
                Vehicle Type
              </Label>
              <Select onValueChange={v => setFormData({ ...formData, requiredVehicleType: v === "any" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Vehicle</SelectItem>
                  {VEHICLE_CATEGORIES.map(cat => (
                    <div key={cat.code}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">{cat.name}</div>
                      {VEHICLE_TYPES.filter(vt => vt.category === cat.code).map(vt => (
                        <SelectItem key={vt.code} value={vt.code}>{getVehicleTypeDisplay(vt)}</SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-amber-500" />
              Load Weight
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={formData.weightUnit === "kg" ? "e.g. 5000" : "e.g. 5"}
                value={formData.weightValue}
                onChange={e => setFormData({ ...formData, weightValue: e.target.value })}
                className="flex-1"
              />
              <Select value={formData.weightUnit} onValueChange={(v: WeightUnit) => setFormData({ ...formData, weightUnit: v })}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kg</SelectItem>
                  <SelectItem value="tons">Tons</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.weightValue && (
              <p className="text-xs text-muted-foreground">
                {formData.weightUnit === "kg"
                  ? `= ${parseWeightInput(formData.weightValue, "kg").tons} Tons`
                  : `= ${parseWeightInput(formData.weightValue, "tons").kg} Kg`}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-purple-500" />
                Date
              </Label>
              <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-orange-500" />
                Pickup Time
              </Label>
              <Input type="time" value={formData.pickupTime} onChange={e => setFormData({ ...formData, pickupTime: e.target.value })} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-yellow-500" />
              Your Budget (₹) <span className="text-xs text-muted-foreground ml-1">(optional)</span>
            </Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              value={formData.budgetPrice}
              onChange={e => setFormData({ ...formData, budgetPrice: e.target.value })}
            />
          </div>

          <Button type="submit" className="w-full h-12 mt-2" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Submitting..." : "Get Quotes from Transporters"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
