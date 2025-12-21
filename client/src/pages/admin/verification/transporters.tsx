import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Building2, CheckCircle, XCircle, Loader2, Eye, Clock, FileText, RefreshCw, ExternalLink, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

interface Document {
  id: string;
  type: string;
  documentName: string;
  url: string;
  status: string;
  rejectionReason?: string;
  createdAt: string;
}

interface TransporterVerification {
  id: string;
  companyName: string;
  ownerName: string;
  contact: string;
  email: string;
  status: string;
  isVerified: boolean;
  documentsComplete: boolean;
  createdAt: string;
  totalDocuments: number;
  pendingDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
  oldestPendingDocumentAge: number | null;
  documents: Document[];
}

export default function VerificationTransporters() {
  const [transporters, setTransporters] = useState<TransporterVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransporter, setSelectedTransporter] = useState<TransporterVerification | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvingTransporterId, setApprovingTransporterId] = useState<string | null>(null);
  const [rejectingTransporterId, setRejectingTransporterId] = useState<string | null>(null);
  const [transporterRejectionReason, setTransporterRejectionReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/verification/transporters`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTransporters(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error("Failed to fetch transporters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      if (selectedTransporter) {
        const updated = transporters.find(t => t.id === selectedTransporter.id);
        if (updated) setSelectedTransporter(updated);
      }
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

  const handleApproveTransporter = async (id: string) => {
    setApprovingTransporterId(id);
    try {
      const response = await fetch(`${API_BASE}/transporters/${id}/approve`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to approve");
      toast.success("Transporter approved");
      fetchData();
      setShowReviewDialog(false);
    } catch (error) {
      toast.error("Failed to approve transporter");
    } finally {
      setApprovingTransporterId(null);
    }
  };

  const handleRejectTransporter = async () => {
    if (!rejectingTransporterId || !transporterRejectionReason.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/transporters/${rejectingTransporterId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: transporterRejectionReason.trim() })
      });
      if (!response.ok) throw new Error("Failed to reject");
      toast.success("Transporter rejected");
      setRejectingTransporterId(null);
      setTransporterRejectionReason("");
      fetchData();
      setShowReviewDialog(false);
    } catch (error) {
      toast.error("Failed to reject transporter");
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-green-500">Active</Badge>;
      case "pending_verification": return <Badge className="bg-yellow-500">Pending Verification</Badge>;
      case "pending_approval": return <Badge className="bg-blue-500">Pending Approval</Badge>;
      case "rejected": return <Badge className="bg-red-500">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTransporters = transporters.filter(t =>
    t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.contact.includes(searchTerm)
  );

  const pendingCount = transporters.filter(t => t.pendingDocuments > 0).length;

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <AdminSidebar />
      <main className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Transporter Verification</h1>
              <p className="text-gray-500">Review and verify transporter documents</p>
            </div>
            <Button onClick={fetchData} variant="outline" size="sm" data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{transporters.length}</div>
                <div className="text-sm text-gray-500">Total Transporters</div>
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
                  {transporters.filter(t => t.status === "active").length}
                </div>
                <div className="text-sm text-gray-500">Active</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {transporters.filter(t => t.status === "rejected").length}
                </div>
                <div className="text-sm text-gray-500">Rejected</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by company, owner, or phone..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Pending Age</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransporters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No transporters found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransporters.map((transporter) => (
                        <TableRow key={transporter.id} data-testid={`row-transporter-${transporter.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <div>
                                <div className="font-medium">{transporter.companyName}</div>
                                <div className="text-sm text-gray-500">{transporter.contact}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{transporter.ownerName}</TableCell>
                          <TableCell>{getStatusBadge(transporter.status)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {transporter.pendingDocuments > 0 && (
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                  {transporter.pendingDocuments} pending
                                </Badge>
                              )}
                              {transporter.verifiedDocuments > 0 && (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  {transporter.verifiedDocuments} verified
                                </Badge>
                              )}
                              {transporter.rejectedDocuments > 0 && (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  {transporter.rejectedDocuments} rejected
                                </Badge>
                              )}
                              {transporter.totalDocuments === 0 && (
                                <span className="text-gray-400">No documents</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {transporter.oldestPendingDocumentAge !== null ? (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <Clock className="h-4 w-4" />
                                {transporter.oldestPendingDocumentAge}d
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
                                setSelectedTransporter(transporter);
                                setShowReviewDialog(true);
                              }}
                              data-testid={`button-review-${transporter.id}`}
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
                <Building2 className="h-5 w-5" />
                {selectedTransporter?.companyName}
              </DialogTitle>
              <DialogDescription>
                Owner: {selectedTransporter?.ownerName} | Phone: {selectedTransporter?.contact}
              </DialogDescription>
            </DialogHeader>

            {selectedTransporter && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusBadge(selectedTransporter.status)}
                    {selectedTransporter.documentsComplete ? (
                      <Badge className="bg-green-100 text-green-700">Documents Complete</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700">Documents Incomplete</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedTransporter.status !== "active" && (
                      <Button
                        onClick={() => handleApproveTransporter(selectedTransporter.id)}
                        disabled={approvingTransporterId === selectedTransporter.id}
                        className="bg-green-600 hover:bg-green-700"
                        data-testid="button-approve-transporter"
                      >
                        {approvingTransporterId === selectedTransporter.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve Transporter
                      </Button>
                    )}
                    {selectedTransporter.status !== "rejected" && (
                      <Button
                        variant="destructive"
                        onClick={() => setRejectingTransporterId(selectedTransporter.id)}
                        data-testid="button-reject-transporter"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documents ({selectedTransporter.documents.length})
                  </h3>
                  {selectedTransporter.documents.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
                      No documents uploaded yet
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedTransporter.documents.map((doc) => (
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

        <Dialog open={!!rejectingTransporterId} onOpenChange={() => setRejectingTransporterId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Transporter</DialogTitle>
              <DialogDescription>Please provide a reason for rejection.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason</Label>
                <Textarea
                  value={transporterRejectionReason}
                  onChange={(e) => setTransporterRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  data-testid="input-transporter-rejection-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectingTransporterId(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleRejectTransporter}
                disabled={!transporterRejectionReason.trim()}
                data-testid="button-confirm-reject-transporter"
              >
                Reject Transporter
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
              <Button variant="outline" onClick={() => window.open(previewUrl!, "_blank")}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
