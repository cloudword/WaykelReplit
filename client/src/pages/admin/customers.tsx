import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, MoreHorizontal, Download, Plus, Loader2, Users, Phone, Mail, Eye, Calendar, MapPin, Package, IndianRupee, Ban, CheckCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { API_BASE } from "@/lib/api";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isOnline: boolean;
  totalTrips: number;
  createdAt: string;
}

interface Ride {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  date: string;
  status: string;
  price: string;
  cargoType: string;
  createdAt: string;
  createdById: string;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, ridesRes] = await Promise.all([
        fetch(`${API_BASE}/customers`, { credentials: "include" }),
        fetch(`${API_BASE}/rides`, { credentials: "include" }),
      ]);
      
      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(Array.isArray(customersData) ? customersData : []);
      }
      
      if (ridesRes.ok) {
        const ridesData = await ridesRes.json();
        setRides(Array.isArray(ridesData) ? ridesData : []);
      }
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (newCustomer.phone.length !== 10) {
      toast.error("Phone number must be 10 digits");
      return;
    }

    if (newCustomer.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: newCustomer.name,
          phone: newCustomer.phone,
          email: newCustomer.email || undefined,
          password: newCustomer.password,
          role: "customer",
        }),
      });

      if (response.ok) {
        const userData = await response.json();
        toast.success(`Customer "${userData.name}" added successfully!`);
        setIsAddDialogOpen(false);
        setNewCustomer({ name: "", phone: "", email: "", password: "" });
        fetchData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || errorData.message || "Failed to add customer");
      }
    } catch (error) {
      toast.error("Failed to add customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCustomerRides = (customerId: string) => {
    return rides.filter(r => r.createdById === customerId);
  };

  const getCustomerSpending = (customerId: string) => {
    const customerRides = rides.filter((r: any) => r.createdById === customerId && r.status === "completed");
    return customerRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
  };

  const openCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailDialog(true);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "active": case "in_progress": return "secondary";
      case "pending": return "outline";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  const customerRides = selectedCustomer 
    ? rides.filter((r: any) => r.createdById === selectedCustomer.id)
    : [];

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Customers</h1>
            <p className="text-gray-500">Manage registered customers and their bookings ({customers.length} total)</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2" data-testid="button-export">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-customer">
                  <Plus className="h-4 w-4 mr-2" /> Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                  <DialogDescription>
                    Create a new customer account manually.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">Full Name *</Label>
                    <Input
                      id="customer-name"
                      placeholder="Rahul Sharma"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      data-testid="input-add-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer-phone">Phone Number *</Label>
                      <Input
                        id="customer-phone"
                        placeholder="9876543210"
                        maxLength={10}
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value.replace(/\D/g, '')})}
                        data-testid="input-add-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer-email">Email (Optional)</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        placeholder="email@example.com"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                        data-testid="input-add-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-password">Password *</Label>
                    <Input
                      id="customer-password"
                      type="password"
                      placeholder="Min 6 characters"
                      value={newCustomer.password}
                      onChange={(e) => setNewCustomer({...newCustomer, password: e.target.value})}
                      data-testid="input-add-password"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCustomer} disabled={isSubmitting} data-testid="button-confirm-add">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add Customer"
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
                placeholder="Search by name, email, or phone..." 
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
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                {searchTerm ? "No customers match your search" : "No customers found. Add your first customer!"}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Total Trips</TableHead>
                    <TableHead>Spending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-medium" data-testid={`customer-name-${customer.id}`}>{customer.name}</span>
                            <p className="text-xs text-gray-500">ID: {customer.id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3 text-gray-400" />
                            {customer.phone}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail className="h-3 w-3 text-gray-400" />
                            {customer.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {customer.createdAt ? format(new Date(customer.createdAt), "MMM d, yyyy") : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{getCustomerRides(customer.id).length}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-green-600 font-medium">
                          <IndianRupee className="h-3 w-3" />
                          {getCustomerSpending(customer.id).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.isOnline ? "default" : "secondary"}>
                          {customer.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-actions-${customer.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openCustomerDetails(customer)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(customer.phone);
                              toast.success("Phone copied to clipboard");
                            }}>
                              <Phone className="h-4 w-4 mr-2" />
                              Copy Phone
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(customer.email);
                              toast.success("Email copied to clipboard");
                            }}>
                              <Mail className="h-4 w-4 mr-2" />
                              Copy Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend Account
                            </DropdownMenuItem>
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

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedCustomer && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                      {selectedCustomer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p>{selectedCustomer.name}</p>
                      <p className="text-sm font-normal text-gray-500">Customer since {selectedCustomer.createdAt ? format(new Date(selectedCustomer.createdAt), "MMMM yyyy") : "N/A"}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">{customerRides.length}</p>
                        <p className="text-sm text-gray-500">Total Bookings</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-green-600">₹{getCustomerSpending(selectedCustomer.id).toLocaleString()}</p>
                        <p className="text-sm text-gray-500">Total Spent</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="font-semibold">Contact Information</h4>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span>{selectedCustomer.phone}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>{selectedCustomer.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>Joined {selectedCustomer.createdAt ? format(new Date(selectedCustomer.createdAt), "MMM d, yyyy") : "N/A"}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <h4 className="font-semibold">Recent Bookings ({customerRides.length})</h4>
                  </CardHeader>
                  <CardContent>
                    {customerRides.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No bookings yet</p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {customerRides.slice(0, 10).map((ride: any) => (
                          <div key={ride.id} className="border rounded-lg p-3">
                            <div className="flex justify-between items-start mb-2">
                              <Badge variant={getStatusColor(ride.status)}>
                                {ride.status}
                              </Badge>
                              <span className="font-semibold text-green-600">₹{parseFloat(ride.price || "0").toLocaleString()}</span>
                            </div>
                            <div className="text-sm space-y-1">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-green-600" />
                                <span className="truncate">{ride.pickupLocation}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-3 h-3 text-red-600" />
                                <span className="truncate">{ride.dropLocation}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-500 text-xs">
                                <Package className="w-3 h-3" />
                                <span>{ride.cargoType || "General"}</span>
                                <span>•</span>
                                <span>{ride.date}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                    Close
                  </Button>
                  <Button variant="destructive">
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend Account
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
