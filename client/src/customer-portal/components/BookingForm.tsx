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
import { useQuery } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";

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

  const { data: addresses = [] } = useQuery({
    queryKey: ["customer-addresses"],
    queryFn: () => waykelApi.addresses.getSavedAddresses(),
  });

  const handleAddressSelect = (type: "pickup" | "drop", addressId: string) => {
    const addr = addresses.find(a => a.id === addressId);
    if (!addr) return;

    if (type === "pickup") {
      setFormData(prev => ({
        ...prev,
        pickupLocation: `${addr.street}, ${addr.city}, ${addr.state}`,
        pickupPincode: addr.postalCode
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dropLocation: `${addr.street}, ${addr.city}, ${addr.state}`,
        dropPincode: addr.postalCode
      }));
    }
  };

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
    <Card className="border-card-border overflow-hidden">
      <CardHeader className="bg-muted/30 border-b border-card-border/50">
        <CardTitle className="text-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Truck className="h-6 w-6 text-primary" />
          </div>
          <div>
            <span className="font-bold">Book a Commercial Vehicle</span>
            <p className="text-xs text-muted-foreground font-medium mt-0.5">Get instant quotes from thousands of verified transporters</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Route */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <MapPin className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Trip Route</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Pickup Location
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Fort, Mumbai"
                      value={formData.pickupLocation}
                      onChange={e => setFormData({ ...formData, pickupLocation: e.target.value })}
                      className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium flex-1"
                      required
                    />
                    {addresses.length > 0 && (
                      <Select onValueChange={v => handleAddressSelect("pickup", v)}>
                        <SelectTrigger className="w-12 h-11 border-border/60 p-0 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                          {addresses.map(addr => (
                            <SelectItem key={addr.id} value={addr.id}>{addr.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    Pickup Pincode
                  </Label>
                  <Input
                    placeholder="e.g. 400001"
                    value={formData.pickupPincode}
                    onChange={e => setFormData({ ...formData, pickupPincode: e.target.value })}
                    maxLength={6}
                    className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Drop Location
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Pune City"
                      value={formData.dropLocation}
                      onChange={e => setFormData({ ...formData, dropLocation: e.target.value })}
                      className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium flex-1"
                      required
                    />
                    {addresses.length > 0 && (
                      <Select onValueChange={v => handleAddressSelect("drop", v)}>
                        <SelectTrigger className="w-12 h-11 border-border/60 p-0 flex items-center justify-center">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                        </SelectTrigger>
                        <SelectContent>
                          {addresses.map(addr => (
                            <SelectItem key={addr.id} value={addr.id}>{addr.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                    <Hash className="h-3 w-3" />
                    Drop Pincode
                  </Label>
                  <Input
                    placeholder="e.g. 411001"
                    value={formData.dropPincode}
                    onChange={e => setFormData({ ...formData, dropPincode: e.target.value })}
                    maxLength={6}
                    className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: Shipment Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Package className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-blue-500">Shipment Details</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Cargo Type</Label>
                <Input
                  placeholder="e.g. Electronics"
                  value={formData.cargoType}
                  onChange={e => setFormData({ ...formData, cargoType: e.target.value })}
                  className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Load Weight</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder={formData.weightUnit === "kg" ? "5000" : "5"}
                    value={formData.weightValue}
                    onChange={e => setFormData({ ...formData, weightValue: e.target.value })}
                    className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium flex-1"
                  />
                  <Select value={formData.weightUnit} onValueChange={(v: WeightUnit) => setFormData({ ...formData, weightUnit: v })}>
                    <SelectTrigger className="w-20 h-11 border-border/60">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="tons">Tons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Required Vehicle</Label>
                <Select onValueChange={v => setFormData({ ...formData, requiredVehicleType: v === "any" ? "" : v })}>
                  <SelectTrigger className="h-11 border-border/60">
                    <SelectValue placeholder="Select Vehicle" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="any" className="font-bold text-primary">Any Vehicle (Lowest Quote)</SelectItem>
                    {VEHICLE_CATEGORIES.map(cat => (
                      <div key={cat.code}>
                        <div className="px-2 py-1.5 text-[10px] font-bold text-muted-foreground bg-muted/50 uppercase tracking-tighter">{cat.name}</div>
                        {VEHICLE_TYPES.filter(vt => vt.category === cat.code).map(vt => (
                          <SelectItem key={vt.code} value={vt.code} className="text-xs">{getVehicleTypeDisplay(vt)}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Schedule & Pricing */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <Calendar className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-500">Schedule & Budget</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Pickup Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase">Pickup Time</Label>
                <Input
                  type="time"
                  value={formData.pickupTime}
                  onChange={e => setFormData({ ...formData, pickupTime: e.target.value })}
                  className="h-11 border-border/60 focus:border-primary/50 transition-all font-medium"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center justify-between">
                  Your Budget
                  <span className="text-[10px] font-normal lowercase">(Optional)</span>
                </Label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</div>
                  <Input
                    type="number"
                    placeholder="Target price"
                    value={formData.budgetPrice}
                    onChange={e => setFormData({ ...formData, budgetPrice: e.target.value })}
                    className="h-11 pl-7 border-border/60 focus:border-primary/50 transition-all font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-14 text-base font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-[0.98] transition-all gap-3"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  Get Competitive Quotes Now
                </>
              )}
            </Button>
            <p className="text-center text-[10px] text-muted-foreground mt-4 font-medium uppercase tracking-tight">
              By submitting, you agree to our terms and conditions for commercial bookings
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
