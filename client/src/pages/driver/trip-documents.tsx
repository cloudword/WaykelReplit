import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Camera, 
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  X,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";

interface TripDocument {
  id: string;
  type: string;
  documentName: string;
  url: string;
  status: string;
  createdAt: string;
}

export default function DriverTripDocuments() {
  const [_, setLocation] = useLocation();
  const [, params] = useRoute("/trips/:tripId/documents");
  const tripId = params?.tripId;
  
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDocuments();
  }, [tripId]);

  const loadDocuments = async () => {
    if (!tripId) return;
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/documents`, {
        credentials: "include",
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocuments(data);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tripId) return;

    setUploading(true);
    try {
      const urlRes = await fetch(`${API_BASE}/trips/${tripId}/documents/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          documentType: "delivery_proof",
        }),
      });

      const urlData = await urlRes.json();
      if (urlData.error) {
        toast.error(urlData.error);
        return;
      }

      await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const docRes = await fetch(`${API_BASE}/trips/${tripId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "delivery_proof",
          documentName: file.name,
          url: urlData.fileUrl,
          storagePath: urlData.storagePath,
        }),
      });

      const docData = await docRes.json();
      if (docData.error) {
        toast.error(docData.error);
      } else {
        toast.success("Document uploaded successfully!");
        loadDocuments();
      }
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-100 text-green-700"><CheckCircle2 className="h-3 w-3 mr-1" />Verified</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation("/driver")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">Trip Documents</h1>
          <p className="text-xs text-muted-foreground">Upload delivery proof and receipts</p>
        </div>
      </header>

      <main className="p-4 space-y-4">
        <Card data-testid="card-upload">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Upload Delivery Proof
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              data-testid="input-file"
            />
            <Button 
              className="w-full h-14 gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              data-testid="button-upload"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5" />
                  Select Photo or Document
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Supports: JPG, PNG, PDF
            </p>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Uploaded Documents</h2>
            {documents.map((doc) => (
              <Card key={doc.id} data-testid={`doc-${doc.id}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    {doc.url?.includes("image") || doc.documentName?.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                      <ImageIcon className="h-6 w-6 text-gray-400" />
                    ) : (
                      <FileText className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.documentName || doc.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(doc.status)}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">No documents uploaded yet</p>
            <p className="text-sm text-gray-400 mt-1">Upload delivery proof above</p>
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
