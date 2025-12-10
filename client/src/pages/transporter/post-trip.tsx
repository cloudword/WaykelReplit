import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, MapPin, Calendar, Package, IndianRupee, Truck, Plus, Clock, User, BookmarkCheck } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface SavedAddress {
  id: string;
  label: string;
  address: string;
  pincode?: string;
  city?: string;
  state?: string;
  addressType?: string;
}

interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  model?: string;
  capacity?: string;
}

export default function TransporterPostTrip() {
  const [_, setLocation] = useLocation();
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [formData, setFormData] = useState({
    pickupLocation: "",
    pickupAddressId: "",
    dropLocation: "",
    dropAddressId: "",
    date: "",
    pickupTime: "",
    price: "",
    cargoType: "",
    weight: "",
    distance: "",
    notes: "",
    selfAssign: false,
    vehicleId: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [addressesData, vehiclesData] = await Promise.all([
        api.savedAddresses.list(),
        api.vehicles.list(),
      ]);
      setSavedAddresses(Array.isArray(addressesData) ? addressesData : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePickupAddressChange = (addressId: string) => {
    const address = savedAddresses.find(a => a.id === addressId);
    if (address) {
      const fullAddress = [address.address, address.city, address.state, address.pincode]
        .filter(Boolean)
        .join(", ");
      setFormData(prev => ({
        ...prev,
        pickupAddressId: addressId,
        pickupLocation: fullAddress,
      }));
    }
  };

  const handleDropAddressChange = (addressId: string) => {
    const address = savedAddresses.find(a => a.id === addressId);
    if (address) {
      const fullAddress = [address.address, address.city, address.state, address.pincode]
        .filter(Boolean)
        .join(", ");
      setFormData(prev => ({
        ...prev,
        dropAddressId: addressId,
        dropLocation: fullAddress,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!formData.pickupLocation || !formData.dropLocation) {
      toast.error("Please enter pickup and drop locations");
      return;
    }
    if (!formData.date || !formData.pickupTime) {
      toast.error("Please select date and time");
      return;
    }
    if (!formData.price) {
      toast.error("Please enter the price");
      return;
    }
    if (formData.selfAssign && !formData.vehicleId) {
      toast.error("Please select a vehicle for self-assignment");
      return;
    }

    setIsSubmitting(true);
    try {
      const tripData = {
        pickupLocation: formData.pickupLocation,
        dropLocation: formData.dropLocation,
        date: formData.date,
        pickupTime: formData.pickupTime,
        price: formData.price,
        cargoType: formData.cargoType || null,
        weight: formData.weight || null,
        distance: formData.distance || null,
        notes: formData.notes || null,
        selfAssign: formData.selfAssign,
        vehicleId: formData.selfAssign ? formData.vehicleId : null,
        transporterId: user?.transporterId,
      };

      const result = await api.tripPosting.create(tripData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(formData.selfAssign 
          ? "Trip created and self-assigned!" 
          : "Trip posted to marketplace!"
        );
        setLocation("/transporter/trips");
      }
    } catch (error) {
      toast.error("Failed to post trip");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/transporter")} data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Post New Trip</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Trip Details
            </CardTitle>
            <CardDescription>
              Post a new load for drivers to bid on, or self-assign to your own vehicle
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickupAddress">Pickup Location</Label>
                {savedAddresses.length > 0 && (
                  <Select value={formData.pickupAddressId} onValueChange={handlePickupAddressChange}>
                    <SelectTrigger data-testid="select-pickup-saved">
                      <SelectValue placeholder="Select saved address" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          <div className="flex items-center gap-2">
                            <BookmarkCheck className="h-4 w-4 text-blue-600" />
                            {addr.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="pickupAddress"
                    className="pl-10"
                    placeholder="Enter pickup address"
                    value={formData.pickupLocation}
                    onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value, pickupAddressId: "" })}
                    data-testid="input-pickup-location"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dropAddress">Drop Location</Label>
                {savedAddresses.length > 0 && (
                  <Select value={formData.dropAddressId} onValueChange={handleDropAddressChange}>
                    <SelectTrigger data-testid="select-drop-saved">
                      <SelectValue placeholder="Select saved address" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          <div className="flex items-center gap-2">
                            <BookmarkCheck className="h-4 w-4 text-green-600" />
                            {addr.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="dropAddress"
                    className="pl-10"
                    placeholder="Enter drop address"
                    value={formData.dropLocation}
                    onChange={(e) => setFormData({ ...formData, dropLocation: e.target.value, dropAddressId: "" })}
                    data-testid="input-drop-location"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    className="pl-10"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    data-testid="input-date"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Pickup Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    className="pl-10"
                    value={formData.pickupTime}
                    onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                    data-testid="input-time"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="price"
                    type="number"
                    className="pl-10"
                    placeholder="Enter amount"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    data-testid="input-price"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cargoType">Cargo Type</Label>
                <Select value={formData.cargoType} onValueChange={(val) => setFormData({ ...formData, cargoType: val })}>
                  <SelectTrigger data-testid="select-cargo-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General Goods</SelectItem>
                    <SelectItem value="perishable">Perishable</SelectItem>
                    <SelectItem value="fragile">Fragile Items</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="agricultural">Agricultural</SelectItem>
                    <SelectItem value="construction">Construction</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="weight"
                    type="number"
                    className="pl-10"
                    placeholder="e.g., 500"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    data-testid="input-weight"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="distance">Distance (km)</Label>
                <Input
                  id="distance"
                  type="number"
                  placeholder="e.g., 150"
                  value={formData.distance}
                  onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                  data-testid="input-distance"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or requirements..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                data-testid="input-notes"
              />
            </div>

            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="selfAssign"
                    checked={formData.selfAssign}
                    onCheckedChange={(checked) => setFormData({ ...formData, selfAssign: !!checked })}
                    data-testid="checkbox-self-assign"
                  />
                  <div className="flex-1">
                    <Label htmlFor="selfAssign" className="text-base font-medium cursor-pointer">
                      Self-Assign to My Vehicle
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Skip the marketplace bidding and directly assign this trip to one of your vehicles
                    </p>

                    {formData.selfAssign && (
                      <div className="mt-4">
                        <Label>Select Vehicle</Label>
                        <Select value={formData.vehicleId} onValueChange={(val) => setFormData({ ...formData, vehicleId: val })}>
                          <SelectTrigger className="mt-1 bg-white" data-testid="select-vehicle">
                            <SelectValue placeholder="Select a vehicle" />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.length === 0 ? (
                              <SelectItem value="none" disabled>No vehicles available</SelectItem>
                            ) : (
                              vehicles.map((vehicle) => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                  <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    {vehicle.vehicleNumber} - {vehicle.vehicleType}
                                    {vehicle.capacity && ` (${vehicle.capacity})`}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setLocation("/transporter")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="button-submit"
              >
                {isSubmitting ? "Posting..." : formData.selfAssign ? "Create & Assign Trip" : "Post to Marketplace"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {savedAddresses.length === 0 && !loading && (
          <Card className="mt-4 border-dashed border-2">
            <CardContent className="p-6 text-center">
              <BookmarkCheck className="h-10 w-10 text-gray-400 mx-auto mb-2" />
              <h3 className="font-medium text-gray-900 mb-1">No Saved Addresses</h3>
              <p className="text-sm text-gray-600 mb-4">
                Save frequently used addresses to quickly fill in pickup and drop locations
              </p>
              <Button variant="outline" size="sm" onClick={() => setLocation("/transporter/addresses")} data-testid="button-manage-addresses">
                <Plus className="h-4 w-4 mr-2" />
                Manage Saved Addresses
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
