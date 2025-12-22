import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Loader2, X, File, CheckCircle, AlertCircle, Clock, Info, Eye, RefreshCw } from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const DRIVER_DOC_TYPES = [
  { value: "license", label: "Driving License" },
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan", label: "PAN Card" },
];

const VEHICLE_DOC_TYPES = [
  { value: "rc", label: "Registration Certificate (RC)" },
  { value: "insurance", label: "Insurance" },
  { value: "fitness", label: "Fitness Certificate" },
  { value: "pollution", label: "Pollution Certificate" },
  { value: "permit", label: "Permit" },
];

const TRANSPORTER_DOC_TYPES = [
  { value: "gst_certificate", label: "GST Certificate" },
  { value: "pan", label: "PAN Card" },
  { value: "business_registration", label: "Business Registration" },
  { value: "trade_license", label: "Trade License" },
  { value: "aadhar", label: "Owner Aadhar Card" },
];

interface UploadedFile {
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  progress: number;
  objectPath?: string;
  storagePath?: string;
  error?: string;
}

interface UploadResult {
  key: string;
  storagePath?: string;
}

interface ExistingDocument {
  id: string;
  type: string;
  status: string;
  documentName?: string;
  url?: string;
  expiryDate?: string;
  createdAt?: string;
  rejectionReason?: string;
}

interface DocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "driver" | "vehicle" | "transporter";
  entityId: string;
  transporterId?: string;
  onSuccess?: () => void;
  existingDocuments?: ExistingDocument[];
}

export function DocumentUpload({ 
  open, 
  onOpenChange, 
  entityType, 
  entityId, 
  transporterId,
  onSuccess,
  existingDocuments = []
}: DocumentUploadProps) {
  const [docType, setDocType] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [replacingDoc, setReplacingDoc] = useState<ExistingDocument | null>(null);
  const [viewingDoc, setViewingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const docTypes = entityType === "driver" 
    ? DRIVER_DOC_TYPES 
    : entityType === "vehicle" 
      ? VEHICLE_DOC_TYPES 
      : TRANSPORTER_DOC_TYPES;

  const getExistingDoc = (type: string) => {
    return existingDocuments.find(
      d => d.type === type && (d.status === "pending" || d.status === "verified")
    );
  };

  const isDocTypeDisabled = (type: string) => {
    const existing = getExistingDoc(type);
    return !!existing;
  };

  const getDocTypeStatus = (type: string) => {
    const existing = getExistingDoc(type);
    if (!existing) return null;
    return existing.status;
  };

  const handleViewDocument = async (doc: ExistingDocument) => {
    if (!doc.url) {
      toast.error("Document URL not available");
      return;
    }
    
    setViewingDoc(true);
    try {
      // For Spaces storage (private/ prefix), use signed URL
      if (doc.url.startsWith("private/")) {
        const response = await fetch(`${API_BASE}/spaces/signed-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ key: doc.url }),
        });
        
        if (response.ok) {
          const { signedUrl } = await response.json();
          setPreviewUrl(signedUrl);
        } else {
          toast.error("Failed to get document access");
        }
      } else {
        // For Replit Object Storage, use the download endpoint
        setPreviewUrl(`/objects/${doc.url}`);
      }
    } catch (error) {
      toast.error("Failed to view document");
    } finally {
      setViewingDoc(false);
    }
  };

  const handleReplaceDocument = (doc: ExistingDocument) => {
    // Set up replacement context
    setReplacingDoc(doc);
    setDocType(doc.type);
    // Clear any existing files and open file picker
    setFiles([]);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Replace existing file (single file per document type)
      setFiles([{
        file: selectedFile,
        status: "pending",
        progress: 0,
      }]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const uploadFile = async (uploadedFile: UploadedFile, index: number): Promise<UploadResult | null> => {
    try {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, status: "uploading", progress: 10 } : f));

      const fileData = await fileToBase64(uploadedFile.file);
      
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 30 } : f));

      const spacesResponse = await fetch(`${API_BASE}/spaces/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileData,
          fileName: uploadedFile.file.name,
          contentType: uploadedFile.file.type || "application/octet-stream",
          entityType,
          transporterId,
          userId: entityType === "driver" ? entityId : undefined,
          vehicleId: entityType === "vehicle" ? entityId : undefined,
        }),
      });

      if (spacesResponse.ok) {
        const { key, storagePath } = await spacesResponse.json();
        setFiles(prev => prev.map((f, i) => i === index ? { 
          ...f, 
          progress: 80,
          objectPath: key,
          storagePath 
        } : f));
        return { key, storagePath };
      }

      if (spacesResponse.status === 503) {
        setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 40 } : f));

        const uploadResponse = await fetch(`${API_BASE}/objects/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ fileName: uploadedFile.file.name }),
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to get upload URL");
        }

        const { uploadURL, objectPath } = await uploadResponse.json();

        setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 60 } : f));

        const uploadToStorage = await fetch(uploadURL, {
          method: "PUT",
          body: uploadedFile.file,
          headers: {
            "Content-Type": uploadedFile.file.type || "application/octet-stream",
          },
        });

        if (!uploadToStorage.ok) {
          throw new Error("Failed to upload file to storage");
        }

        setFiles(prev => prev.map((f, i) => i === index ? { ...f, progress: 70 } : f));

        const confirmResponse = await fetch(`${API_BASE}/objects/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ objectPath }),
        });

        if (!confirmResponse.ok) {
          throw new Error("Failed to confirm upload");
        }

        const { objectPath: confirmedPath } = await confirmResponse.json();

        setFiles(prev => prev.map((f, i) => i === index ? { 
          ...f, 
          progress: 80, 
          objectPath: confirmedPath 
        } : f));

        return { key: confirmedPath };
      }

      const errorData = await spacesResponse.json().catch(() => ({}));
      throw new Error(errorData.error || "Upload failed");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      setFiles(prev => prev.map((f, i) => i === index ? { 
        ...f, 
        status: "error", 
        error: errorMessage 
      } : f));
      return null;
    }
  };

  const getFriendlyErrorMessage = (error: string) => {
    if (error.includes("already exists")) {
      const docLabel = docTypes.find(d => d.value === docType)?.label || docType;
      return `${docLabel} has already been uploaded and is pending verification. You'll be notified once it's approved.`;
    }
    if (error.includes("Authentication")) {
      return "Your session has expired. Please log in again.";
    }
    return error;
  };

  const handleSubmit = async () => {
    // 1️⃣ BLOCK EARLY — before upload
    if (!docType) {
      toast.error("Please select a document type");
      return;
    }

    // Skip the disabled check when replacing a rejected document
    if (!replacingDoc && isDocTypeDisabled(docType)) {
      const status = getDocTypeStatus(docType);
      const docLabel = docTypes.find(d => d.value === docType)?.label || docType;
      toast.error(
        status === "pending"
          ? `${docLabel} already uploaded and under review.`
          : `${docLabel} already verified.`
      );
      return;
    }

    if (files.length === 0) {
      toast.error("Please select a file to upload");
      return;
    }

    setIsSubmitting(true);
    setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, status: "uploading", progress: 10 } : f));

    try {
      // Convert file to base64
      const file = files[0].file;
      const fileData = await fileToBase64(file);
      
      setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, progress: 30 } : f));

      // 2️⃣ SINGLE API CALL - Backend handles everything atomically
      // Include replaceDocumentId if we're replacing a rejected document
      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileData,
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
          entityType,
          type: docType,
          entityId,
          expiryDate: expiryDate || undefined,
          replaceDocumentId: replacingDoc?.id,
        }),
      });

      setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, progress: 80 } : f));

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setFiles(prev => prev.map((f, i) => i === 0 ? { ...f, status: "success", progress: 100 } : f));

      // 3️⃣ SUCCESS — single toast after atomic operation
      toast.success(replacingDoc ? "Document replaced successfully" : "Document uploaded successfully");
      
      // Clear replacing state before closing
      setReplacingDoc(null);
      
      // Refresh list and close modal
      onSuccess?.();
      onOpenChange(false);
      setDocType("");
      setExpiryDate("");
      setFiles([]);
    } catch (error) {
      setFiles(prev => prev.map((f, i) => i === 0 ? { 
        ...f, 
        status: "error", 
        error: error instanceof Error ? error.message : "Upload failed" 
      } : f));
      toast.error(
        getFriendlyErrorMessage(
          error instanceof Error ? error.message : "Upload failed"
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (status: UploadedFile["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case "uploading":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <File className="h-5 w-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  useEffect(() => {
    if (!open) {
      setFiles([]);
      setDocType("");
      setExpiryDate("");
      setReplacingDoc(null);
    }
  }, [open]);

  // Clear selected docType if it becomes disabled (e.g., documents loaded after dialog opened)
  useEffect(() => {
    if (docType && !replacingDoc && isDocTypeDisabled(docType)) {
      const docLabel = docTypes.find(d => d.value === docType)?.label || docType;
      const existing = getExistingDoc(docType);
      const statusMessage = existing?.status === "pending" 
        ? "under review" 
        : "already verified";
      setFiles(prev => prev.map(f => ({
        ...f,
        status: "error" as const,
        error: `${docLabel} is ${statusMessage}. Cannot upload duplicate.`
      })));
    }
  }, [existingDocuments, docType, replacingDoc]);

  const availableDocTypes = docTypes.filter(type => !isDocTypeDisabled(type.value));
  const disabledDocTypes = docTypes.filter(type => isDocTypeDisabled(type.value));

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload {entityType === "driver" ? "Driver" : entityType === "vehicle" ? "Vehicle" : "Business"} Document
          </DialogTitle>
          <DialogDescription>
            Upload documents directly. Select document type and file to upload.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Render existing documents from backend data */}
          {existingDocuments.length > 0 ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Uploaded Documents ({existingDocuments.length})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {existingDocuments.map(doc => {
                  const fileName = doc.url?.split("/").pop();
                  
                  // Status-based styling
                  const getStatusStyles = (status: string) => {
                    switch (status) {
                      case "pending":
                        return {
                          container: "bg-yellow-50 border-yellow-200",
                          icon: <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />,
                          badge: "bg-yellow-100 text-yellow-700 border-yellow-300",
                          label: "Under Review"
                        };
                      case "verified":
                        return {
                          container: "bg-green-50 border-green-200",
                          icon: <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />,
                          badge: "bg-green-100 text-green-700 border-green-300",
                          label: "Verified"
                        };
                      case "expired":
                        return {
                          container: "bg-red-50 border-red-200",
                          icon: <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />,
                          badge: "bg-red-100 text-red-700 border-red-300",
                          label: "Expired"
                        };
                      case "rejected":
                        return {
                          container: "bg-red-50 border-red-200",
                          icon: <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />,
                          badge: "bg-red-100 text-red-700 border-red-300",
                          label: "Rejected"
                        };
                      default:
                        return {
                          container: "bg-gray-50 border-gray-200",
                          icon: <Info className="h-5 w-5 text-gray-600 flex-shrink-0" />,
                          badge: "bg-gray-100 text-gray-700 border-gray-300",
                          label: status
                        };
                    }
                  };
                  
                  const styles = getStatusStyles(doc.status);
                  
                  return (
                    <div 
                      key={doc.id} 
                      className={`p-3 rounded-lg border ${styles.container}`}
                      data-testid={`existing-doc-${doc.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {styles.icon}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900">
                            {doc.documentName || doc.type}
                          </p>
                          {fileName && (
                            <p className="text-xs text-gray-500 truncate">
                              File: {decodeURIComponent(fileName)}
                            </p>
                          )}
                          {doc.expiryDate && (
                            <p className="text-xs text-gray-500">
                              Expires: {doc.expiryDate}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline"
                            className={styles.badge}
                          >
                            {styles.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleViewDocument(doc)}
                            disabled={viewingDoc}
                            data-testid={`view-doc-${doc.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.status === "rejected" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700"
                              onClick={() => handleReplaceDocument(doc)}
                              data-testid={`replace-doc-${doc.id}`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {doc.status === "rejected" && doc.rejectionReason && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                          <span className="font-medium">Reason:</span> {doc.rejectionReason}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              No documents uploaded yet.
            </p>
          )}

          <div className="space-y-2">
            <Label>Document Type *</Label>
            {availableDocTypes.length === 0 ? (
              <div className="p-4 text-center bg-gray-50 rounded-lg border">
                <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                <p className="text-sm text-gray-600">All required documents have been uploaded!</p>
                <p className="text-xs text-gray-500 mt-1">They are pending verification.</p>
              </div>
            ) : (
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger data-testid="select-doc-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {availableDocTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {availableDocTypes.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Upload Files *</Label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="file-drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to select a file
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports images, PDF, and Word documents
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected File</Label>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {files.map((uploadedFile, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                        data-testid={`file-item-${index}`}
                      >
                        {getFileIcon(uploadedFile.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {uploadedFile.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(uploadedFile.file.size)}
                            {uploadedFile.error && (
                              <span className="text-red-500 ml-2">
                                {uploadedFile.error}
                              </span>
                            )}
                          </p>
                          {uploadedFile.status === "uploading" && (
                            <Progress value={uploadedFile.progress} className="h-1 mt-1" />
                          )}
                        </div>
                        {uploadedFile.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFile(index);
                            }}
                            data-testid={`remove-file-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  data-testid="input-expiry-date"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          {availableDocTypes.length > 0 && (
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || files.length === 0 || !docType}
              data-testid="button-upload-doc"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          )}
        </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent aria-describedby="document-preview-description" className="max-w-4xl max-h-[90vh]">
          <p id="document-preview-description" className="sr-only">Document preview</p>
          <DialogHeader>
            <DialogTitle>Document Preview</DialogTitle>
          </DialogHeader>

          {previewUrl?.endsWith(".pdf") ? (
            <iframe
              src={previewUrl}
              className="w-full h-[80vh]"
            />
          ) : (
            <img
              src={previewUrl}
              className="max-h-[80vh] mx-auto"
            />
          )}

          <DialogFooter>
            <Button onClick={() => setPreviewUrl(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
