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
import { API_BASE, withCsrfHeader } from "@/lib/api";
import { useAdminSessionGate } from "@/hooks/useAdminSession";
import { motion, AnimatePresence } from "framer-motion";

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
  transporterType?: "business" | "individual";
  businessDocumentsStatus?: string;
  readiness?: {
    businessDocsVerified: boolean;
    hasMinimumVehicles: boolean;
    hasMinimumDrivers: boolean;
    allVehiclesReady: boolean;
    allDriversReady: boolean;
    isReadyForApproval: boolean;
  };
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
        headers: withCsrfHeader({ "Content-Type": "application/json" }),
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
        headers: withCsrfHeader({ "Content-Type": "application/json" }),
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
        headers: withCsrfHeader({ "Content-Type": "application/json" }),
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
        headers: withCsrfHeader(),
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
        headers: withCsrfHeader({ "Content-Type": "application/json" }),
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
      active: { color: "bg-green-50 text-green-700 border-green-100", label: "PLATFORM ACTIVE" },
      pending_verification: { color: "bg-amber-50 text-amber-700 border-amber-100", label: "AUDIT IN PROGRESS" },
      pending_approval: { color: "bg-blue-50 text-blue-700 border-blue-100", label: "READY FOR APPROVAL" },
      rejected: { color: "bg-red-50 text-red-700 border-red-100", label: "PLATFORM REJECTED" },
      suspended: { color: "bg-gray-100 text-gray-800 border-gray-200", label: "SUSPENDED" },
    };
    const v = variants[status] || { color: "bg-gray-100 text-gray-800", label: status.toUpperCase() };
    return <Badge className={`rounded-full px-3 py-1 font-black text-[10px] border tracking-wider ${v.color}`}>{v.label}</Badge>;
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
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.01 }}
      className="flex items-center justify-between py-3 px-4 bg-white border border-gray-100/50 rounded-xl shadow-sm hover:shadow-md transition-all group mb-2 last:mb-0"
      data-testid={`doc-row-${doc.id}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-2 rounded-lg ${doc.status === 'verified' ? 'bg-green-100/30 text-green-600' : 'bg-gray-100/50 text-gray-500'}`}>
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <span className="text-sm font-bold text-gray-800 block mb-0.5">
            {doc.documentName || DOC_TYPE_LABELS[doc.type] || doc.type}
          </span>
          <div className="flex items-center gap-2">
            {doc.status === "pending" && (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-600 tracking-wider">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                Audit Required
              </span>
            )}
            {doc.status === "verified" && (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-green-600 tracking-wider">
                <CheckCircle className="h-3 w-3" />
                Verified
              </span>
            )}
            {doc.status === "rejected" && (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-red-600 tracking-wider" title={doc.rejectionReason}>
                <XCircle className="h-3 w-3" />
                Rejected
              </span>
            )}
            <span className="text-[10px] text-gray-400 font-medium tracking-tight">
              Added {new Date(doc.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={onPreview}
          className="h-9 w-9 p-0 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
          data-testid={`preview-doc-${doc.id}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {doc.status === "pending" && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-green-200 text-green-600 hover:bg-green-600 hover:text-white transition-all font-bold px-3"
              onClick={onApprove}
              disabled={processingDocId === doc.id}
              data-testid={`approve-doc-${doc.id}`}
            >
              {processingDocId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1.5" />}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-9 p-0 rounded-xl border-red-100 text-red-500 hover:bg-red-50 transition-all"
              onClick={onReject}
              data-testid={`reject-doc-${doc.id}`}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </motion.div>
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

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-200">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                Verification Center
              </h1>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">v2.0 Premium Audit</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading || isChecking}
              className="rounded-full px-5 border-gray-200 hover:bg-gray-50 hover:border-blue-300 transition-all active:scale-95"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${(loading || isChecking) ? "animate-spin" : ""}`} />
              Sync Data
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Premium Hero Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="relative group overflow-hidden p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Building2 className="h-16 w-16 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Total Transporters</p>
            <h3 className="text-3xl font-black text-gray-900">{transporters.length}</h3>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Clock className="h-16 w-16 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Awaiting Review</p>
            <h3 className="text-3xl font-black text-amber-600">
              {transporters.filter(t => t.status === 'pending_verification' || t.status === 'pending_approval').length}
            </h3>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${(transporters.filter(t => t.status === 'pending_verification' || t.status === 'pending_approval').length / transporters.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle className="h-16 w-16 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Fully Verified</p>
            <h3 className="text-3xl font-black text-green-600">
              {transporters.filter(t => t.status === 'active').length}
            </h3>
            <div className="mt-3 flex items-center gap-2">
              <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(transporters.filter(t => t.status === 'active').length / transporters.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="relative group overflow-hidden p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="h-16 w-16 text-red-600" />
            </div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Docs Pending</p>
            <h3 className="text-3xl font-black text-red-600">
              {transporters.reduce((sum, t) => sum + t.totalPendingAcrossAll, 0)}
            </h3>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-red-500 uppercase tracking-tighter">
              Requires immediate action
            </div>
          </div>
        </section>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Search by company, owner, or phone..."
              className="pl-12 py-6 rounded-2xl border-gray-200 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white shadow-sm"
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
            <AnimatePresence>
              {filteredTransporters.map((transporter) => (
                <motion.div
                  key={transporter.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  layout
                >
                  <Card className="overflow-hidden border-gray-100/50 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500" data-testid={`transporter-card-${transporter.id}`}>
                    <Collapsible open={expandedTransporters.has(transporter.id)} onOpenChange={() => toggleTransporter(transporter.id)}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-white transition-all duration-300 p-6 relative group">
                          <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${transporter.status === 'active' ? 'bg-green-500' : transporter.totalPendingAcrossAll > 0 ? 'bg-amber-500' : 'bg-blue-500'}`}></div>

                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-5">
                              <div className="relative">
                                <motion.div
                                  animate={expandedTransporters.has(transporter.id) ? { rotate: 90 } : { rotate: 0 }}
                                  className="absolute -left-8 top-1/2 -translate-y-1/2"
                                >
                                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                </motion.div>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${transporter.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                  <Building2 className="h-7 w-7" />
                                </div>
                              </div>
                              <div>
                                <CardTitle className="text-xl font-black text-gray-900 leading-tight mb-1 group-hover:text-blue-600 transition-colors">
                                  {transporter.companyName}
                                </CardTitle>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{transporter.ownerName}</p>
                                  <span className="text-gray-200 h-3 w-px bg-gray-200"></span>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{transporter.contact}</p>
                                  <span className="text-gray-200 h-3 w-px bg-gray-200"></span>
                                  <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{transporter.email}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="flex items-center gap-8 px-8 py-3 bg-gray-50/50 rounded-2xl border border-gray-100 shadow-inner">
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Vehicles</p>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Truck className="h-3 w-3 text-indigo-500" />
                                    <span className="text-sm font-black text-gray-800">{transporter.totalVehicles}</span>
                                  </div>
                                </div>
                                <span className="text-gray-200 h-6 w-px bg-gray-200"></span>
                                <div className="text-center">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Drivers</p>
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Users className="h-3 w-3 text-purple-500" />
                                    <span className="text-sm font-black text-gray-800">{transporter.totalDrivers}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(transporter.status)}
                                {transporter.totalPendingAcrossAll > 0 && (
                                  <motion.div
                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                  >
                                    <Badge className="bg-red-500 text-white font-black border-none text-[10px] rounded-full px-2.5 shadow-lg shadow-red-200">
                                      {transporter.totalPendingAcrossAll} AUDITS PENDING
                                    </Badge>
                                  </motion.div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <CardContent className="p-8 pt-0">
                          {/* Readiness Progress Header */}
                          {transporter.readiness && (
                            <div className="mb-10 p-8 bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-3xl shadow-sm relative overflow-hidden">
                              {/* Animated Background Pulse */}
                              <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-10 transition-colors duration-1000 ${transporter.readiness.isReadyForApproval ? 'bg-green-500' : 'bg-blue-500'}`}></div>

                              <div className="relative z-10">
                                <div className="flex items-center justify-between mb-8">
                                  <h4 className="font-black text-xs tracking-[0.2em] text-gray-400 flex items-center gap-2 uppercase">
                                    <Shield className={`h-4 w-4 ${transporter.readiness.isReadyForApproval ? 'text-green-500' : 'text-blue-500'}`} />
                                    Security Compliance Matrix
                                  </h4>
                                  {(() => {
                                    const criteria = [
                                      transporter.readiness.businessDocsVerified,
                                      transporter.readiness.hasMinimumVehicles,
                                      transporter.readiness.hasMinimumDrivers,
                                      transporter.readiness.allVehiclesReady,
                                      transporter.readiness.allDriversReady
                                    ];
                                    const score = criteria.filter(Boolean).length;
                                    const percentage = (score / criteria.length) * 100;
                                    return (
                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Audit Progress</p>
                                          <p className={`text-sm font-black ${percentage === 100 ? 'text-green-600' : 'text-blue-600'}`}>{Math.round(percentage)}%</p>
                                        </div>
                                        <div className={`h-10 w-10 rounded-full border-4 flex items-center justify-center text-[10px] font-black ${percentage === 100 ? 'border-green-500 text-green-600' : 'border-blue-500 text-blue-600'}`}>
                                          {score}/{criteria.length}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Readiness Progress Bar */}
                                <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden mb-10 flex border border-gray-50 shadow-inner">
                                  {[
                                    transporter.readiness.businessDocsVerified,
                                    transporter.readiness.hasMinimumVehicles,
                                    transporter.readiness.hasMinimumDrivers,
                                    transporter.readiness.allVehiclesReady,
                                    transporter.readiness.allDriversReady
                                  ].map((met, idx) => (
                                    <motion.div
                                      key={idx}
                                      initial={{ width: 0 }}
                                      animate={{ width: met ? '20.2%' : '0%' }}
                                      className={`h-full border-r border-white/40 last:border-r-0 ${met ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : ''}`}
                                      transition={{ delay: idx * 0.1, duration: 0.5 }}
                                    />
                                  ))}
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                  {[
                                    { met: transporter.readiness.businessDocsVerified, label: "Identity", icon: FileText, color: "blue" },
                                    { met: transporter.readiness.hasMinimumVehicles, label: "Fleet", icon: Truck, color: "indigo" },
                                    { met: transporter.readiness.hasMinimumDrivers, label: "Staff", icon: Users, color: "purple" },
                                    { met: transporter.readiness.allVehiclesReady, label: "RC Audit", icon: CheckCircle, color: "emerald" },
                                    { met: transporter.readiness.allDriversReady, label: "License", icon: Shield, color: "cyan" },
                                  ].map((item, idx) => (
                                    <motion.div
                                      key={idx}
                                      whileHover={{ y: -4, scale: 1.02 }}
                                      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${item.met ? 'bg-white border-green-200 shadow-sm' : 'bg-gray-50/50 border-gray-100 opacity-50 grayscale'}`}
                                    >
                                      <div className={`p-2 rounded-xl mb-2 ${item.met ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <item.icon className="h-5 w-5" />
                                      </div>
                                      <span className={`text-[10px] font-black uppercase tracking-[0.1em] text-center ${item.met ? 'text-gray-900' : 'text-gray-500'}`}>
                                        {item.label}
                                      </span>
                                      {item.met && <CheckCircle className="h-3 w-3 text-green-500 mt-1.5" />}
                                    </motion.div>
                                  ))}
                                </div>

                                {/* Final Approval Action */}
                                <div className="mt-10 pt-8 border-t border-gray-100 flex flex-wrap items-center justify-between gap-6">
                                  <div className="flex items-center gap-4">
                                    {transporter.readiness.isReadyForApproval ? (
                                      <div className="flex items-center gap-3 bg-green-50/50 text-green-700 px-5 py-2.5 rounded-2xl border border-green-100 shadow-sm">
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                                        <span className="text-xs font-black uppercase tracking-widest leading-none">Security Verified</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 bg-amber-50/50 text-amber-700 px-5 py-2.5 rounded-2xl border border-amber-100 shadow-sm">
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        <span className="text-xs font-black uppercase tracking-widest leading-none">Pending Verification</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Button
                                      variant="ghost"
                                      className="rounded-2xl h-14 px-8 text-red-500 hover:bg-red-50 hover:text-red-600 font-black uppercase tracking-widest text-[10px] transition-all"
                                      onClick={() => setRejectingTransporterId(transporter.id)}
                                    >
                                      Reject Application
                                    </Button>
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                      <Button
                                        disabled={!transporter.readiness.isReadyForApproval || approvingTransporterId === transporter.id}
                                        onClick={() => handleApproveTransporter(transporter.id)}
                                        className={`rounded-2xl px-10 h-14 font-black uppercase tracking-[0.15em] text-[10px] shadow-2xl transition-all ${transporter.readiness.isReadyForApproval
                                          ? "bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-500/30"
                                          : "bg-gray-100 text-gray-400 border border-gray-200"
                                          }`}
                                      >
                                        {approvingTransporterId === transporter.id ? (
                                          <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                          <>Activate Platform Access</>
                                        )}
                                      </Button>
                                    </motion.div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                            <div className="space-y-10">
                              {/* Business Documents */}
                              <section>
                                {(() => {
                                  const transporterType = transporter.transporterType === "business" ? "business" : "individual";
                                  const businessDocsStatus = transporter.businessDocumentsStatus || (transporter as any)?.businessDocuments?.status;
                                  const requiresBusinessDocs = transporterType === "business" && businessDocsStatus !== "not_required";
                                  return (
                                    <>
                                      <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-black text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                          <Building2 className="h-4 w-4 text-blue-500" />
                                          Corporate Credentials
                                        </h4>
                                        {!requiresBusinessDocs && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter">Not Required</Badge>}
                                      </div>
                                      <div className="p-6 bg-gray-50/50 rounded-3xl border border-gray-100/50">
                                        <DocumentTypeSection
                                          documents={transporter.documents}
                                          requiredTypes={requiresBusinessDocs ? REQUIRED_TRANSPORTER_DOCS : []}
                                          optionalTypes={["trade_license", "bank_details", "company_pan", "address_proof"] as const}
                                          entityLabel="Transporter"
                                        />
                                      </div>
                                    </>
                                  );
                                })()}
                              </section>

                              {/* Entities (Vehicles & Drivers) */}
                              <div className="grid grid-cols-1 gap-6">
                                <Collapsible open={expandedVehicles.has(transporter.id)} onOpenChange={() => toggleVehicleSection(transporter.id)}>
                                  <CollapsibleTrigger asChild>
                                    <motion.div
                                      whileHover={{ x: 4 }}
                                      className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:shadow-md transition-all"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                                          <Truck className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-black text-gray-900 tracking-tight">Fleet Information</p>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase">{transporter.totalVehicles} Registered Units</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        {transporter.vehicles.some(v => v.pendingDocuments > 0) && (
                                          <Badge className="bg-red-500 text-white font-black text-[9px] border-none px-2 rounded-full">AUDIT NEEDED</Badge>
                                        )}
                                        <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${expandedVehicles.has(transporter.id) ? 'rotate-180' : ''}`} />
                                      </div>
                                    </motion.div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-50">
                                      {transporter.vehicles.length === 0 ? (
                                        <div className="p-6 text-center bg-gray-50/30 rounded-2xl border border-dashed text-gray-400 text-xs italic">No units registered</div>
                                      ) : (
                                        transporter.vehicles.map(vehicle => (
                                          <div key={vehicle.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                                              <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                  <Truck className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <span className="text-sm font-black text-gray-900 tracking-tight">{vehicle.plateNumber}</span>
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-gray-50">{vehicle.type}</Badge>
                                              </div>
                                              <Badge className={`rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-widest ${vehicle.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-gray-100 text-gray-500'}`}>
                                                {vehicle.status.toUpperCase()}
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

                                <Collapsible open={expandedDrivers.has(transporter.id)} onOpenChange={() => toggleDriverSection(transporter.id)}>
                                  <CollapsibleTrigger asChild>
                                    <motion.div
                                      whileHover={{ x: 4 }}
                                      className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl cursor-pointer hover:shadow-md transition-all"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                                          <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                          <p className="text-sm font-black text-gray-900 tracking-tight">Personnel Roster</p>
                                          <p className="text-[10px] font-bold text-gray-400 uppercase">{transporter.totalDrivers} Active Personnel</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        {transporter.drivers.some(d => d.pendingDocuments > 0) && (
                                          <Badge className="bg-red-500 text-white font-black text-[9px] border-none px-2 rounded-full">AUDIT NEEDED</Badge>
                                        )}
                                        <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform ${expandedDrivers.has(transporter.id) ? 'rotate-180' : ''}`} />
                                      </div>
                                    </motion.div>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-50">
                                      {transporter.drivers.length === 0 ? (
                                        <div className="p-6 text-center bg-gray-50/30 rounded-2xl border border-dashed text-gray-400 text-xs italic">No roster entries</div>
                                      ) : (
                                        transporter.drivers.map(driver => (
                                          <div key={driver.id} className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-50">
                                              <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center">
                                                  <User className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <span className="text-sm font-black text-gray-900 tracking-tight">{driver.name}</span>
                                                {driver.isSelfDriver && <Badge variant="outline" className="text-[9px] font-black uppercase tracking-tighter bg-blue-50 text-blue-600 border-blue-100">Self-Driver</Badge>}
                                              </div>
                                              <Badge className={`rounded-full px-2.5 py-0.5 text-[9px] font-black tracking-widest ${driver.documentsComplete ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-100 text-amber-700'}`}>
                                                {driver.documentsComplete ? 'COMPLETE' : 'PENDING'}
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
                            </div>

                            {/* Verification Timeline */}
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h4 className="font-black text-[10px] text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-purple-500" />
                                  Audit Trail
                                </h4>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => loadTransporterTimeline(transporter.id, true)}
                                  disabled={!!timelineLoading[transporter.id]}
                                  className="h-8 px-3 rounded-full hover:bg-white hover:shadow-sm transition-all"
                                >
                                  <RefreshCw className={`h-3 w-3 mr-2 ${timelineLoading[transporter.id] ? "animate-spin" : ""}`} />
                                  <span className="text-[10px] uppercase font-black">Sync History</span>
                                </Button>
                              </div>
                              <div className="bg-gray-50/50 rounded-[2rem] border border-gray-100/50 p-8 min-h-[400px]">
                                {timelineErrors[transporter.id] && (
                                  <p className="text-xs text-red-600 mb-4 bg-red-50 p-3 rounded-xl border border-red-100">
                                    {timelineErrors[transporter.id]}
                                  </p>
                                )}
                                <VerificationTimeline
                                  logs={timelineLogs[transporter.id]}
                                  loading={!!timelineLoading[transporter.id]}
                                  emptyMessage={timelineErrors[transporter.id] || "No verification history logged for this account."}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

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
    </div >
  );
}
