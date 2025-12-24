import { useAuth } from "../lib/auth";
import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, Mail, Phone, Building2 } from "lucide-react";

export default function Profile() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", companyName: "", gstNumber: "", address: "" });

  const profile = user
    ? { id: user.id, phone: user.phone?.replace("+91", "") || "", name: user.name, email: user.email }
    : undefined;

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Profile Updated", description: "Your profile has been updated successfully." });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
    },
  });

  const handleEdit = () => {
    setFormData({
      name: profile?.name || "",
      email: profile?.email || "",
      companyName: formData.companyName,
      gstNumber: formData.gstNumber,
      address: formData.address,
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <DashboardLayout currentPage="/customer/dashboard/profile">
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const userName = profile?.name || "User";
  const initials = userName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <DashboardLayout currentPage="/customer/dashboard/profile">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Profile</h1>
          <p className="text-muted-foreground">Manage your account information and business details</p>
        </div>

        <Card className="border-card-border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{userName}</h2>
                    <Badge variant="secondary" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">+91 {profile?.phone}</p>
                </div>
              </div>
              <Button variant={isEditing ? "default" : "outline"} onClick={isEditing ? handleSave : handleEdit} disabled={updateMutation.isPending} data-testid="button-edit-profile">
                {isEditing ? (updateMutation.isPending ? "Saving..." : "Save Changes") : "Edit Profile"}
              </Button>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={isEditing ? formData.name : profile?.name || ""} onChange={e => setFormData({ ...formData, name: e.target.value })} disabled={!isEditing} placeholder="Enter your name" data-testid="input-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" className="pl-9" value={isEditing ? formData.email : profile?.email || ""} onChange={e => setFormData({ ...formData, email: e.target.value })} disabled={!isEditing} placeholder="Enter your email" data-testid="input-email" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" className="pl-9" value={`+91 ${profile?.phone || ""}`} disabled data-testid="input-phone" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-card-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Business Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="company" className="pl-9" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} disabled={!isEditing} placeholder="Enter company name" data-testid="input-company" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gst">GST Number</Label>
                <Input id="gst" value={formData.gstNumber} onChange={e => setFormData({ ...formData, gstNumber: e.target.value })} disabled={!isEditing} placeholder="Enter GST number" data-testid="input-gst" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} disabled={!isEditing} placeholder="Enter address" data-testid="input-address" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
