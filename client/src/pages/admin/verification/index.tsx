import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { VerificationTimeline, type VerificationLogEntry } from "@/components/admin/verification-timeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Search, Building2, CheckCircle, XCircle, Loader2, Eye, Clock, 
  FileText, RefreshCw, ChevronDown, ChevronRight, Truck, Users, 
  AlertTriangle, Shield, Car, User
} from "lucide-react";
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

// Required documents by entity type
const REQUIRED_VEHICLE_DOCS = ["rc"] as const;
const OPTIONAL_VEHICLE_DOCS = ["insurance", "permit", "fitness", "pollution"] as const;
const REQUIRED_DRIVER_DOCS = ["license"] as const;
const OPTIONAL_DRIVER_DOCS = ["aadhar", "pan", "photo"] as const;
const REQUIRED_TRANSPORTER_DOCS = ["gst_certificate", "business_registration"] as const;

const DOC_TYPE_LABELS: Record<string, string> = {
  rc: "Registration Certificate (RC)",
  insurance: "Insurance",
  permit: "Permit",
  fitness: "Fitness Certificate",
  pollution: "Pollution Certificate",
  license: "Driving License",
  aadhar: "Aadhar Card",
  pan: "PAN Card",
  photo: "Photo",
  gst_certificate: "GST Certificate",
  business_registration: "Business Registration",
  trade_license: "Trade License",
  bank_details: "Bank Details",
  company_pan: "Company PAN",
  address_proof: "Address Proof",
};

interface VehicleWithDocs {
  id: string;
  plateNumber: string;
  type: string;
  model: string;
  status: string;
  createdAt: string;
  documents: Document[];
  pendingDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
}

interface DriverWithDocs {
  id: string;
  name: string;
  phone: string;
  isSelfDriver: boolean;
  documentsComplete: boolean;
  createdAt: string;
  documents: Document[];
  pendingDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
}

interface TransporterTree {
  id: string;
  companyName: string;
  ownerName: string;
  contact: string;
  email: string;
  status: string;
  verificationStatus: string;
  documentsComplete: boolean;
  createdAt: string;
  documents: Document[];
  pendingDocuments: number;
  verifiedDocuments: number;
  rejectedDocuments: number;
  vehicles: VehicleWithDocs[];
  drivers: DriverWithDocs[];
  totalPendingAcrossAll: number;
  totalVehicles: number;
  totalDrivers: number;
  activeVehicles: number;
}

export default function VerificationOverview() {
  const [transporters, setTransporters] = useState<TransporterTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTransporters, setExpandedTransporters] = useState<Set<string>>(new Set());
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set());
  const [expandedDrivers, setExpandedDrivers] = useState<Set<string>>(new Set());
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvingTransporterId, setApprovingTransporterId] = useState<string | null>(null);
  const [rejectingTransporterId, setRejectingTransporterId] = useState<string | null>(null);
  const [transporterRejectionReason, setTransporterRejectionReason] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [timelineLogs, setTimelineLogs] = useState<Record<string, VerificationLogEntry[]>>({});
  const [timelineLoading, setTimelineLoading] = useState<Record<string, boolean>>({});
  const [timelineErrors, setTimelineErrors] = useState<Record<string, string | null>>({});
  const { isReady, isChecking } = useAdminSessionGate();

  const handlePreviewDocument = async (doc: Document) => {
    setLoadingPreview(true);
    try {
      const storagePath = doc.url;
      if (!storagePath) {
        toast.error("Document URL not available");
        return;
      }
      
      // If already a full URL (e.g., legacy documents), use directly
      if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
        setPreviewUrl(storagePath);
        return;
      }
      
      const response = await fetch(`${API_BASE}/spaces/signed-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: storagePath })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get document URL");
      }
      
      const data = await response.json();
      setPreviewUrl(data.signedUrl);
    } catch (error: any) {
      console.error("Preview error:", error);
      toast.error(error.message || "Failed to preview document");
    } finally {
      setLoadingPreview(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/admin/verification/overview`, { credentials: "include" });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch");
      }
      const data = await response.json();
      setTransporters(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Fetch error:", error);
      toast.error(error.message || "Failed to fetch verification data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [isReady, fetchData]);

  const loadTransporterTimeline = async (transporterId: string, force = false) => {
    if (!force && (timelineLogs[transporterId] || timelineLoading[transporterId])) {
      return;
    }

    setTimelineLoading((prev) => ({ ...prev, [transporterId]: true }));
    setTimelineErrors((prev) => ({ ...prev, [transporterId]: null }));

    try {
      const response = await fetch(`${API_BASE}/admin/verification/logs/transporter/${transporterId}`, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error((payload as any)?.error || "Failed to load verification timeline");
      }

      setTimelineLogs((prev) => ({ ...prev, [transporterId]: Array.isArray(payload) ? payload : [] }));
    } catch (error: any) {
      console.error("Timeline fetch error:", error);
      setTimelineErrors((prev) => ({ ...prev, [transporterId]: error.message || "Failed to load verification timeline" }));
      toast.error(error.message || "Failed to load verification timeline");
    } finally {
      setTimelineLoading((prev) => {
        const next = { ...prev };
        delete next[transporterId];
        return next;
      });
    }
  };

  const toggleTransporter = (id: string) => {
    setExpandedTransporters(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        void loadTransporterTimeline(id);
      }
      return next;
    });
  };

  const toggleVehicleSection = (transporterId: string) => {
    setExpandedVehicles(prev => {
      const next = new Set(prev);
      if (next.has(transporterId)) next.delete(transporterId);
      else next.add(transporterId);
      return next;
    });
  };

  const toggleDriverSection = (transporterId: string) => {
    setExpandedDrivers(prev => {
      const next = new Set(prev);
      if (next.has(transporterId)) next.delete(transporterId);
      else next.add(transporterId);
      return next;
    });
  };

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

  const handleApproveTransporter = async (id: string) => {
    setApprovingTransporterId(id);
    try {
      const response = await fetch(`${API_BASE}/transporters/${id}/approve`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to approve");
      toast.success("Transporter approved");
      await fetchData();
      await loadTransporterTimeline(id, true);
    } catch (error) {
      toast.error("Failed to approve transporter");
    } finally {
      setApprovingTransporterId(null);
    }
  };

  const handleRejectTransporter = async () => {
    if (!rejectingTransporterId || !transporterRejectionReason.trim()) return;
    const transporterId = rejectingTransporterId;
    try {
      const response = await fetch(`${API_BASE}/transporters/${transporterId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: transporterRejectionReason.trim() })
      });
      if (!response.ok) throw new Error("Failed to reject");
      toast.success("Transporter rejected");
      setRejectingTransporterId(null);
      setTransporterRejectionReason("");
      await fetchData();
      await loadTransporterTimeline(transporterId, true);
    } catch (error) {
      toast.error("Failed to reject transporter");
    }
  };

  const filteredTransporters = transporters.filter(t =>
    t.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.contact?.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; label: string }> = {
      active: { color: "bg-green-100 text-green-800", label: "Active" },
      pending_verification: { color: "bg-yellow-100 text-yellow-800", label: "Pending Verification" },
      pending_approval: { color: "bg-blue-100 text-blue-800", label: "Pending Approval" },
      rejected: { color: "bg-red-100 text-red-800", label: "Rejected" },
      suspended: { color: "bg-gray-100 text-gray-800", label: "Suspended" },
    };
    const v = variants[status] || { color: "bg-gray-100 text-gray-800", label: status };
    return <Badge className={v.color}>{v.label}</Badge>;
  };

  // Group documents by type
  const groupDocumentsByType = (documents: Document[]) => {
    const grouped: Record<string, Document[]> = {};
    documents.forEach(doc => {
      const type = doc.type || "other";
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(doc);
    });
    return grouped;
  };

  // Check if required documents are present and verified
  const checkRequiredDocs = (documents: Document[], requiredTypes: readonly string[]) => {
    const missing: string[] = [];
    const pending: string[] = [];
    const verified: string[] = [];
    
    requiredTypes.forEach(type => {
      const docs = documents.filter(d => d.type === type);
      if (docs.length === 0) {
        missing.push(type);
      } else if (docs.some(d => d.status === "verified")) {
        verified.push(type);
      } else if (docs.some(d => d.status === "pending")) {
        pending.push(type);
      } else {
        missing.push(type); // All rejected
      }
    });
    
    return { missing, pending, verified, allVerified: missing.length === 0 && pending.length === 0 };
  };

  const DocumentRow = ({ doc, onApprove, onReject, onPreview }: { 
    doc: Document; 
    onApprove: () => void; 
    onReject: () => void;
    onPreview: () => void;
  }) => (
    <div className="flex items-center justify-between py-2 px-3 bg-white border rounded-md" data-testid={`doc-row-${doc.id}`}>
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-500" />
        <span className="text-sm">{doc.documentName || DOC_TYPE_LABELS[doc.type] || doc.type}</span>
        {doc.status === "pending" && <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">Pending Review</Badge>}
        {doc.status === "verified" && <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">Verified</Badge>}
        {doc.status === "rejected" && (
          <Badge variant="outline" className="bg-red-50 text-red-700 text-xs" title={doc.rejectionReason}>
            Rejected
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onPreview} data-testid={`preview-doc-${doc.id}`}>
          <Eye className="h-4 w-4" />
        </Button>
        {doc.status === "pending" && (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-green-600 hover:bg-green-50"
              onClick={onApprove}
              disabled={processingDocId === doc.id}
              data-testid={`approve-doc-${doc.id}`}
            >
              {processingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-red-600 hover:bg-red-50"
              onClick={onReject}
              data-testid={`reject-doc-${doc.id}`}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // Document Type Section - groups documents by type with required indicator
  const DocumentTypeSection = ({ 
    documents, 
    requiredTypes, 
    optionalTypes,
    entityLabel 
  }: { 
    documents: Document[]; 
    requiredTypes: readonly string[];
    optionalTypes: readonly string[];
    entityLabel: string;
  }) => {
    const grouped = groupDocumentsByType(documents);
    const reqStatus = checkRequiredDocs(documents, requiredTypes);
    
    return (
      <div className="space-y-3">
        {/* Required Documents Status */}
        {requiredTypes.length > 0 && (
          <div className={`p-2 rounded-md text-sm ${reqStatus.allVerified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            {reqStatus.allVerified ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>All required documents verified</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  Required: {requiredTypes.map(t => DOC_TYPE_LABELS[t] || t).join(", ")}
                  {reqStatus.missing.length > 0 && ` (Missing: ${reqStatus.missing.map(t => DOC_TYPE_LABELS[t] || t).join(", ")})`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Required Document Types */}
        {requiredTypes.map(docType => {
          const docs = grouped[docType] || [];
          const isRequired = true;
          
          return (
            <div key={docType} className="border-l-4 border-red-400 pl-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{DOC_TYPE_LABELS[docType] || docType}</span>
                <Badge variant="destructive" className="text-xs">Required</Badge>
                {docs.length === 0 && (
                  <Badge variant="outline" className="bg-gray-100 text-gray-600 text-xs">Not Uploaded</Badge>
                )}
              </div>
              <div className="space-y-1">
                {docs.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onApprove={() => handleApproveDocument(doc.id)}
                    onReject={() => setRejectingDocId(doc.id)}
                    onPreview={() => handlePreviewDocument(doc)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Optional Document Types */}
        {optionalTypes.map(docType => {
          const docs = grouped[docType] || [];
          if (docs.length === 0) return null;
          
          return (
            <div key={docType} className="border-l-4 border-blue-300 pl-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{DOC_TYPE_LABELS[docType] || docType}</span>
                <Badge variant="outline" className="text-xs">Optional</Badge>
              </div>
              <div className="space-y-1">
                {docs.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onApprove={() => handleApproveDocument(doc.id)}
                    onReject={() => setRejectingDocId(doc.id)}
                    onPreview={() => handlePreviewDocument(doc)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* Other Documents (not in required or optional lists) */}
        {Object.entries(grouped)
          .filter(([type]) => ![...requiredTypes, ...optionalTypes].includes(type))
          .map(([docType, docs]) => (
            <div key={docType} className="border-l-4 border-gray-300 pl-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-sm">{DOC_TYPE_LABELS[docType] || docType}</span>
              </div>
              <div className="space-y-1">
                {docs.map(doc => (
                  <DocumentRow
                    key={doc.id}
                    doc={doc}
                    onApprove={() => handleApproveDocument(doc.id)}
                    onReject={() => setRejectingDocId(doc.id)}
                    onPreview={() => handlePreviewDocument(doc)}
                  />
                ))}
              </div>
            </div>
          ))
        }
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <AdminSidebar />
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">Verification Center</h1>
            </div>
            <Button variant="outline" onClick={fetchData} disabled={loading || isChecking} data-testid="button-refresh">
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isChecking) ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search transporters..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>

        {(loading || isChecking) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : filteredTransporters.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No transporters found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTransporters.map((transporter) => (
              <Card key={transporter.id} className="overflow-hidden" data-testid={`transporter-card-${transporter.id}`}>
                <Collapsible open={expandedTransporters.has(transporter.id)} onOpenChange={() => toggleTransporter(transporter.id)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {expandedTransporters.has(transporter.id) ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          )}
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{transporter.companyName}</CardTitle>
                            <p className="text-sm text-gray-500">{transporter.ownerName} • {transporter.contact}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {transporter.totalPendingAcrossAll > 0 && (
                            <Badge variant="destructive" className="animate-pulse">
                              {transporter.totalPendingAcrossAll} pending
                            </Badge>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Truck className="h-4 w-4" />
                            <span>{transporter.totalVehicles}</span>
                            <Users className="h-4 w-4 ml-2" />
                            <span>{transporter.totalDrivers}</span>
                          </div>
                          {getStatusBadge(transporter.status)}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <CardContent className="border-t pt-4">
                      <div className="space-y-6">
                        {/* Transporter Actions */}
                        {(transporter.status === "pending_approval" || transporter.status === "pending_verification") && (
                          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-blue-600" />
                            <span className="text-sm text-blue-800">Transporter needs approval</span>
                            <div className="ml-auto flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveTransporter(transporter.id)}
                                disabled={approvingTransporterId === transporter.id}
                                data-testid={`approve-transporter-${transporter.id}`}
                              >
                                {approvingTransporterId === transporter.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectingTransporterId(transporter.id)}
                                data-testid={`reject-transporter-${transporter.id}`}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Transporter Business Documents */}
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Business Documents
                            {transporter.pendingDocuments > 0 && (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                                {transporter.pendingDocuments} pending
                              </Badge>
                            )}
                          </h4>
                          <DocumentTypeSection
                            documents={transporter.documents}
                            requiredTypes={REQUIRED_TRANSPORTER_DOCS}
                            optionalTypes={["trade_license", "bank_details", "company_pan", "address_proof"] as const}
                            entityLabel="Transporter"
                          />
                        </div>

                        {/* Verification Timeline */}
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Verification Timeline
                            </h4>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => loadTransporterTimeline(transporter.id, true)}
                              disabled={!!timelineLoading[transporter.id]}
                            >
                              <RefreshCw className={`h-4 w-4 mr-2 ${timelineLoading[transporter.id] ? "animate-spin" : ""}`} />
                              Refresh timeline
                            </Button>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {timelineErrors[transporter.id] && (
                              <p className="text-xs text-red-600 mb-2">
                                {timelineErrors[transporter.id]}
                              </p>
                            )}
                            <VerificationTimeline
                              logs={timelineLogs[transporter.id]}
                              loading={!!timelineLoading[transporter.id]}
                              emptyMessage={timelineErrors[transporter.id] || "No verification history yet."}
                            />
                          </div>
                        </div>

                        {/* Vehicles Branch */}
                        <Collapsible open={expandedVehicles.has(transporter.id)} onOpenChange={() => toggleVehicleSection(transporter.id)}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                              <div className="flex items-center gap-3">
                                {expandedVehicles.has(transporter.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <Car className="h-5 w-5 text-purple-600" />
                                <span className="font-medium">Vehicles ({transporter.totalVehicles})</span>
                                {transporter.vehicles.reduce((sum, v) => sum + v.pendingDocuments, 0) > 0 && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                    {transporter.vehicles.reduce((sum, v) => sum + v.pendingDocuments, 0)} pending docs
                                  </Badge>
                                )}
                              </div>
                              <Badge variant="outline">{transporter.activeVehicles} active</Badge>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-8 mt-2 space-y-3">
                              {transporter.vehicles.length === 0 ? (
                                <p className="text-sm text-gray-500 py-2">No vehicles added</p>
                              ) : (
                                transporter.vehicles.map(vehicle => (
                                  <div key={vehicle.id} className="border rounded-lg p-4" data-testid={`vehicle-card-${vehicle.id}`}>
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <Truck className="h-5 w-5 text-purple-600" />
                                        <span className="font-semibold">{vehicle.plateNumber}</span>
                                        <span className="text-sm text-gray-500">{vehicle.type} • {vehicle.model}</span>
                                      </div>
                                      <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                                        {vehicle.status}
                                      </Badge>
                                    </div>
                                    <DocumentTypeSection
                                      documents={vehicle.documents}
                                      requiredTypes={REQUIRED_VEHICLE_DOCS}
                                      optionalTypes={OPTIONAL_VEHICLE_DOCS}
                                      entityLabel="Vehicle"
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Drivers Branch */}
                        <Collapsible open={expandedDrivers.has(transporter.id)} onOpenChange={() => toggleDriverSection(transporter.id)}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
                              <div className="flex items-center gap-3">
                                {expandedDrivers.has(transporter.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                <User className="h-5 w-5 text-green-600" />
                                <span className="font-medium">Drivers ({transporter.totalDrivers})</span>
                                {transporter.drivers.reduce((sum, d) => sum + d.pendingDocuments, 0) > 0 && (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                                    {transporter.drivers.reduce((sum, d) => sum + d.pendingDocuments, 0)} pending docs
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-8 mt-2 space-y-3">
                              {transporter.drivers.length === 0 ? (
                                <p className="text-sm text-gray-500 py-2">No drivers added</p>
                              ) : (
                                transporter.drivers.map(driver => (
                                  <div key={driver.id} className="border rounded-lg p-4" data-testid={`driver-card-${driver.id}`}>
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-2">
                                        <User className="h-5 w-5 text-green-600" />
                                        <span className="font-semibold">{driver.name}</span>
                                        <span className="text-sm text-gray-500">{driver.phone}</span>
                                        {driver.isSelfDriver && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Self-Driver</Badge>}
                                      </div>
                                      <Badge variant={driver.documentsComplete ? "default" : "secondary"}>
                                        {driver.documentsComplete ? "Docs Complete" : "Docs Pending"}
                                      </Badge>
                                    </div>
                                    <DocumentTypeSection
                                      documents={driver.documents}
                                      requiredTypes={REQUIRED_DRIVER_DOCS}
                                      optionalTypes={OPTIONAL_DRIVER_DOCS}
                                      entityLabel="Driver"
                                    />
                                  </div>
                                ))
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex items-center justify-center">
              <img src={previewUrl} alt="Document" className="max-w-full max-h-[70vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Document Dialog */}
      <Dialog open={!!rejectingDocId} onOpenChange={() => { setRejectingDocId(null); setRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Document</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this document.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            data-testid="input-rejection-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingDocId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectDocument} disabled={!rejectionReason.trim()}>
              Reject Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Transporter Dialog */}
      <Dialog open={!!rejectingTransporterId} onOpenChange={() => { setRejectingTransporterId(null); setTransporterRejectionReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transporter</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this transporter.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={transporterRejectionReason}
            onChange={(e) => setTransporterRejectionReason(e.target.value)}
            data-testid="input-transporter-rejection-reason"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingTransporterId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRejectTransporter} disabled={!transporterRejectionReason.trim()}>
              Reject Transporter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
