import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileText, Upload, Users, Truck, RefreshCw, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { DocumentUpload } from "@/components/document-upload";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function TransporterDocuments() {
  const [_, setLocation] = useLocation();
  const [documents, setDocuments] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [transporter, setTransporter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showBusinessUpload, setShowBusinessUpload] = useState(false);
  const [uploadEntityType, setUploadEntityType] = useState<"driver" | "vehicle" | "transporter">("driver");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const loadData = async () => {
    if (!user?.transporterId) {
      console.log("No transporterId found in user:", user);
      return;
    }
    setLoading(true);
    
    // Fetch each resource independently so one failure doesn't block others
    const results = await Promise.allSettled([
      api.documents.list({ transporterId: user.transporterId }),
      api.users.list({ transporterId: user.transporterId, role: "driver" }),
      api.vehicles.list({ transporterId: user.transporterId }),
      api.transporters.get(user.transporterId),
    ]);
    
    // Process documents
    const docsResult = results[0];
    if (docsResult.status === "fulfilled") {
      const docsData = docsResult.value;
      if (docsData?.error) {
        console.error("Documents API error:", docsData.error);
        toast.error(docsData.error);
        setDocuments([]);
      } else {
        console.log("Documents loaded:", docsData?.length || 0, "docs");
        setDocuments(Array.isArray(docsData) ? docsData : []);
      }
    } else {
      console.error("Documents fetch failed:", docsResult.reason);
      toast.error("Failed to load documents");
      setDocuments([]);
    }
    
    // Process drivers
    const usersResult = results[1];
    if (usersResult.status === "fulfilled") {
      const usersData = usersResult.value;
      if (usersData?.error) {
        console.error("Users API error:", usersData.error);
      }
      setDrivers(Array.isArray(usersData) ? usersData : []);
    } else {
      console.error("Users fetch failed:", usersResult.reason);
      setDrivers([]);
    }
    
    // Process vehicles
    const vehiclesResult = results[2];
    if (vehiclesResult.status === "fulfilled") {
      const vehiclesData = vehiclesResult.value;
      if (vehiclesData?.error) {
        console.error("Vehicles API error:", vehiclesData.error);
      }
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
    } else {
      console.error("Vehicles fetch failed:", vehiclesResult.reason);
      setVehicles([]);
    }
    
    // Process transporter
    const transporterResult = results[3];
    if (transporterResult.status === "fulfilled") {
      const transporterData = transporterResult.value;
      setTransporter(transporterData?.error ? null : transporterData);
    } else {
      console.error("Transporter fetch failed:", transporterResult.reason);
      setTransporter(null);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user?.transporterId]);

  const driverDocs = documents.filter(d => d.entityType === "driver");
  const vehicleDocs = documents.filter(d => d.entityType === "vehicle");
  const businessDocs = documents.filter(d => d.entityType === "transporter");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "expired": return "bg-red-100 text-red-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "replaced": return "bg-gray-100 text-gray-500";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const [replaceDocType, setReplaceDocType] = useState<string | null>(null);
  const [replaceEntityType, setReplaceEntityType] = useState<"driver" | "vehicle" | "transporter" | null>(null);
  const [replaceEntityId, setReplaceEntityId] = useState<string | null>(null);

  const handleReplaceDocument = (doc: any) => {
    setReplaceDocType(doc.type);
    if (doc.entityType === "transporter") {
      setReplaceEntityType("transporter");
      setReplaceEntityId(doc.transporterId);
      setShowBusinessUpload(true);
    } else if (doc.entityType === "driver") {
      setReplaceEntityType("driver");
      setReplaceEntityId(doc.userId);
      setUploadEntityType("driver");
      setSelectedEntityId(doc.userId);
      setShowUploadDialog(true);
    } else if (doc.entityType === "vehicle") {
      setReplaceEntityType("vehicle");
      setReplaceEntityId(doc.vehicleId);
      setUploadEntityType("vehicle");
      setSelectedEntityId(doc.vehicleId);
      setShowUploadDialog(true);
    }
  };

  const getDriverName = (userId: string) => {
    const driver = drivers.find(d => d.id === userId);
    return driver?.name || "Unknown Driver";
  };

  const getVehiclePlate = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.plateNumber || "Unknown Vehicle";
  };

  const openUploadDialog = (type: "driver" | "vehicle") => {
    setUploadEntityType(type);
    setSelectedEntityId("");
    setShowUploadDialog(true);
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
            <FileText className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Documents</h1>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={loadData} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {transporter && !transporter.isVerified && (
          <Card className="mb-6 border-amber-200 bg-amber-50" data-testid="verification-status">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Verification Pending</p>
                  <p className="text-sm text-amber-700">Complete your document uploads to get verified and access the marketplace.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transporter && transporter.isVerified && (
          <Card className="mb-6 border-green-200 bg-green-50" data-testid="verification-complete">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Verified</p>
                  <p className="text-sm text-green-700">Your documents have been verified. You have full access to the marketplace.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setShowBusinessUpload(true)} data-testid="card-upload-business">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Business Documents</p>
                <p className="text-sm text-gray-500">GST, PAN, Registration</p>
              </div>
              <Upload className="h-5 w-5 text-gray-400 ml-auto" />
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => openUploadDialog("driver")} data-testid="card-upload-driver">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Driver Documents</p>
                <p className="text-sm text-gray-500">License, Aadhar, PAN</p>
              </div>
              <Upload className="h-5 w-5 text-gray-400 ml-auto" />
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => openUploadDialog("vehicle")} data-testid="card-upload-vehicle">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Vehicle Documents</p>
                <p className="text-sm text-gray-500">RC, Insurance, Fitness</p>
              </div>
              <Upload className="h-5 w-5 text-gray-400 ml-auto" />
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="business" data-testid="tab-business-docs">
              <Building2 className="h-4 w-4 mr-2" />
              Business ({businessDocs.length})
            </TabsTrigger>
            <TabsTrigger value="driver" data-testid="tab-driver-docs">
              <Users className="h-4 w-4 mr-2" />
              Drivers ({driverDocs.length})
            </TabsTrigger>
            <TabsTrigger value="vehicle" data-testid="tab-vehicle-docs">
              <Truck className="h-4 w-4 mr-2" />
              Vehicles ({vehicleDocs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="business">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : businessDocs.length > 0 ? (
              <div className="space-y-3">
                {businessDocs.filter(d => d.status !== "replaced").map(doc => (
                  <Card key={doc.id} data-testid={`doc-card-${doc.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.documentName}</p>
                          <p className="text-sm text-gray-500">Business Document</p>
                          {doc.expiryDate && (
                            <p className="text-xs text-gray-400">Expires: {doc.expiryDate}</p>
                          )}
                          {doc.status === "rejected" && doc.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">Reason: {doc.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === "rejected" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReplaceDocument(doc)}
                            data-testid={`button-replace-${doc.id}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Replace
                          </Button>
                        )}
                        <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No business documents uploaded yet</p>
                <p className="text-sm mt-2">Upload GST Certificate, PAN Card, Business Registration</p>
                <Button className="mt-4" onClick={() => setShowBusinessUpload(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Business Document
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="driver">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : driverDocs.length > 0 ? (
              <div className="space-y-3">
                {driverDocs.filter(d => d.status !== "replaced").map(doc => (
                  <Card key={doc.id} data-testid={`doc-card-${doc.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.documentName}</p>
                          <p className="text-sm text-gray-500">Driver: {getDriverName(doc.userId)}</p>
                          {doc.expiryDate && (
                            <p className="text-xs text-gray-400">Expires: {doc.expiryDate}</p>
                          )}
                          {doc.status === "rejected" && doc.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">Reason: {doc.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === "rejected" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReplaceDocument(doc)}
                            data-testid={`button-replace-${doc.id}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Replace
                          </Button>
                        )}
                        <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No driver documents uploaded yet</p>
                <Button className="mt-4" onClick={() => openUploadDialog("driver")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="vehicle">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : vehicleDocs.length > 0 ? (
              <div className="space-y-3">
                {vehicleDocs.filter(d => d.status !== "replaced").map(doc => (
                  <Card key={doc.id} data-testid={`doc-card-${doc.id}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{doc.documentName}</p>
                          <p className="text-sm text-gray-500">Vehicle: {getVehiclePlate(doc.vehicleId)}</p>
                          {doc.expiryDate && (
                            <p className="text-xs text-gray-400">Expires: {doc.expiryDate}</p>
                          )}
                          {doc.status === "rejected" && doc.rejectionReason && (
                            <p className="text-xs text-red-600 mt-1">Reason: {doc.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.status === "rejected" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleReplaceDocument(doc)}
                            data-testid={`button-replace-${doc.id}`}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Replace
                          </Button>
                        )}
                        <Badge className={getStatusColor(doc.status)}>{doc.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No vehicle documents uploaded yet</p>
                <Button className="mt-4" onClick={() => openUploadDialog("vehicle")}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First Document
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {showUploadDialog && (
        <DocumentUploadWithSelection
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          entityType={uploadEntityType}
          drivers={drivers}
          vehicles={vehicles}
          transporterId={user.transporterId}
          onSuccess={loadData}
          documents={documents}
        />
      )}

      {showBusinessUpload && (
        <DocumentUpload
          open={showBusinessUpload}
          onOpenChange={setShowBusinessUpload}
          entityType="transporter"
          entityId={user.transporterId}
          transporterId={user.transporterId}
          onSuccess={loadData}
          existingDocuments={businessDocs.map(d => ({ id: d.id, type: d.type, status: d.status, documentName: d.documentName, url: d.url, expiryDate: d.expiryDate }))}
        />
      )}
    </div>
  );
}

function DocumentUploadWithSelection({
  open,
  onOpenChange,
  entityType,
  drivers,
  vehicles,
  transporterId,
  onSuccess,
  documents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "driver" | "vehicle" | "transporter";
  drivers: any[];
  vehicles: any[];
  transporterId: string;
  onSuccess?: () => void;
  documents: any[];
}) {
  const [selectedId, setSelectedId] = useState("");
  const [showDocUpload, setShowDocUpload] = useState(false);

  const entities = entityType === "driver" ? drivers : vehicles;
  
  const getExistingDocsForEntity = () => {
    if (!selectedId) return [];
    const filtered = documents.filter(d => {
      if (entityType === "driver") {
        return d.entityType === "driver" && d.userId === selectedId;
      } else if (entityType === "vehicle") {
        return d.entityType === "vehicle" && d.vehicleId === selectedId;
      }
      return false;
    });
    return filtered.map(d => ({ id: d.id, type: d.type, status: d.status, documentName: d.documentName, url: d.url, expiryDate: d.expiryDate }));
  };

  if (showDocUpload && selectedId) {
    return (
      <DocumentUpload
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowDocUpload(false);
            setSelectedId("");
          }
          onOpenChange(isOpen);
        }}
        entityType={entityType}
        entityId={selectedId}
        transporterId={transporterId}
        onSuccess={onSuccess}
        existingDocuments={getExistingDocsForEntity()}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          Select {entityType === "driver" ? "Driver" : "Vehicle"}
        </h2>
        
        {entities.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>No {entityType}s found</p>
            <p className="text-sm mt-2">Add a {entityType} first before uploading documents</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {entities.map(entity => (
              <div
                key={entity.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedId === entity.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
                }`}
                onClick={() => setSelectedId(entity.id)}
                data-testid={`select-entity-${entity.id}`}
              >
                {entityType === "driver" ? (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{entity.name}</p>
                      <p className="text-sm text-gray-500">{entity.phone}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Truck className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium">{entity.plateNumber}</p>
                      <p className="text-sm text-gray-500">{entity.model} • {entity.type}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            disabled={!selectedId}
            onClick={() => setShowDocUpload(true)}
            data-testid="button-continue"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
