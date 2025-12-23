import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Truck, Plus, Search, FileText, CheckCircle, Clock, AlertCircle, Upload, Loader2 } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { OnboardingTracker } from "@/components/onboarding/OnboardingTracker";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { 
  VEHICLE_CATEGORIES, VEHICLE_TYPES, BODY_TYPES, VEHICLE_LENGTHS, AXLE_TYPES, FUEL_TYPES,
  getVehicleTypesByCategory, parseWeightInput, WeightUnit, VehicleCategoryCode
} from "@shared/vehicleData";

type VehicleFormState = {
  vehicleCategory: VehicleCategoryCode | "";
  vehicleTypeCode: string;
  type: string;
  plateNumber: string;
  model: string;
  capacityValue: string;
  capacityUnit: WeightUnit;
  bodyType: string;
  lengthFt: string;
  axleType: string;
  fuelType: string;
};

const createVehicleFormState = (): VehicleFormState => ({
  vehicleCategory: "",
  vehicleTypeCode: "",
  type: "",
  plateNumber: "",
  model: "",
  capacityValue: "",
  capacityUnit: "kg",
  bodyType: "",
  lengthFt: "",
  axleType: "",
  fuelType: "",
});

export default function TransporterVehicles() {
  const [_, setLocation] = useLocation();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newVehicle, setNewVehicle] = useState<VehicleFormState>(createVehicleFormState);
  const [rcFile, setRcFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const rcInputRef = useRef<HTMLInputElement>(null);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const resetVehicleForm = () => {
    setNewVehicle(createVehicleFormState());
    setRcFile(null);
    if (rcInputRef.current) rcInputRef.current.value = "";
  };

  const { data: onboardingStatus } = useOnboardingStatus(user?.transporterId);

  const loadVehicles = async () => {
    if (!user?.transporterId) return;
    setLoading(true);
    try {
      const [vehiclesData, docsData] = await Promise.all([
        api.vehicles.list({ transporterId: user.transporterId }),
        api.documents.list({ transporterId: user.transporterId }),
      ]);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      const vehicleDocs = Array.isArray(docsData) ? docsData.filter((d: any) => d.entityType === "vehicle") : [];
      setDocuments(vehicleDocs);
    } catch (error) {
      console.error("Failed to load vehicles:", error);
      toast.error("Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  };

  const getVehicleDocuments = (vehicleId: string) => {
    return documents.filter(d => d.vehicleId === vehicleId);
  };

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "pending": return <Clock className="h-3 w-3 text-yellow-500" />;
      case "rejected": return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [user?.transporterId]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate RC document is uploaded
    if (!rcFile) {
      toast.error("RC (Registration Certificate) is mandatory. Please upload the RC document.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Calculate capacity in both units
      const capacityParsed = newVehicle.capacityValue 
        ? parseWeightInput(newVehicle.capacityValue, newVehicle.capacityUnit)
        : { kg: 0, tons: 0 };
      
      // Get vehicle type name from code
      const vehicleType = VEHICLE_TYPES.find(vt => vt.code === newVehicle.vehicleTypeCode);
      const displayType = vehicleType?.name || newVehicle.type;
      
      // Step 1: Create the vehicle
      // Note: capacityTons must be string (decimal in DB), capacityKg is integer
      const creationPayload = {
        type: displayType,
        plateNumber: newVehicle.plateNumber,
        model: newVehicle.model,
        capacity: `${newVehicle.capacityValue} ${newVehicle.capacityUnit === "kg" ? "Kg" : "Tons"}`,
        capacityKg: capacityParsed.kg || null,
        capacityTons: capacityParsed.tons ? String(capacityParsed.tons) : null,
        vehicleCategory: newVehicle.vehicleCategory || null,
        vehicleTypeCode: newVehicle.vehicleTypeCode || null,
        bodyType: newVehicle.bodyType || null,
        lengthFt: newVehicle.lengthFt ? parseInt(newVehicle.lengthFt) : null,
        axleType: newVehicle.axleType || null,
        fuelType: newVehicle.fuelType || null,
        transporterId: user.transporterId,
        status: "active",
      };

      const result = await api.vehicles.create(creationPayload);
      const vehicleCreationError = (result as any)?.error as string | undefined;
      if (!result || vehicleCreationError) {
        throw new Error(vehicleCreationError || "Vehicle creation failed. Please try again or contact support.");
      }

      const vehicleId = result.id;
      const entityId = result.entityId;

      if (!vehicleId || !entityId) {
        console.error("Vehicle entityId missing in response:", result);
        throw new Error("VEHICLE_ENTITY_ID_MISSING");
      }

      if (!entityId) {
        throw new Error("RC_UPLOAD_BLOCKED");
      }

      const formData = new FormData();
      formData.append("fileData", rcFile);
      formData.append("fileName", rcFile.name);
      formData.append("contentType", rcFile.type || "application/octet-stream");
      formData.append("entityType", "vehicle");
      formData.append("type", "rc");
      formData.append("entityId", entityId);

      const uploadRes = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!uploadRes.ok) {
        const uploadErr = await uploadRes.json().catch(() => ({}));
        console.error("RC upload failed:", uploadErr);
        throw new Error("RC_UPLOAD_BLOCKED");
      }

      toast.success("Vehicle added successfully");
      setShowAddDialog(false);
      resetVehicleForm();
      loadVehicles();
    } catch (error) {
      const message = (error as Error)?.message;
      if (message === "VEHICLE_ENTITY_ID_MISSING") {
        toast.error("Vehicle creation failed. Please try again or contact support.");
      } else if (message === "RC_UPLOAD_BLOCKED") {
        toast.error("RC upload blocked. Vehicle setup incomplete.");
      } else if (message) {
        toast.error(message);
      } else {
        toast.error("Failed to add vehicle");
      }
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen bg-gray-50 pl-64">
      <TransporterSidebar />
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Truck className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Manage Vehicles</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty state when not loading and there are no vehicles */}
        {!loading && vehicles.length === 0 && (
          <div className="mb-6">
            <Card className="border-dashed border-gray-200 p-6 text-center">
              <CardContent>
                <p className="text-lg font-semibold">No vehicles added yet</p>
                <p className="text-sm text-gray-500 mt-2">Add your first vehicle to start receiving trips</p>
                <div className="mt-4">
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vehicle
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {onboardingStatus && onboardingStatus.overallStatus !== "completed" && (
          <div className="mb-6">
            <OnboardingTracker data={onboardingStatus} />
          </div>
        )}
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
            <DialogContent aria-describedby="rc-upload-desc">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <p id="rc-upload-desc" className="sr-only">
                Upload vehicle registration certificate
              </p>
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
                  <Label htmlFor="model">Make/Model</Label>
                  <Input 
                    id="model" 
                    placeholder="e.g., Tata Ace, Ashok Leyland Dost"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                    required
                    data-testid="input-model"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <Label htmlFor="capacityValue">Capacity</Label>
                    <Input 
                      id="capacityValue" 
                      type="number"
                      placeholder={newVehicle.capacityUnit === "kg" ? "e.g., 5000" : "e.g., 5"}
                      value={newVehicle.capacityValue}
                      onChange={(e) => setNewVehicle({...newVehicle, capacityValue: e.target.value})}
                      required
                      data-testid="input-capacity"
                    />
                  </div>
                  <div>
                    <Label htmlFor="capacityUnit">Unit</Label>
                    <Select 
                      value={newVehicle.capacityUnit} 
                      onValueChange={(v: WeightUnit) => setNewVehicle({...newVehicle, capacityUnit: v})}
                    >
                      <SelectTrigger id="capacityUnit" data-testid="select-capacity-unit">
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
                  <Label htmlFor="rc-upload" className="flex items-center gap-1">
                    RC Document <span className="text-red-500">*</span>
                    <span className="text-xs text-muted-foreground">(Registration Certificate)</span>
                  </Label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                      rcFile ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-blue-400"
                    }`}
                    onClick={() => rcInputRef.current?.click()}
                  >
                    <input
                      ref={rcInputRef}
                      type="file"
                      id="rc-upload"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error("File size must be less than 10MB");
                            return;
                          }
                          setRcFile(file);
                        }
                      }}
                      data-testid="input-rc-upload"
                    />
                    {rcFile ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">{rcFile.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <Upload className="h-8 w-8" />
                        <span className="text-sm">Click to upload RC document</span>
                        <span className="text-xs text-muted-foreground">PDF or Image (max 10MB)</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-amber-600">
                    RC is mandatory for vehicle verification
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting || !rcFile}
                  data-testid="button-submit-vehicle"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Vehicle...
                    </>
                  ) : (
                    "Add Vehicle"
                  )}
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
                        <p>{vehicle.model || vehicle.type}</p>
                        <p>Type: {vehicle.type} {vehicle.capacity && `• ${/^\d+$/.test(vehicle.capacity) ? `${vehicle.capacity} Kg` : vehicle.capacity}`}</p>
                      </div>
                      {/* Vehicle Documents */}
                      {getVehicleDocuments(vehicle.id).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Documents
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {getVehicleDocuments(vehicle.id).map(doc => (
                              <Badge 
                                key={doc.id} 
                                variant="outline" 
                                className={`text-xs ${
                                  doc.status === "verified" 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : doc.status === "pending"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                                data-testid={`doc-badge-${doc.id}`}
                              >
                                {getDocStatusIcon(doc.status)}
                                <span className="ml-1">{doc.documentName}</span>
                              </Badge>
                            ))}
                          </div>
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
