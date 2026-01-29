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
import { Shield, Mail, Phone, Building2, IndianRupee, Plus } from "lucide-react";

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
      <div className="space-y-8 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Profile Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your personal information and business profile</p>
          </div>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={isEditing ? handleSave : handleEdit}
            disabled={updateMutation.isPending}
            className="h-10 px-6 font-bold transition-all shadow-sm active:scale-95"
            data-testid="button-edit-profile"
          >
            {isEditing ? (updateMutation.isPending ? "Saving Changes..." : "Save Changes") : "Edit Profile Info"}
          </Button>
        </div>

        {/* Header Card */}
        <Card className="border-card-border overflow-hidden shadow-sm">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-blue-500/10 to-transparent" />
          <CardContent className="px-6 pb-6 -mt-10">
            <div className="flex flex-col sm:flex-row items-end gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24 border-4 border-background shadow-xl rounded-2xl">
                  <AvatarFallback className="bg-primary/10 text-primary text-3xl font-black rounded-2xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-green-500 border-2 border-background flex items-center justify-center">
                  <Shield className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black tracking-tight">{userName}</h2>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                    Verified Customer
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wide">
                    Waykel ID: <span className="text-foreground font-mono">{profile?.id?.slice(0, 8)}</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Balance Card - Migrated from Legacy */}
        <Card className="border-card-border bg-primary/5 border-primary/20 shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                  <IndianRupee className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">Wallet Balance</p>
                  <p className="text-3xl font-black tracking-tighter">₹0.00</p>
                </div>
              </div>
              <Button className="h-11 px-8 font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Add Money
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Section: Personal Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Personal Information</h3>
            </div>
            <Card className="border-card-border shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                  <Input
                    id="name"
                    value={isEditing ? formData.name : profile?.name || ""}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    className="h-11 font-medium bg-muted/20 border-border/60"
                    placeholder="Enter your name"
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                  <div className="relative text-muted-foreground">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      className="pl-10 h-11 font-medium bg-muted/20 border-border/60"
                      value={isEditing ? formData.email : profile?.email || ""}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter your email"
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                  <div className="relative text-muted-foreground opacity-70">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <Input
                      id="phone"
                      className="pl-10 h-11 font-medium bg-muted/40 border-border/60 cursor-not-allowed"
                      value={`+91 ${profile?.phone || ""}`}
                      disabled
                      data-testid="input-phone"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic px-1">Contact support to change your primary phone number</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section: Business Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Business Information</h3>
            </div>
            <Card className="border-card-border shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Company Name</Label>
                  <div className="relative text-muted-foreground">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                    <Input
                      id="company"
                      className="pl-10 h-11 font-medium bg-muted/20 border-border/60"
                      value={formData.companyName}
                      onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                      disabled={!isEditing}
                      placeholder="Enter company name"
                      data-testid="input-company"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gst" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">GST Identification Number</Label>
                  <Input
                    id="gst"
                    value={formData.gstNumber}
                    onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                    disabled={!isEditing}
                    className="h-11 font-medium bg-muted/20 border-border/60 uppercase"
                    placeholder="27AAAAA0000A1Z5"
                    data-testid="input-gst"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Registered Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    disabled={!isEditing}
                    className="h-11 font-medium bg-muted/20 border-border/60"
                    placeholder="Enter complete business address"
                    data-testid="input-address"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
