import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Truck, CheckCircle, XCircle, Loader2, Eye, Clock, FileText, RefreshCw, ExternalLink, AlertTriangle, Building2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import { useAdminSessionGate } from "@/hooks/useAdminSession";

interface Document {
  id: string;
  type: string;
  documentName: string;
  url: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

interface VehicleVerification {
  id: string;
  plateNumber: string;
  type: string;
  model: string;
  capacity: string;
  status: string;
  transporterId: string | null;
  transporterName: string | null;
  createdAt: string;
  totalDocuments: number;
  pendingDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
  oldestPendingDocumentAge: number | null;
  documents: Document[];
}

export default function VerificationVehicles() {
  const [vehicles, setVehicles] = useState<VehicleVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleVerification | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { isReady, isChecking } = useAdminSessionGate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/verification/vehicles`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setVehicles(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [isReady, fetchData]);

  const handleApproveDocument = async (docId: string) => {
    setProcessingDocId(docId);
    try {
      const response = await fetch(`${API_BASE}/documents/${docId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "verified" })
      });
      if (!response.ok) throw new Error("Failed to approve");
      toast.success("Document approved");
      fetchData();
    } catch (error) {
      toast.error("Failed to approve document");
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleRejectDocument = async () => {
    if (!rejectingDocId || !rejectionReason.trim()) return;
    setProcessingDocId(rejectingDocId);
    try {
      const response = await fetch(`${API_BASE}/documents/${rejectingDocId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "rejected", rejectionReason: rejectionReason.trim() })
      });
      if (!response.ok) throw new Error("Failed to reject");
      toast.success("Document rejected");
      setRejectingDocId(null);
      setRejectionReason("");
      fetchData();
    } catch (error) {
      toast.error("Failed to reject document");
    } finally {
      setProcessingDocId(null);
    }
  };

  const getDocumentPreviewUrl = async (url: string) => {
    if (url.startsWith("http")) {
      setPreviewUrl(url);
      return;
    }
    try {
      const response = await fetch(`${API_BASE}/spaces/signed-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: url })
      });
      const data = await response.json();
      setPreviewUrl(data.signedUrl || data.url || url);
    } catch {
      toast.error("Failed to load document preview");
    }
  };

  const getVehicleStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Active</Badge>;
      case "inactive": return <Badge className="bg-gray-500">Inactive</Badge>;
      case "maintenance": return <Badge className="bg-yellow-500">Maintenance</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.transporterName && v.transporterName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pendingCount = vehicles.filter(v => v.pendingDocuments > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <AdminSidebar />
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Vehicle Verification</h1>
              <p className="text-gray-500">Review and verify vehicle documents</p>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" data-testid="button-refresh" disabled={loading || isChecking}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{vehicles.length}</div>
                <div className="text-sm text-gray-500">Total Vehicles</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                <div className="text-sm text-gray-500">Need Review</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {vehicles.filter(v => v.status === "active").length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-gray-600">
                  {vehicles.filter(v => v.totalDocuments === 0).length}
                </div>
                <div className="text-sm text-gray-500">No Documents</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by plate, type, model, or transporter..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(loading || isChecking) ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Transporter</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Pending Age</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No vehicles found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVehicles.map((vehicle) => (
                        <TableRow key={vehicle.id} data-testid={`row-vehicle-${vehicle.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{vehicle.plateNumber}</div>
                                <div className="text-sm text-gray-500">{vehicle.type} - {vehicle.model}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {vehicle.transporterName ? (
                              <div className="flex items-center gap-1">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                {vehicle.transporterName}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getVehicleStatusBadge(vehicle.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {vehicle.pendingDocuments > 0 && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                  {vehicle.pendingDocuments} pending
                                </Badge>
                              )}
                              {vehicle.verifiedDocuments > 0 && (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  {vehicle.verifiedDocuments} verified
                                </Badge>
                              )}
                              {vehicle.totalDocuments === 0 && (
                                <span className="text-gray-400">No documents</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {vehicle.oldestPendingDocumentAge !== null ? (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <Clock className="h-4 w-4" />
                                {vehicle.oldestPendingDocumentAge}d
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedVehicle(vehicle);
                                setShowReviewDialog(true);
                              }}
                              data-testid={`button-review-${vehicle.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {selectedVehicle?.plateNumber}
              </DialogTitle>
              <DialogDescription>
                {selectedVehicle?.type} - {selectedVehicle?.model} | Capacity: {selectedVehicle?.capacity}
                {selectedVehicle?.transporterName && ` | Transporter: ${selectedVehicle.transporterName}`}
              </DialogDescription>
            </DialogHeader>

            {selectedVehicle && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  {getVehicleStatusBadge(selectedVehicle.status)}
                  {selectedVehicle.verifiedDocuments === selectedVehicle.totalDocuments && selectedVehicle.totalDocuments > 0 ? (
                    <Badge className="bg-green-100 text-green-700">All Documents Verified</Badge>
                  ) : selectedVehicle.pendingDocuments > 0 ? (
                    <Badge className="bg-yellow-100 text-yellow-700">{selectedVehicle.pendingDocuments} Pending</Badge>
                  ) : null}
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents ({selectedVehicle.documents.length})
                  </h3>
                  {selectedVehicle.documents.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      No documents uploaded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedVehicle.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                          data-testid={`doc-${doc.id}`}
                        >
                          <div className="flex items-center gap-4">
                            <FileText className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium">{doc.documentName || doc.type}</div>
                              <div className="text-sm text-gray-500">
                                Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                              {doc.rejectionReason && (
                                <div className="text-sm text-red-500">
                                  Rejected: {doc.rejectionReason}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={
                                doc.status === "verified"
                                  ? "bg-green-100 text-green-700"
                                  : doc.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }
                            >
                              {doc.status}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => getDocumentPreviewUrl(doc.url)}
                              data-testid={`button-preview-${doc.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            {doc.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApproveDocument(doc.id)}
                                  disabled={processingDocId === doc.id}
                                  data-testid={`button-approve-doc-${doc.id}`}
                                >
                                  {processingDocId === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setRejectingDocId(doc.id)}
                                  data-testid={`button-reject-doc-${doc.id}`}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={!!rejectingDocId} onOpenChange={() => setRejectingDocId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Document</DialogTitle>
              <DialogDescription>Please provide a reason for rejection.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  data-testid="input-rejection-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingDocId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleRejectDocument}
                disabled={!rejectionReason.trim()}
                data-testid="button-confirm-reject"
              >
                Reject Document
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Document Preview</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              {previewUrl && (
                previewUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <img src={previewUrl} alt="Document" className="max-w-full max-h-[70vh] object-contain" />
                ) : (
                  <iframe src={previewUrl} className="w-full h-[70vh]" title="Document Preview" />
                )
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewUrl(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
