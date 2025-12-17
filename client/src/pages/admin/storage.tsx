import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HardDrive, Search, RefreshCw, Folder, File, Image, Trash2, Eye, Download, ChevronRight, Home, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";

interface StorageFile {
  key: string;
  contentType: string;
  size: number;
  isImage: boolean;
}

interface FileDetails {
  key: string;
  contentType: string;
  size: number;
  signedUrl: string;
  isImage: boolean;
}

interface DirectoriesResponse {
  directories: string[];
  totalFiles: number;
}

export default function AdminStorage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [directories, setDirectories] = useState<string[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileDetails | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: "include" });
        if (res.ok) {
          const user = await res.json();
          if (user.isSuperAdmin) {
            setIsSuperAdmin(true);
          } else {
            setIsSuperAdmin(false);
            setAccessError("This page requires Super Admin access");
          }
        } else {
          setIsSuperAdmin(false);
          setAccessError("Authentication required");
        }
      } catch {
        setIsSuperAdmin(false);
        setAccessError("Failed to verify access");
      }
    };
    checkSuperAdmin();
  }, []);

  const fetchDirectories = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/storage/directories`, { credentials: "include" });
      if (res.ok) {
        const data: DirectoriesResponse = await res.json();
        setDirectories(data.directories);
        setTotalFiles(data.totalFiles);
      } else if (res.status === 403) {
        setAccessError("Super Admin access required");
      }
    } catch (error) {
      console.error("Failed to fetch directories:", error);
    }
  };

  const fetchFiles = async (prefix: string = "") => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/admin/storage?prefix=${encodeURIComponent(prefix)}&maxKeys=500`, { 
        credentials: "include" 
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load files");
      }
    } catch (error) {
      console.error("Failed to fetch files:", error);
      toast.error("Failed to load storage files");
    } finally {
      setLoading(false);
    }
  };

  const fetchFileDetails = async (key: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/storage/file?key=${encodeURIComponent(key)}`, { 
        credentials: "include" 
      });
      if (res.ok) {
        const data: FileDetails = await res.json();
        setSelectedFile(data);
        setShowPreview(true);
      } else {
        toast.error("Failed to load file details");
      }
    } catch (error) {
      console.error("Failed to fetch file details:", error);
      toast.error("Failed to load file details");
    }
  };

  const deleteFile = async () => {
    if (!fileToDelete) return;
    
    try {
      setDeleting(true);
      const res = await fetch(`${API_BASE}/admin/storage/file?key=${encodeURIComponent(fileToDelete)}`, { 
        method: "DELETE",
        credentials: "include" 
      });
      
      if (res.ok) {
        toast.success("File deleted successfully");
        setShowDeleteConfirm(false);
        setFileToDelete(null);
        fetchFiles(currentPrefix);
        fetchDirectories();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin === true) {
      fetchDirectories();
      fetchFiles();
    }
  }, [isSuperAdmin]);

  const navigateToPrefix = (prefix: string) => {
    const normalizedPrefix = prefix.endsWith("/") || prefix === "" ? prefix : prefix + "/";
    setCurrentPrefix(normalizedPrefix);
    fetchFiles(normalizedPrefix);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileName = (key: string): string => {
    const parts = key.split("/");
    return parts[parts.length - 1];
  };

  const getFileIcon = (file: StorageFile) => {
    if (file.isImage) return <Image className="h-4 w-4 text-blue-500" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const breadcrumbs = currentPrefix ? currentPrefix.split("/").filter(Boolean) : [];

  const filteredFiles = files.filter(file => 
    !searchQuery || file.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedContent = () => {
    const subDirs = new Set<string>();
    const directFiles: StorageFile[] = [];
    
    filteredFiles.forEach(file => {
      const relativePath = currentPrefix ? file.key.slice(currentPrefix.length) : file.key;
      const parts = relativePath.split("/").filter(Boolean);
      
      if (parts.length > 1) {
        subDirs.add(parts[0]);
      } else if (parts.length === 1) {
        directFiles.push(file);
      }
    });

    return { subDirs: Array.from(subDirs).sort(), directFiles };
  };

  const { subDirs, directFiles } = groupedContent();

  if (isSuperAdmin === null) {
    return (
      <div className="min-h-screen bg-gray-100 pl-64">
        <AdminSidebar />
        <main className="p-8 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-500 mt-4">Verifying access...</p>
          </div>
        </main>
      </div>
    );
  }

  if (isSuperAdmin === false || accessError) {
    return (
      <div className="min-h-screen bg-gray-100 pl-64">
        <AdminSidebar />
        <main className="p-8">
          <Card className="max-w-md mx-auto mt-20">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-500">{accessError || "Super Admin access required to view this page."}</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Storage Management</h1>
            <p className="text-gray-500">Browse and manage files in DigitalOcean Spaces</p>
          </div>
          <Button 
            onClick={() => { fetchDirectories(); fetchFiles(currentPrefix); }} 
            variant="outline" 
            className="gap-2" 
            data-testid="button-refresh"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <HardDrive className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalFiles}</p>
                  <p className="text-gray-500 text-sm">Total Files</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Folder className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{directories.length}</p>
                  <p className="text-gray-500 text-sm">Root Directories</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Image className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{files.filter(f => f.isImage).length}</p>
                  <p className="text-gray-500 text-sm">Images (Current)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <File className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{files.filter(f => !f.isImage).length}</p>
                  <p className="text-gray-500 text-sm">Other Files</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigateToPrefix("")}
                  data-testid="button-home"
                >
                  <Home className="h-4 w-4" />
                </Button>
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToPrefix(breadcrumbs.slice(0, index + 1).join("/") + "/")}
                      data-testid={`button-breadcrumb-${index}`}
                    >
                      {crumb}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                    data-testid="input-search"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subDirs.map((dir) => (
                    <TableRow 
                      key={dir} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => navigateToPrefix(currentPrefix + dir + "/")}
                      data-testid={`row-folder-${dir}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{dir}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Folder</Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {directFiles.map((file) => (
                    <TableRow key={file.key} data-testid={`row-file-${getFileName(file.key)}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(file)}
                          <span className="font-medium">{getFileName(file.key)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{file.contentType}</Badge>
                      </TableCell>
                      <TableCell>{formatFileSize(file.size)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => fetchFileDetails(file.key)}
                            data-testid={`button-view-${getFileName(file.key)}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => { setFileToDelete(file.key); setShowDeleteConfirm(true); }}
                            data-testid={`button-delete-${getFileName(file.key)}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {subDirs.length === 0 && directFiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        {currentPrefix ? "This folder is empty" : "No files found in storage"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {!currentPrefix && directories.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Navigation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                {directories.map((dir) => (
                  <Button
                    key={dir}
                    variant="outline"
                    className="justify-start gap-2 h-auto py-4"
                    onClick={() => navigateToPrefix(dir + "/")}
                    data-testid={`button-quick-nav-${dir}`}
                  >
                    <Folder className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">{dir}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>File Details</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">File Path</p>
                  <p className="font-mono text-xs break-all">{selectedFile.key}</p>
                </div>
                <div>
                  <p className="text-gray-500">Content Type</p>
                  <p>{selectedFile.contentType}</p>
                </div>
                <div>
                  <p className="text-gray-500">Size</p>
                  <p>{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              
              {selectedFile.isImage && (
                <div className="border rounded-lg overflow-hidden bg-gray-100">
                  <img 
                    src={selectedFile.signedUrl} 
                    alt="Preview" 
                    className="max-h-96 mx-auto object-contain"
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <a href={selectedFile.signedUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => {
                    setFileToDelete(selectedFile.key);
                    setShowPreview(false);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete File
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-gray-100 p-3 rounded-lg">
            <p className="font-mono text-xs break-all">{fileToDelete}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteFile}
              disabled={deleting}
              data-testid="button-confirm-delete"
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
