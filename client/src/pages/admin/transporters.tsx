import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, MoreHorizontal, Building2, Download, Plus, CheckCircle, XCircle, Loader2, Users, Truck, MapPin, IndianRupee, Phone, Mail, Eye, ShieldCheck, Clock, AlertCircle, FileText, RefreshCw } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";

interface Transporter {
  id: string;
  companyName: string;
  ownerName: string;
  contact: string;
  email: string;
  location: string;
  baseCity: string;
  fleetSize: number;
  status: string;
  isVerified?: boolean;
  documentsComplete?: boolean;
  verifiedAt?: string;
  preferredRoutes?: string[];
  createdAt: string;
}

export default function AdminTransporters() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<Transporter | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [transporterDocs, setTransporterDocs] = useState<any[]>([]);
  const [driverDocs, setDriverDocs] = useState<{[key: string]: any[]}>({});
  const [vehicleDocs, setVehicleDocs] = useState<{[key: string]: any[]}>({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  
  const [newTransporter, setNewTransporter] = useState({
    companyName: "",
    ownerName: "",
    contact: "",
    email: "",
    location: "",
    fleetSize: "1",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transportersData, usersData, vehiclesData, ridesData] = await Promise.all([
        api.transporters.list(),
        api.users.list(),
        api.vehicles.list(),
        api.rides.list(),
      ]);
      if (Array.isArray(transportersData)) {
        setTransporters(transportersData);
      }
      setDrivers(Array.isArray(usersData) ? usersData.filter((u: any) => u.role === "driver") : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);
      setRides(Array.isArray(ridesData) ? ridesData : []);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await api.transporters.updateStatus(id, newStatus);
      toast.success(`Transporter ${newStatus === 'active' ? 'approved' : 'status updated'}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleVerifyTransporter = async (id: string) => {
    setVerifyingId(id);
    try {
      const result = await api.transporters.verify(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transporter verified and approved successfully!");
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to verify transporter");
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddTransporter = async () => {
    if (!newTransporter.companyName || !newTransporter.ownerName || !newTransporter.contact || !newTransporter.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.transporters.create({
        companyName: newTransporter.companyName,
        ownerName: newTransporter.ownerName,
        contact: newTransporter.contact,
        email: newTransporter.email || undefined,
        location: newTransporter.location,
        baseCity: newTransporter.location,
        fleetSize: parseInt(newTransporter.fleetSize) || 1,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transporter added successfully");
        setIsAddDialogOpen(false);
        setNewTransporter({
          companyName: "",
          ownerName: "",
          contact: "",
          email: "",
          location: "",
          fleetSize: "1",
        });
        fetchData();
      }
    } catch (error) {
      toast.error("Failed to add transporter");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTransporterDrivers = (transporterId: string) => {
    return drivers.filter(d => d.transporterId === transporterId);
  };

  const getTransporterVehicles = (transporterId: string) => {
    return vehicles.filter(v => v.transporterId === transporterId);
  };

  const getTransporterRides = (transporterId: string) => {
    return rides.filter(r => r.transporterId === transporterId);
  };

  const getTransporterEarnings = (transporterId: string) => {
    const transporterRides = getTransporterRides(transporterId).filter(r => r.status === "completed");
    return transporterRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
  };

  const openTransporterDetails = async (transporter: Transporter) => {
    setSelectedTransporter(transporter);
    setShowDetailDialog(true);
    await loadTransporterDocuments(transporter.id);
  };

  const loadTransporterDocuments = async (transporterId: string) => {
    setLoadingDocs(true);
    try {
      // Get lists of drivers and vehicles first
      const transporterDrivers = drivers.filter(d => d.transporterId === transporterId);
      const transporterVehicles = vehicles.filter(v => v.transporterId === transporterId);

      // Fetch all documents in parallel using Promise.all
      const [transporterDocsData, ...allEntityDocs] = await Promise.all([
        // Transporter documents
        fetch(`${API_BASE}/documents?transporterId=${transporterId}&entityType=transporter`, {
          credentials: "include",
        }).then(r => r.ok ? r.json() : []).catch(() => []),
        
        // Driver documents (one request per driver)
        ...transporterDrivers.map(driver =>
          fetch(`${API_BASE}/documents?userId=${driver.id}`, {
            credentials: "include",
          }).then(r => r.ok ? r.json() : []).catch(() => [])
        ),
        
        // Vehicle documents (one request per vehicle)
        ...transporterVehicles.map(vehicle =>
          fetch(`${API_BASE}/documents?vehicleId=${vehicle.id}`, {
            credentials: "include",
          }).then(r => r.ok ? r.json() : []).catch(() => [])
        ),
      ]);

      // Set transporter docs
      setTransporterDocs(Array.isArray(transporterDocsData) ? transporterDocsData : []);

      // Split results into driver and vehicle docs
      const driverDocsResults = allEntityDocs.slice(0, transporterDrivers.length);
      const vehicleDocsResults = allEntityDocs.slice(transporterDrivers.length);

      // Build driver docs map
      const driverDocsMap: {[key: string]: any[]} = {};
      transporterDrivers.forEach((driver, index) => {
        const docs = driverDocsResults[index];
        driverDocsMap[driver.id] = Array.isArray(docs) ? docs : [];
      });
      setDriverDocs(driverDocsMap);

      // Build vehicle docs map
      const vehicleDocsMap: {[key: string]: any[]} = {};
      transporterVehicles.forEach((vehicle, index) => {
        const docs = vehicleDocsResults[index];
        vehicleDocsMap[vehicle.id] = Array.isArray(docs) ? docs : [];
      });
      setVehicleDocs(vehicleDocsMap);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleApproveDocument = async (docId: string) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "verified" }),
      });
      if (response.ok) {
        toast.success("Document approved");
        if (selectedTransporter) {
          await loadTransporterDocuments(selectedTransporter.id);
        }
      } else {
        toast.error("Failed to approve document");
      }
    } catch (error) {
      toast.error("Failed to approve document");
    }
  };

  const handleRejectDocument = async (docId: string) => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/documents/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "rejected", rejectionReason: rejectionReason.trim() }),
      });
      if (response.ok) {
        toast.success("Document rejected");
        setRejectingDocId(null);
        setRejectionReason("");
        if (selectedTransporter) {
          await loadTransporterDocuments(selectedTransporter.id);
        }
      } else {
        toast.error("Failed to reject document");
      }
    } catch (error) {
      toast.error("Failed to reject document");
    }
  };

  const handleViewDocument = async (doc: any) => {
    if (!doc.url) {
      toast.error("Document URL not available");
      return;
    }
    try {
      if (doc.url.startsWith("private/")) {
        const response = await fetch(`${API_BASE}/spaces/signed-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ key: doc.url }),
        });
        if (response.ok) {
          const { signedUrl } = await response.json();
          window.open(signedUrl, "_blank");
        } else {
          toast.error("Failed to get document access");
        }
      } else {
        window.open(`/objects/${doc.url}`, "_blank");
      }
    } catch (error) {
      toast.error("Failed to view document");
    }
  };

  const renderDocumentCard = (doc: any) => {
    const getStatusStyles = (status: string) => {
      switch (status) {
        case "pending":
          return { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100" };
        case "verified":
          return { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100" };
        case "rejected":
          return { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100" };
        default:
          return { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", badge: "bg-gray-100" };
      }
    };
    const styles = getStatusStyles(doc.status);
    const fileName = doc.url?.split("/").pop();

    return (
      <div key={doc.id} className={`p-3 rounded-lg border ${styles.bg} ${styles.border}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{doc.documentName || doc.type}</p>
            {fileName && <p className="text-xs text-gray-500 truncate">{decodeURIComponent(fileName)}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${styles.badge} ${styles.text}`}>
              {doc.status === "pending" ? "Pending" : doc.status === "verified" ? "Verified" : "Rejected"}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleViewDocument(doc)}>
              <Eye className="h-4 w-4" />
            </Button>
            {doc.status === "pending" && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleApproveDocument(doc.id)}>
                  <CheckCircle className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setRejectingDocId(doc.id)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
        {doc.status === "rejected" && doc.rejectionReason && (
          <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
            <span className="font-medium">Reason:</span> {doc.rejectionReason}
          </div>
        )}
        {rejectingDocId === doc.id && (
          <div className="mt-2 space-y-2">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => handleRejectDocument(doc.id)}>
                Confirm Reject
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setRejectingDocId(null); setRejectionReason(""); }}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const filteredTransporters = transporters.filter(t => {
    const matchesSearch = 
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  const getStatusCounts = () => {
    return {
      all: transporters.length,
      pending_verification: transporters.filter(t => t.status === "pending_verification").length,
      pending_approval: transporters.filter(t => t.status === "pending_approval").length,
      active: transporters.filter(t => t.status === "active").length,
      suspended: transporters.filter(t => t.status === "suspended").length,
    };
  };

  const statusCounts = getStatusCounts();

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending_approval': return 'secondary';
      case 'pending_verification': return 'outline';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'pending_approval': return 'Pending Approval';
      case 'pending_verification': return 'Pending Verification';
      case 'suspended': return 'Suspended';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Transporters</h1>
            <p className="text-gray-500">Manage fleet owners and logistics companies ({transporters.length} total)</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" data-testid="button-export">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-transporter">
                  <Plus className="h-4 w-4 mr-2" /> Add Transporter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Transporter</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new transporter company.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      placeholder="ABC Logistics Pvt Ltd"
                      value={newTransporter.companyName}
                      onChange={(e) => setNewTransporter({...newTransporter, companyName: e.target.value})}
                      data-testid="input-add-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner-name">Owner Name *</Label>
                    <Input
                      id="owner-name"
                      placeholder="Rajesh Kumar"
                      value={newTransporter.ownerName}
                      onChange={(e) => setNewTransporter({...newTransporter, ownerName: e.target.value})}
                      data-testid="input-add-owner-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Number *</Label>
                      <Input
                        id="contact"
                        placeholder="9876543210"
                        value={newTransporter.contact}
                        onChange={(e) => setNewTransporter({...newTransporter, contact: e.target.value})}
                        data-testid="input-add-contact"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@company.com"
                        value={newTransporter.email}
                        onChange={(e) => setNewTransporter({...newTransporter, email: e.target.value})}
                        data-testid="input-add-email"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location/City *</Label>
                      <Input
                        id="location"
                        placeholder="Mumbai"
                        value={newTransporter.location}
                        onChange={(e) => setNewTransporter({...newTransporter, location: e.target.value})}
                        data-testid="input-add-location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fleet-size">Fleet Size</Label>
                      <Input
                        id="fleet-size"
                        type="number"
                        min="1"
                        placeholder="5"
                        value={newTransporter.fleetSize}
                        onChange={(e) => setNewTransporter({...newTransporter, fleetSize: e.target.value})}
                        data-testid="input-add-fleet-size"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTransporter} disabled={isSubmitting} data-testid="button-confirm-add">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Transporter"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
            data-testid="filter-all"
          >
            All ({statusCounts.all})
          </Button>
          <Button
            variant={statusFilter === "pending_verification" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending_verification")}
            className={statusFilter === "pending_verification" ? "" : "text-orange-600 border-orange-200 hover:bg-orange-50"}
            data-testid="filter-pending-verification"
          >
            <Clock className="h-4 w-4 mr-1" />
            Pending Verification ({statusCounts.pending_verification})
          </Button>
          <Button
            variant={statusFilter === "pending_approval" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("pending_approval")}
            className={statusFilter === "pending_approval" ? "" : "text-yellow-600 border-yellow-200 hover:bg-yellow-50"}
            data-testid="filter-pending-approval"
          >
            <AlertCircle className="h-4 w-4 mr-1" />
            Pending Approval ({statusCounts.pending_approval})
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className={statusFilter === "active" ? "" : "text-green-600 border-green-200 hover:bg-green-50"}
            data-testid="filter-active"
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Active ({statusCounts.active})
          </Button>
          <Button
            variant={statusFilter === "suspended" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("suspended")}
            className={statusFilter === "suspended" ? "" : "text-red-600 border-red-200 hover:bg-red-50"}
            data-testid="filter-suspended"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Suspended ({statusCounts.suspended})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 w-full max-w-md">
              <Search className="h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search company name, owner, or location..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredTransporters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? "No transporters match your search" : "No transporters found. Add your first transporter!"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Drivers</TableHead>
                    <TableHead>Vehicles</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransporters.map((t) => (
                    <TableRow key={t.id} data-testid={`row-transporter-${t.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-medium">{t.companyName}</span>
                            <p className="text-xs text-gray-500">{t.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{t.ownerName}</p>
                          <p className="text-xs text-gray-500">{t.contact}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          {t.location}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          {getTransporterDrivers(t.id).length}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Truck className="h-4 w-4 text-gray-400" />
                          {getTransporterVehicles(t.id).length}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-green-600 font-medium">
                          <IndianRupee className="h-3 w-3" />
                          {getTransporterEarnings(t.id).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={getStatusBadgeVariant(t.status)}>
                            {getStatusLabel(t.status)}
                          </Badge>
                          {t.isVerified && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                              <ShieldCheck className="h-3 w-3" />
                              Verified
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Verify button for pending_verification transporters */}
                          {t.status === 'pending_verification' && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleVerifyTransporter(t.id)}
                              disabled={verifyingId === t.id}
                              data-testid={`button-verify-${t.id}`}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {verifyingId === t.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <ShieldCheck className="h-4 w-4 mr-1" />
                                  Verify
                                </>
                              )}
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" data-testid={`button-actions-${t.id}`}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openTransporterDetails(t)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {t.status === 'pending_approval' && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'active')}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {t.status === 'active' && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'suspended')}>
                                  <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                  Suspend
                                </DropdownMenuItem>
                              )}
                              {t.status === 'suspended' && (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'active')}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Reactivate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-xl">{selectedTransporter?.companyName}</p>
                <p className="text-sm text-gray-500 font-normal">Transporter Details</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedTransporter && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="drivers">Drivers ({getTransporterDrivers(selectedTransporter.id).length})</TabsTrigger>
                <TabsTrigger value="vehicles">Vehicles ({getTransporterVehicles(selectedTransporter.id).length})</TabsTrigger>
                <TabsTrigger value="trips">Trips ({getTransporterRides(selectedTransporter.id).length})</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Owner Name</p>
                    <p className="font-medium">{selectedTransporter.ownerName}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="flex flex-col gap-1">
                      <Badge variant={getStatusBadgeVariant(selectedTransporter.status)}>
                        {getStatusLabel(selectedTransporter.status)}
                      </Badge>
                      {selectedTransporter.isVerified && (
                        <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> Contact</p>
                    <p className="font-medium">{selectedTransporter.contact}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                    <p className="font-medium">{selectedTransporter.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</p>
                    <p className="font-medium">{selectedTransporter.location}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Fleet Size</p>
                    <p className="font-medium">{selectedTransporter.fleetSize} Vehicles</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg col-span-2">
                    <p className="text-sm text-gray-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-green-600">₹{getTransporterEarnings(selectedTransporter.id).toLocaleString()}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                {loadingDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading documents...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Business Documents */}
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Business Documents
                      </h4>
                      {transporterDocs.length > 0 ? (
                        <div className="space-y-2">
                          {transporterDocs.map(doc => renderDocumentCard(doc))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 p-3 bg-gray-50 rounded-lg">No business documents uploaded</p>
                      )}
                    </div>

                    {/* Driver Documents */}
                    {getTransporterDrivers(selectedTransporter.id).length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Driver Documents
                        </h4>
                        <div className="space-y-4">
                          {getTransporterDrivers(selectedTransporter.id).map(driver => (
                            <div key={driver.id} className="border rounded-lg p-3">
                              <p className="font-medium text-sm mb-2">{driver.name}</p>
                              {driverDocs[driver.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  {driverDocs[driver.id].map(doc => renderDocumentCard(doc))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No documents uploaded</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vehicle Documents */}
                    {getTransporterVehicles(selectedTransporter.id).length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                          <Truck className="h-4 w-4" />
                          Vehicle Documents
                        </h4>
                        <div className="space-y-4">
                          {getTransporterVehicles(selectedTransporter.id).map(vehicle => (
                            <div key={vehicle.id} className="border rounded-lg p-3">
                              <p className="font-medium text-sm mb-2">{vehicle.plateNumber} - {vehicle.model}</p>
                              {vehicleDocs[vehicle.id]?.length > 0 ? (
                                <div className="space-y-2">
                                  {vehicleDocs[vehicle.id].map(doc => renderDocumentCard(doc))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">No documents uploaded</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="drivers" className="mt-4">
                {getTransporterDrivers(selectedTransporter.id).length > 0 ? (
                  <div className="space-y-3">
                    {getTransporterDrivers(selectedTransporter.id).map(driver => (
                      <div key={driver.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{driver.name}</p>
                            <p className="text-sm text-gray-500">{driver.phone}</p>
                          </div>
                        </div>
                        <Badge variant={driver.isOnline ? "default" : "secondary"}>
                          {driver.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No drivers registered under this transporter</p>
                )}
              </TabsContent>

              <TabsContent value="vehicles" className="mt-4">
                {getTransporterVehicles(selectedTransporter.id).length > 0 ? (
                  <div className="space-y-3">
                    {getTransporterVehicles(selectedTransporter.id).map(vehicle => (
                      <div key={vehicle.id} className="p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <Truck className="h-6 w-6 text-gray-400" />
                          <div>
                            <p className="font-medium">{vehicle.plateNumber}</p>
                            <p className="text-sm text-gray-500">{vehicle.model} • {vehicle.type} • {vehicle.capacity}</p>
                          </div>
                        </div>
                        <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                          {vehicle.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No vehicles registered under this transporter</p>
                )}
              </TabsContent>

              <TabsContent value="trips" className="mt-4">
                {getTransporterRides(selectedTransporter.id).length > 0 ? (
                  <div className="space-y-3">
                    {getTransporterRides(selectedTransporter.id).map(ride => (
                      <div key={ride.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm text-gray-500">#{ride.id.slice(0, 8)}</p>
                          <Badge variant={ride.status === "completed" ? "default" : "secondary"}>
                            {ride.status}
                          </Badge>
                        </div>
                        <p className="font-medium">{ride.pickupLocation?.split(',')[0]} → {ride.dropLocation?.split(',')[0]}</p>
                        <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
                          <span>{ride.date} • {ride.cargoType}</span>
                          <span className="text-green-600 font-medium">₹{parseFloat(ride.price || "0").toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-gray-500">No trips assigned to this transporter</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
