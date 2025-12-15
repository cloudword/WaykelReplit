import { useState, useEffect, type ElementType } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Plus, Edit, Trash2, BookmarkCheck, Home, Warehouse, Building, Factory } from "lucide-react";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
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

const ADDRESS_TYPE_ICONS: Record<string, ElementType> = {
  home: Home,
  warehouse: Warehouse,
  office: Building,
  factory: Factory,
  other: MapPin,
};

export default function TransporterAddresses() {
  const [_, setLocation] = useLocation();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const [formData, setFormData] = useState({
    label: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    addressType: "warehouse",
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await api.savedAddresses.list();
      setAddresses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load addresses:", error);
      toast.error("Failed to load saved addresses");
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({
      label: "",
      address: "",
      pincode: "",
      city: "",
      state: "",
      addressType: "warehouse",
    });
    setShowCreateDialog(true);
  };

  const openDeleteDialog = (address: SavedAddress) => {
    setSelectedAddress(address);
    setShowDeleteDialog(true);
  };

  const handleCreate = async () => {
    if (!formData.label.trim() || !formData.address.trim()) {
      toast.error("Label and address are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.savedAddresses.create(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Address saved successfully");
        setShowCreateDialog(false);
        loadAddresses();
      }
    } catch (error) {
      toast.error("Failed to save address");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAddress) return;

    setIsSubmitting(true);
    try {
      const result = await api.savedAddresses.delete(selectedAddress.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Address deleted");
        setShowDeleteDialog(false);
        loadAddresses();
      }
    } catch (error) {
      toast.error("Failed to delete address");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAddressIcon = (type?: string) => {
    const Icon = ADDRESS_TYPE_ICONS[type || "other"] || MapPin;
    return <Icon className="h-5 w-5" />;
  };

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
            <MapPin className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Saved Addresses</h1>
            <div className="ml-auto">
              <Button onClick={openCreateDialog} data-testid="button-add-address">
                <Plus className="h-4 w-4 mr-2" />
                Add Address
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading addresses...</div>
        ) : addresses.length === 0 ? (
          <Card className="border-dashed border-2">
            <CardContent className="p-12 text-center">
              <BookmarkCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Saved Addresses</h3>
              <p className="text-gray-600 mb-6">
                Save frequently used pickup and drop locations to quickly fill in trip details
              </p>
              <Button onClick={openCreateDialog} data-testid="button-add-first-address">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Address
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <Card key={address.id} data-testid={`card-address-${address.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      {getAddressIcon(address.addressType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{address.label}</h3>
                        {address.addressType && (
                          <Badge variant="secondary" className="text-xs capitalize">
                            {address.addressType}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{address.address}</p>
                      {(address.city || address.state || address.pincode) && (
                        <p className="text-xs text-gray-500 mt-1">
                          {[address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDeleteDialog(address)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      data-testid={`button-delete-address-${address.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Saved Address</DialogTitle>
            <DialogDescription>
              Save a frequently used location for quick access when posting trips
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="label">Label / Name</Label>
              <Input
                id="label"
                placeholder="e.g., Main Warehouse, Delhi Office"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                data-testid="input-address-label"
              />
            </div>

            <div>
              <Label htmlFor="addressType">Address Type</Label>
              <Select value={formData.addressType} onValueChange={(val) => setFormData({ ...formData, addressType: val })}>
                <SelectTrigger data-testid="select-address-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="factory">Factory</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="address">Full Address</Label>
              <Input
                id="address"
                placeholder="Street address, building, landmark"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                data-testid="input-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g., Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  data-testid="input-city"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="e.g., Maharashtra"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  data-testid="input-state"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                placeholder="e.g., 400001"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                data-testid="input-pincode"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting} data-testid="button-save-address">
              {isSubmitting ? "Saving..." : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Address</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAddress?.label}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} data-testid="button-confirm-delete">
              {isSubmitting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
