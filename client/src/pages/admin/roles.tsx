import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Plus, Edit, Trash2, Users, Lock, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  approve_transporters: "Approve Transporters",
  approve_drivers: "Approve Drivers",
  manage_bids: "Manage Bids",
  accept_bids: "Accept Bids",
  view_reports: "View Reports",
  manage_users: "Manage Users",
  manage_roles: "Manage Roles",
  manage_rides: "Manage Rides",
  view_api_logs: "View API Logs",
  manage_documents: "Manage Documents",
  manage_vehicles: "Manage Vehicles",
};

export default function AdminRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.all([
        api.roles.list(),
        api.roles.getPermissions(),
      ]);
      
      // Handle error responses gracefully
      if (rolesData?.error) {
        console.error("Roles API error:", rolesData.error);
        setRoles([]);
      } else {
        setRoles(Array.isArray(rolesData) ? rolesData : []);
      }
      
      if (permsData?.error) {
        console.error("Permissions API error:", permsData.error);
        setPermissions([]);
      } else {
        setPermissions(Array.isArray(permsData) ? permsData : []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
      toast.error("Failed to load roles data");
      setRoles([]);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setFormData({ name: "", description: "", permissions: [] });
    setShowCreateDialog(true);
  };

  const openEditDialog = (role: Role) => {
    if (!role) return;
    setSelectedRole(role);
    setFormData({
      name: role.name || "",
      description: role.description || "",
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const togglePermission = (permission: string) => {
    setFormData(prev => {
      const currentPerms = prev.permissions || [];
      return {
        ...prev,
        permissions: currentPerms.includes(permission)
          ? currentPerms.filter(p => p !== permission)
          : [...currentPerms, permission],
      };
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await api.roles.create(formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role created successfully");
        setShowCreateDialog(false);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to create role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedRole || !formData.name.trim()) {
      toast.error("Role name is required");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await api.roles.update(selectedRole.id, formData);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role updated successfully");
        setShowEditDialog(false);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRole) return;
    
    setIsSubmitting(true);
    try {
      const result = await api.roles.delete(selectedRole.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Role deleted successfully");
        setShowDeleteDialog(false);
        loadData();
      }
    } catch (error) {
      toast.error("Failed to delete role");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <AdminSidebar />
      
      <main className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
            <p className="text-gray-600">Manage user roles and their permissions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={openCreateDialog} data-testid="button-create-role">
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(roles || []).length}</p>
                <p className="text-sm text-gray-600">Total Roles</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Lock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(permissions || []).length}</p>
                <p className="text-sm text-gray-600">Available Permissions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{(roles || []).filter(r => r?.isSystem).length}</p>
                <p className="text-sm text-gray-600">System Roles</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Roles</CardTitle>
            <CardDescription>View and manage all roles in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading roles...</div>
            ) : (roles || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No roles found. Create your first role.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(roles || []).map((role) => (
                    <TableRow key={role.id} data-testid={`role-row-${role.id}`}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell className="text-gray-600 max-w-xs truncate">
                        {role.description || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(role.permissions || []).slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="secondary" className="text-xs">
                              {PERMISSION_LABELS[perm] || perm}
                            </Badge>
                          ))}
                          {(role.permissions || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(role.permissions || []).length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {role.isSystem ? (
                          <Badge className="bg-purple-600">System</Badge>
                        ) : (
                          <Badge variant="outline">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(role)}
                            disabled={role.isSystem}
                            data-testid={`button-edit-role-${role.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(role)}
                            disabled={role.isSystem}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-role-${role.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Define a new role with specific permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Operations Manager"
                data-testid="input-role-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this role can do..."
                data-testid="input-role-description"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 p-4 border rounded-lg bg-gray-50">
                {(permissions || []).length === 0 ? (
                  <p className="text-sm text-gray-500 col-span-2">No permissions available</p>
                ) : (permissions || []).map((permission) => (
                  <div key={permission} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${permission}`}
                      checked={(formData.permissions || []).includes(permission)}
                      onCheckedChange={() => togglePermission(permission)}
                      data-testid={`checkbox-permission-${permission}`}
                    />
                    <Label htmlFor={`perm-${permission}`} className="text-sm font-normal cursor-pointer">
                      {PERMISSION_LABELS[permission] || permission}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting} data-testid="button-submit-role">
              {isSubmitting ? "Creating..." : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>Modify the role's name, description, and permissions</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Role Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-role-name"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                data-testid="input-edit-role-description"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-2 mt-2 p-4 border rounded-lg bg-gray-50">
                {(permissions || []).length === 0 ? (
                  <p className="text-sm text-gray-500 col-span-2">No permissions available</p>
                ) : (permissions || []).map((permission) => (
                  <div key={permission} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-perm-${permission}`}
                      checked={(formData.permissions || []).includes(permission)}
                      onCheckedChange={() => togglePermission(permission)}
                    />
                    <Label htmlFor={`edit-perm-${permission}`} className="text-sm font-normal cursor-pointer">
                      {PERMISSION_LABELS[permission] || permission}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isSubmitting} data-testid="button-update-role">
              {isSubmitting ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the role "{selectedRole?.name}"? 
              This will remove the role from all users who have it assigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting} data-testid="button-confirm-delete">
              {isSubmitting ? "Deleting..." : "Delete Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
