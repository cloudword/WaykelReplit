import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, MoreHorizontal, Building2, Download, Plus, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Transporter {
  id: string;
  companyName: string;
  ownerName: string;
  contact: string;
  email: string;
  location: string;
  baseCity: string;
  fleetSize: number;
  status: string;
  preferredRoutes?: string[];
  createdAt: string;
}

export default function AdminTransporters() {
  const [transporters, setTransporters] = useState<Transporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newTransporter, setNewTransporter] = useState({
    companyName: "",
    ownerName: "",
    contact: "",
    email: "",
    location: "",
    fleetSize: "1",
  });

  const fetchTransporters = async () => {
    try {
      setLoading(true);
      const data = await api.transporters.list();
      if (Array.isArray(data)) {
        setTransporters(data);
      }
    } catch (error) {
      toast.error("Failed to fetch transporters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransporters();
  }, []);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await api.transporters.updateStatus(id, newStatus);
      toast.success(`Transporter ${newStatus === 'active' ? 'approved' : 'status updated'}`);
      fetchTransporters();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleAddTransporter = async () => {
    if (!newTransporter.companyName || !newTransporter.ownerName || !newTransporter.contact || !newTransporter.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await api.transporters.create({
        companyName: newTransporter.companyName,
        ownerName: newTransporter.ownerName,
        contact: newTransporter.contact,
        email: newTransporter.email || `${newTransporter.contact}@waykel.com`,
        location: newTransporter.location,
        baseCity: newTransporter.location,
        fleetSize: parseInt(newTransporter.fleetSize) || 1,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Transporter added successfully");
        setIsAddDialogOpen(false);
        setNewTransporter({
          companyName: "",
          ownerName: "",
          contact: "",
          email: "",
          location: "",
          fleetSize: "1",
        });
        fetchTransporters();
      }
    } catch (error) {
      toast.error("Failed to add transporter");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransporters = transporters.filter(t => 
    t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending_approval': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Transporters</h1>
            <p className="text-gray-500">Manage fleet owners and logistics companies</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" data-testid="button-export">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-transporter">
                  <Plus className="h-4 w-4 mr-2" /> Add Transporter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Transporter</DialogTitle>
                  <DialogDescription>
                    Enter the details for the new transporter company.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name *</Label>
                    <Input
                      id="company-name"
                      placeholder="ABC Logistics Pvt Ltd"
                      value={newTransporter.companyName}
                      onChange={(e) => setNewTransporter({...newTransporter, companyName: e.target.value})}
                      data-testid="input-add-company-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="owner-name">Owner Name *</Label>
                    <Input
                      id="owner-name"
                      placeholder="Rajesh Kumar"
                      value={newTransporter.ownerName}
                      onChange={(e) => setNewTransporter({...newTransporter, ownerName: e.target.value})}
                      data-testid="input-add-owner-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact">Contact Number *</Label>
                      <Input
                        id="contact"
                        placeholder="9876543210"
                        value={newTransporter.contact}
                        onChange={(e) => setNewTransporter({...newTransporter, contact: e.target.value})}
                        data-testid="input-add-contact"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@company.com"
                        value={newTransporter.email}
                        onChange={(e) => setNewTransporter({...newTransporter, email: e.target.value})}
                        data-testid="input-add-email"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location/City *</Label>
                      <Input
                        id="location"
                        placeholder="Mumbai"
                        value={newTransporter.location}
                        onChange={(e) => setNewTransporter({...newTransporter, location: e.target.value})}
                        data-testid="input-add-location"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fleet-size">Fleet Size</Label>
                      <Input
                        id="fleet-size"
                        type="number"
                        min="1"
                        placeholder="5"
                        value={newTransporter.fleetSize}
                        onChange={(e) => setNewTransporter({...newTransporter, fleetSize: e.target.value})}
                        data-testid="input-add-fleet-size"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTransporter} disabled={isSubmitting} data-testid="button-confirm-add">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Transporter"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 w-full max-w-md">
              <Search className="h-4 w-4 text-gray-500" />
              <Input 
                placeholder="Search company name, owner, or location..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredTransporters.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? "No transporters match your search" : "No transporters found. Add your first transporter!"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Fleet Size</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransporters.map((t) => (
                    <TableRow key={t.id} data-testid={`row-transporter-${t.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-medium">{t.companyName}</span>
                            <p className="text-xs text-gray-500">{t.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{t.ownerName}</p>
                          <p className="text-xs text-gray-500">{t.contact}</p>
                        </div>
                      </TableCell>
                      <TableCell>{t.location}</TableCell>
                      <TableCell>{t.fleetSize} Vehicles</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(t.status)}>
                          {t.status === 'pending_approval' ? 'Pending' : t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${t.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {t.status === 'pending_approval' && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'active')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Approve
                              </DropdownMenuItem>
                            )}
                            {t.status === 'active' && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'suspended')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                Suspend
                              </DropdownMenuItem>
                            )}
                            {t.status === 'suspended' && (
                              <DropdownMenuItem onClick={() => handleStatusUpdate(t.id, 'active')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
