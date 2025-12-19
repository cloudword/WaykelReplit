import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Truck, User } from "lucide-react";
import { api, API_BASE } from "@/lib/api";

export default function TransporterSettings() {
  const [_, setLocation] = useLocation();
  const [isSelfDriver, setIsSelfDriver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem("currentUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      setUser(parsed);
      setIsSelfDriver(parsed.isSelfDriver || false);
    }
  }, []);

  const handleSelfDriverToggle = async (checked: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isSelfDriver: checked }),
      });

      // Parse response body exactly once
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        toast.error(data.error || "Failed to update setting");
        return;
      }
      
      setIsSelfDriver(checked);
      
      // Update localStorage with fresh user data from server
      if (data.user) {
        const updatedUser = { 
          ...user, 
          ...data.user,
          isSelfDriver: data.user.isSelfDriver || false 
        };
        // Store fresh token if provided for immediate effect
        if (data.token) {
          updatedUser.token = data.token;
          updatedUser.tokenType = data.tokenType || "Bearer";
          updatedUser.expiresIn = data.expiresIn;
        }
        setUser(updatedUser);
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      }

      toast.success(checked 
        ? "You can now access the Driver app" 
        : "Self-driver mode disabled"
      );
    } catch (error) {
      console.error("Failed to update self-driver status:", error);
      toast.error("Failed to update setting");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <TransporterSidebar />
      <main className="flex-1 ml-64 p-8 bg-gray-50">
        <div className="max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <Settings className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-muted-foreground">Manage your account preferences</p>
            </div>
          </div>

          <div className="space-y-6">
            <Card data-testid="card-self-driver-settings">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-emerald-600" />
                  Driver Mode
                </CardTitle>
                <CardDescription>
                  Enable this if you also drive your own vehicles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 rounded-full">
                      <User className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <Label 
                        htmlFor="self-driver-toggle" 
                        className="text-base font-medium cursor-pointer"
                      >
                        I also drive my vehicle
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {isSelfDriver 
                          ? "You can access both Transporter and Driver apps" 
                          : "Enable to access Driver app and take trips yourself"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="self-driver-toggle"
                    checked={isSelfDriver}
                    onCheckedChange={handleSelfDriverToggle}
                    disabled={loading}
                    data-testid="switch-self-driver"
                  />
                </div>

                {isSelfDriver && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <p className="text-sm text-emerald-800 font-medium mb-2">
                      Self-Driver Mode Active
                    </p>
                    <p className="text-sm text-emerald-700 mb-3">
                      You can now access the Driver app to accept and complete trips yourself.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/driver")}
                      className="border-emerald-600 text-emerald-700 hover:bg-emerald-100"
                      data-testid="button-open-driver-app"
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      Open Driver App
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
