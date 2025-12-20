import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Phone, Mail, Search, FileText, CheckCircle, Clock, AlertCircle, Copy, Key, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";

export default function TransporterDrivers() {
  const [_, setLocation] = useLocation();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCredentialsDialog, setShowCredentialsDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordDriver, setResetPasswordDriver] = useState<any>(null);
  const [newPasswordResult, setNewPasswordResult] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ phone: string; password: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newDriver, setNewDriver] = useState({
    name: "",
    phone: "",
    email: "",
  });
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const loadDrivers = async () => {
    if (!user?.transporterId) return;
    setLoading(true);
    try {
      const [driversData, docsData] = await Promise.all([
        api.users.list({ transporterId: user.transporterId, role: "driver" }),
        api.documents.list({ transporterId: user.transporterId }),
      ]);
      setDrivers(Array.isArray(driversData) ? driversData : []);
      const driverDocs = Array.isArray(docsData) ? docsData.filter((d: any) => d.entityType === "driver") : [];
      setDocuments(driverDocs);
    } catch (error) {
      console.error("Failed to load drivers:", error);
      toast.error("Failed to load drivers");
    } finally {
      setLoading(false);
    }
  };

  const getDriverDocuments = (driverId: string) => {
    return documents.filter(d => d.userId === driverId);
  };

  const getDocStatusIcon = (status: string) => {
    switch (status) {
      case "verified": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "pending": return <Clock className="h-3 w-3 text-yellow-500" />;
      case "rejected": return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return <AlertCircle className="h-3 w-3 text-gray-400" />;
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [user?.transporterId]);

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await api.transporters.addDriver({
        name: newDriver.name,
        phone: newDriver.phone,
        email: newDriver.email || undefined,
      });
      
      if (result.error) {
        toast.error(result.error);
      } else {
        // Show credentials dialog
        setCredentials(result.credentials);
        setShowAddDialog(false);
        setShowCredentialsDialog(true);
        setNewDriver({ name: "", phone: "", email: "" });
        loadDrivers();
      }
    } catch (error) {
      toast.error("Failed to add driver");
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleResetPassword = async () => {
    if (!resetPasswordDriver) return;
    
    try {
      const result = await api.transporters.resetDriverPassword(resetPasswordDriver.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        setNewPasswordResult(result.newPassword);
        toast.success("Password reset successfully!");
      }
    } catch (error) {
      toast.error("Failed to reset password");
    }
  };

  const openResetPasswordDialog = (driver: any) => {
    setResetPasswordDriver(driver);
    setNewPasswordResult(null);
    setShowResetPasswordDialog(true);
  };

  const filteredDrivers = drivers.filter(driver => 
    driver.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    driver.phone?.includes(searchQuery)
  );

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <TransporterSidebar />
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Users className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Manage Drivers</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search drivers..." 
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-drivers"
            />
          </div>
          
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-driver">
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddDriver} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                    required
                    data-testid="input-driver-name"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    value={newDriver.phone}
                    onChange={(e) => setNewDriver({...newDriver, phone: e.target.value})}
                    required
                    data-testid="input-driver-phone"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={newDriver.email}
                    onChange={(e) => setNewDriver({...newDriver, email: e.target.value})}
                    data-testid="input-driver-email"
                  />
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Key className="h-4 w-4" />
                    <span>Password will be auto-generated</span>
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Login credentials will be shown after adding the driver</p>
                </div>
                <Button type="submit" className="w-full" data-testid="button-submit-driver">
                  Add Driver
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Credentials Dialog */}
        <Dialog open={showCredentialsDialog} onOpenChange={setShowCredentialsDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-green-600" />
                Driver Login Credentials
              </DialogTitle>
            </DialogHeader>
            {credentials && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Share these credentials with the driver so they can log in:
                </p>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-mono font-semibold">{credentials.phone}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => copyToClipboard(credentials.phone)}
                      data-testid="button-copy-phone"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Password</p>
                      <p className="font-mono font-semibold">{credentials.password}</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => copyToClipboard(credentials.password)}
                      data-testid="button-copy-password"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                  This is the only time the password will be shown. Please save or share it now.
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    setShowCredentialsDialog(false);
                    setCredentials(null);
                  }}
                  data-testid="button-close-credentials"
                >
                  Done
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-blue-600" />
                Reset Driver Password
              </DialogTitle>
            </DialogHeader>
            {resetPasswordDriver && (
              <div className="space-y-4">
                {!newPasswordResult ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Generate a new password for <strong>{resetPasswordDriver.name}</strong>?
                    </p>
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      The driver will need to use the new password to log in.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => setShowResetPasswordDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={handleResetPassword}
                        data-testid="button-confirm-reset-password"
                      >
                        Generate New Password
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      New password for <strong>{resetPasswordDriver.name}</strong>:
                    </p>
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="font-mono font-semibold">{resetPasswordDriver.phone}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => copyToClipboard(resetPasswordDriver.phone)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">New Password</p>
                          <p className="font-mono font-semibold text-lg">{newPasswordResult}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => copyToClipboard(newPasswordResult)}
                          data-testid="button-copy-new-password"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                      This is the only time the new password will be shown. Please save or share it now.
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        setShowResetPasswordDialog(false);
                        setResetPasswordDriver(null);
                        setNewPasswordResult(null);
                      }}
                      data-testid="button-close-reset-password"
                    >
                      Done
                    </Button>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>Loading drivers...</p>
          </div>
        ) : filteredDrivers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => (
              <Card key={driver.id} data-testid={`driver-card-${driver.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold truncate">{driver.name}</h3>
                        <Badge variant={driver.isOnline ? "default" : "secondary"}>
                          {driver.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{driver.phone}</span>
                        </div>
                        {driver.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{driver.email}</span>
                          </div>
                        )}
                      </div>
                      {driver.rating && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">Rating: {driver.rating}/5</span>
                        </div>
                      )}
                      {/* Reset Password Button */}
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openResetPasswordDialog(driver)}
                          className="w-full text-xs"
                          data-testid={`button-reset-password-${driver.id}`}
                        >
                          <Key className="h-3 w-3 mr-1" />
                          Reset Password
                        </Button>
                      </div>
                      {/* Driver Documents */}
                      {getDriverDocuments(driver.id).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Documents
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {getDriverDocuments(driver.id).map(doc => (
                              <Badge 
                                key={doc.id} 
                                variant="outline" 
                                className={`text-xs ${
                                  doc.status === "verified" 
                                    ? "bg-green-50 text-green-700 border-green-200" 
                                    : doc.status === "pending"
                                    ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                                data-testid={`doc-badge-${doc.id}`}
                              >
                                {getDocStatusIcon(doc.status)}
                                <span className="ml-1">{doc.documentName}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No drivers yet</h3>
              <p className="text-gray-500 mb-4">Add drivers to your fleet to start assigning them to rides.</p>
              <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-first-driver">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Driver
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
