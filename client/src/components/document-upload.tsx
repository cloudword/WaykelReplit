import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Loader2, X, File, CheckCircle, AlertCircle, Clock, Info } from "lucide-react";
import { api } from "@/lib/api";
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      status: "pending",
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
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

      const spacesResponse = await fetch("/api/spaces/upload", {
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

        const uploadResponse = await fetch("/api/objects/upload", {
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

        const confirmResponse = await fetch("/api/objects/confirm", {
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
    if (!docType) {
      toast.error("Please select a document type");
      return;
    }

    if (isDocTypeDisabled(docType)) {
      const status = getDocTypeStatus(docType);
      const docLabel = docTypes.find(d => d.value === docType)?.label || docType;
      if (status === "pending") {
        toast.error(`${docLabel} has already been uploaded and is pending verification.`);
      } else if (status === "verified") {
        toast.error(`${docLabel} has already been verified. Contact support if you need to update it.`);
      }
      return;
    }

    if (files.length === 0) {
      toast.error("Please select at least one file to upload");
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let lastError = "";

    try {
      for (let index = 0; index < files.length; index++) {
        const uploadedFile = files[index];
        
        const uploadResult = await uploadFile(uploadedFile, index);
        
        if (!uploadResult) {
          continue;
        }

        const docData: any = {
          entityType,
          type: docType,
          documentName: docTypes.find(d => d.value === docType)?.label || docType,
          url: uploadResult.key,
          status: "pending",
        };

        if (uploadResult.storagePath) {
          docData.storagePath = uploadResult.storagePath;
        }

        if (entityType === "driver") {
          docData.userId = entityId;
        } else if (entityType === "vehicle") {
          docData.vehicleId = entityId;
        }

        if (entityType === "transporter") {
          docData.transporterId = entityId;
        } else if (transporterId) {
          docData.transporterId = transporterId;
        }

        if (expiryDate) {
          docData.expiryDate = expiryDate;
        }

        const response = await api.documents.create(docData);
        
        if (response?.error) {
          lastError = response.error;
          setFiles(prev => prev.map((f, i) => i === index ? { 
            ...f, 
            status: "error", 
            error: getFriendlyErrorMessage(response.error) 
          } : f));
        } else {
          setFiles(prev => prev.map((f, i) => i === index ? { 
            ...f, 
            status: "success", 
            progress: 100 
          } : f));
          successCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} document(s) uploaded successfully`);
        onSuccess?.();
        setTimeout(() => {
          onOpenChange(false);
          setDocType("");
          setExpiryDate("");
          setFiles([]);
        }, 500);
      } else if (lastError) {
        toast.error(getFriendlyErrorMessage(lastError));
      } else {
        toast.error("Failed to upload documents");
      }
    } catch (error) {
      console.error("Failed to create document records:", error);
      toast.error("Failed to save document records");
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
    }
  }, [open]);

  const availableDocTypes = docTypes.filter(type => !isDocTypeDisabled(type.value));
  const disabledDocTypes = docTypes.filter(type => isDocTypeDisabled(type.value));

  return (
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
          {disabledDocTypes.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Already Uploaded ({disabledDocTypes.length})
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {disabledDocTypes.map(type => {
                  const existingDoc = getExistingDoc(type.value);
                  const status = existingDoc?.status;
                  const fileName = existingDoc?.url ? existingDoc.url.split('/').pop() : null;
                  
                  return (
                    <div 
                      key={type.value} 
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        status === "pending" 
                          ? "bg-yellow-50 border-yellow-200" 
                          : "bg-green-50 border-green-200"
                      }`}
                      data-testid={`existing-doc-${type.value}`}
                    >
                      {status === "pending" ? (
                        <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">
                          {existingDoc?.documentName || type.label}
                        </p>
                        {fileName && (
                          <p className="text-xs text-gray-500 truncate">
                            File: {decodeURIComponent(fileName)}
                          </p>
                        )}
                        {existingDoc?.expiryDate && (
                          <p className="text-xs text-gray-500">
                            Expires: {existingDoc.expiryDate}
                          </p>
                        )}
                      </div>
                      <Badge 
                        variant="outline"
                        className={status === "pending" 
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300" 
                          : "bg-green-100 text-green-700 border-green-300"
                        }
                      >
                        {status === "pending" ? "Under Review" : "Verified"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
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
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    data-testid="input-file"
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    Click to select files or drag and drop
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supports images, PDF, and Word documents
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files ({files.length})</Label>
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
                  Upload {files.length > 0 ? `(${files.length})` : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
