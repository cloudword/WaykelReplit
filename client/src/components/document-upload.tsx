import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

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

interface DocumentUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: "driver" | "vehicle";
  entityId: string;
  transporterId?: string;
  onSuccess?: () => void;
}

export function DocumentUpload({ 
  open, 
  onOpenChange, 
  entityType, 
  entityId, 
  transporterId,
  onSuccess 
}: DocumentUploadProps) {
  const [docType, setDocType] = useState("");
  const [url, setUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const docTypes = entityType === "driver" ? DRIVER_DOC_TYPES : VEHICLE_DOC_TYPES;

  const handleSubmit = async () => {
    if (!docType || !url) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const docData: any = {
        entityType,
        type: docType,
        documentName: docTypes.find(d => d.value === docType)?.label || docType,
        url,
        status: "pending",
      };

      if (entityType === "driver") {
        docData.userId = entityId;
      } else {
        docData.vehicleId = entityId;
      }

      if (transporterId) {
        docData.transporterId = transporterId;
      }

      if (expiryDate) {
        docData.expiryDate = expiryDate;
      }

      await api.documents.create(docData);
      toast.success("Document uploaded successfully");
      onOpenChange(false);
      setDocType("");
      setUrl("");
      setExpiryDate("");
      onSuccess?.();
    } catch (error) {
      console.error("Failed to upload document:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload {entityType === "driver" ? "Driver" : "Vehicle"} Document
          </DialogTitle>
          <DialogDescription>
            Add a document for this {entityType}. Documents will be pending verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Document Type *</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger data-testid="select-doc-type">
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {docTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Document URL *</Label>
            <Input
              placeholder="https://drive.google.com/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              data-testid="input-doc-url"
            />
            <p className="text-xs text-gray-500">
              Upload your document to Google Drive, Dropbox, or any cloud storage and paste the link here
            </p>
          </div>

          <div className="space-y-2">
            <Label>Expiry Date (Optional)</Label>
            <Input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              data-testid="input-expiry-date"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} data-testid="button-upload-doc">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
