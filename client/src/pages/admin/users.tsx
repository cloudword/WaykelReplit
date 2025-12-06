import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, Edit, Key, Shield, Truck, Building2, User as UserIcon, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isSuperAdmin: boolean;
  transporterId: string | null;
  isOnline: boolean;
  rating: string;
  totalTrips: number;
  createdAt: string;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.users.list();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "driver": return <Truck className="h-4 w-4" />;
      case "transporter": return <Building2 className="h-4 w-4" />;
      case "admin": return <Shield className="h-4 w-4" />;
      case "customer": return <UserIcon className="h-4 w-4" />;
      default: return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string, isSuperAdmin: boolean) => {
    if (isSuperAdmin) {
      return <Badge className="bg-purple-600">Super Admin</Badge>;
    }
    switch (role) {
      case "driver": return <Badge className="bg-blue-600">Driver</Badge>;
      case "transporter": return <Badge className="bg-green-600">Transporter</Badge>;
      case "admin": return <Badge className="bg-orange-600">Admin</Badge>;
      case "customer": return <Badge className="bg-gray-600">Customer</Badge>;
      default: return <Badge>{role}</Badge>;
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    });
    setShowEditDialog(true);
  };

  const openPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordDialog(true);
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;
    
    setIsSubmitting(true);
    try {
      const result = await api.users.update(selectedUser.id, editForm);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("User updated successfully");
        setShowEditDialog(false);
        loadUsers();
      }
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!selectedUser) return;
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await api.users.resetPassword(selectedUser.id, newPassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Password reset successfully");
        setShowPasswordDialog(false);
      }
    } catch (error) {
      toast.error("Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const userCounts = {
    all: users.length,
    driver: users.filter(u => u.role === "driver").length,
    transporter: users.filter(u => u.role === "transporter").length,
    customer: users.filter(u => u.role === "customer").length,
    admin: users.filter(u => u.role === "admin").length,
  };

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="page-title">User Management</h1>
            <p className="text-gray-500">View and manage all platform users</p>
          </div>
          <Button onClick={loadUsers} variant="outline" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card className={`cursor-pointer transition-all ${roleFilter === "all" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setRoleFilter("all")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold">{userCounts.all}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">All Users</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${roleFilter === "driver" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setRoleFilter("driver")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Truck className="h-8 w-8 text-blue-600" />
                <span className="text-2xl font-bold">{userCounts.driver}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Drivers</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${roleFilter === "transporter" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setRoleFilter("transporter")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Building2 className="h-8 w-8 text-green-600" />
                <span className="text-2xl font-bold">{userCounts.transporter}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Transporters</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${roleFilter === "customer" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setRoleFilter("customer")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <UserIcon className="h-8 w-8 text-gray-600" />
                <span className="text-2xl font-bold">{userCounts.customer}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Customers</p>
            </CardContent>
          </Card>
          <Card className={`cursor-pointer transition-all ${roleFilter === "admin" ? "ring-2 ring-blue-500" : ""}`} onClick={() => setRoleFilter("admin")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <Shield className="h-8 w-8 text-orange-600" />
                <span className="text-2xl font-bold">{userCounts.admin}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">Admins</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
              <div className="relative w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by name, email or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">Loading users...</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            {getRoleIcon(user.role)}
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-gray-500">ID: {user.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{user.email}</p>
                          <p className="text-sm text-gray-500">{user.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getRoleBadge(user.role, user.isSuperAdmin)}
                      </TableCell>
                      <TableCell>
                        {user.isOnline ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Online</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600">Offline</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openEditDialog(user)}
                            disabled={user.isSuperAdmin}
                            data-testid={`button-edit-${user.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openPasswordDialog(user)}
                            disabled={user.isSuperAdmin}
                            data-testid={`button-reset-password-${user.id}`}
                          >
                            <Key className="h-4 w-4 mr-1" />
                            Reset Password
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                data-testid="input-edit-phone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={editForm.role} onValueChange={(value) => setEditForm({ ...editForm, role: value })}>
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="transporter">Transporter</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting} data-testid="button-save-edit">
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                data-testid="input-confirm-password"
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                This will immediately change the user's password. They will need to use the new password to log in.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
            <Button onClick={handlePasswordReset} disabled={isSubmitting} data-testid="button-reset-confirm">
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
