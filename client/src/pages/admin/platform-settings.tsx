import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, DollarSign, AlertCircle, Calculator, Plus, Trash2, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";

interface TierConfig {
  amount: number;
  percent: number;
}

interface PlatformSettings {
  id: string;
  commissionEnabled: boolean;
  commissionMode: "shadow" | "live";
  tierConfig: TierConfig[];
  basePercent: string;
  minFee: string;
  maxFee: string;
  smsEnabled: boolean;
  smsMode: "shadow" | "live";
  smsProvider: "msg91" | null;
  smsTemplates: Record<string, string>;
  updatedByAdminId: string | null;
  updatedAt: string | null;
}

const SMS_TEMPLATE_KEYS = [
  { key: "WAYKEL_OTP", label: "OTP", description: "Login/verification OTPs" },
  { key: "WAYKEL_TRIP_ASSIGN", label: "Trip Assigned", description: "When driver is assigned to a trip" },
  { key: "WAYKEL_BID_ACCEPTED", label: "Bid Accepted", description: "When transporter's bid wins" },
  { key: "WAYKEL_DELIVERY_DONE", label: "Delivery Completed", description: "When delivery is marked complete" },
  { key: "WAYKEL_TRANSPORTER_APPROVED", label: "Transporter Approved", description: "When transporter account is approved" },
  { key: "WAYKEL_TRANSPORTER_REJECTED", label: "Transporter Rejected", description: "When transporter account is rejected" },
];

interface FeePreview {
  finalPrice: number;
  platformFee: number;
  platformFeePercent: number;
  transporterEarning: number;
  shadowPlatformFee: number;
  shadowPlatformFeePercent: number;
  commissionEnabled: boolean;
  commissionMode: string;
}

async function fetchSettings(): Promise<PlatformSettings> {
  const res = await fetch(`${API_BASE}/admin/platform-settings`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

async function updateSettings(data: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const res = await fetch(`${API_BASE}/admin/platform-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error("Failed to update settings");
  return res.json();
}

async function previewFee(amount: number): Promise<FeePreview> {
  const res = await fetch(`${API_BASE}/admin/platform-settings/preview/${amount}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to preview fee");
  return res.json();
}

export default function PlatformSettingsPage() {
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: fetchSettings
  });

  const [commissionEnabled, setCommissionEnabled] = useState(false);
  const [commissionMode, setCommissionMode] = useState<"shadow" | "live">("shadow");
  const [tierConfig, setTierConfig] = useState<TierConfig[]>([]);
  const [basePercent, setBasePercent] = useState("10");
  const [minFee, setMinFee] = useState("50");
  const [maxFee, setMaxFee] = useState("5000");
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsMode, setSmsMode] = useState<"shadow" | "live">("shadow");
  const [smsProvider, setSmsProvider] = useState<"msg91" | null>(null);
  const [smsTemplates, setSmsTemplates] = useState<Record<string, string>>({});
  const [previewAmount, setPreviewAmount] = useState("10000");
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null);

  useEffect(() => {
    if (settings) {
      setCommissionEnabled(settings.commissionEnabled ?? false);
      setCommissionMode(settings.commissionMode ?? "shadow");
      setTierConfig(settings.tierConfig ?? []);
      setBasePercent(settings.basePercent ?? "10");
      setMinFee(settings.minFee ?? "50");
      setMaxFee(settings.maxFee ?? "5000");
      setSmsEnabled(settings.smsEnabled ?? false);
      setSmsMode(settings.smsMode ?? "shadow");
      setSmsProvider(settings.smsProvider ?? null);
      setSmsTemplates(settings.smsTemplates ?? {});
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Platform settings updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update settings");
    }
  });

  const handleSave = () => {
    mutation.mutate({
      commissionEnabled,
      commissionMode,
      tierConfig,
      basePercent,
      minFee,
      maxFee,
      smsEnabled,
      smsMode,
      smsProvider,
      smsTemplates
    });
  };

  const handlePreview = async () => {
    const amount = parseFloat(previewAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    try {
      const preview = await previewFee(amount);
      setFeePreview(preview);
    } catch {
      toast.error("Failed to preview fee calculation");
    }
  };

  const addTier = () => {
    setTierConfig([...tierConfig, { amount: 0, percent: 10 }]);
  };

  const removeTier = (index: number) => {
    setTierConfig(tierConfig.filter((_, i) => i !== index));
  };

  const updateTier = (index: number, field: "amount" | "percent", value: number) => {
    const newTiers = [...tierConfig];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTierConfig(newTiers);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pl-64">
        <AdminSidebar />
        <main className="p-8">
          <div className="animate-pulse">Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 pl-64">
        <AdminSidebar />
        <main className="p-8">
          <div className="text-red-500">Failed to load platform settings. Make sure you are a Super Admin.</div>
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
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">
              Monetization Control
            </h1>
            <p className="text-gray-500">Manage platform commission settings</p>
          </div>
          <Button onClick={handleSave} disabled={mutation.isPending} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Commission Settings
              </CardTitle>
              <CardDescription>
                Control platform commission collection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="commission-enabled">Commission Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, no platform fee is charged (0%)
                  </p>
                </div>
                <Switch
                  id="commission-enabled"
                  checked={commissionEnabled}
                  onCheckedChange={setCommissionEnabled}
                  data-testid="switch-commission-enabled"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="commission-mode">Commission Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    {commissionMode === "shadow" 
                      ? "Shadow: Fees calculated but not charged" 
                      : "Live: Fees are actually deducted"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={commissionMode === "shadow" ? "secondary" : "destructive"}>
                    {commissionMode === "shadow" ? "Shadow" : "Live"}
                  </Badge>
                  <Switch
                    id="commission-mode"
                    checked={commissionMode === "live"}
                    onCheckedChange={(checked) => setCommissionMode(checked ? "live" : "shadow")}
                    data-testid="switch-commission-mode"
                  />
                </div>
              </div>

              {commissionMode === "live" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Warning:</strong> Live mode will deduct actual platform fees from transporter earnings.
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="base-percent">Base Fee Percentage (%)</Label>
                  <Input
                    id="base-percent"
                    type="number"
                    value={basePercent}
                    onChange={(e) => setBasePercent(e.target.value)}
                    min="0"
                    max="100"
                    step="0.5"
                    data-testid="input-base-percent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="min-fee">Minimum Fee (₹)</Label>
                    <Input
                      id="min-fee"
                      type="number"
                      value={minFee}
                      onChange={(e) => setMinFee(e.target.value)}
                      min="0"
                      data-testid="input-min-fee"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="max-fee">Maximum Fee (₹)</Label>
                    <Input
                      id="max-fee"
                      type="number"
                      value={maxFee}
                      onChange={(e) => setMaxFee(e.target.value)}
                      min="0"
                      data-testid="input-max-fee"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Tier Configuration
              </CardTitle>
              <CardDescription>
                Configure fee tiers based on bid amount (higher amounts can get lower fees)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tierConfig.map((tier, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Amount ≥</Label>
                    <Input
                      type="number"
                      value={tier.amount}
                      onChange={(e) => updateTier(index, "amount", parseFloat(e.target.value) || 0)}
                      placeholder="Amount threshold"
                      data-testid={`input-tier-amount-${index}`}
                    />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs text-muted-foreground">Fee %</Label>
                    <Input
                      type="number"
                      value={tier.percent}
                      onChange={(e) => updateTier(index, "percent", parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.5"
                      data-testid={`input-tier-percent-${index}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTier(index)}
                    className="mt-5"
                    data-testid={`button-remove-tier-${index}`}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addTier} className="w-full" data-testid="button-add-tier">
                <Plus className="h-4 w-4 mr-2" />
                Add Tier
              </Button>
              <p className="text-xs text-muted-foreground">
                Tiers are matched from highest to lowest. If bid is ≥ threshold, that tier's % applies.
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Fee Calculator Preview
              </CardTitle>
              <CardDescription>
                Test fee calculations with the current settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="preview-amount">Test Bid Amount (₹)</Label>
                  <Input
                    id="preview-amount"
                    type="number"
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(e.target.value)}
                    placeholder="Enter amount"
                    data-testid="input-preview-amount"
                  />
                </div>
                <Button onClick={handlePreview} data-testid="button-calculate-preview">
                  Calculate
                </Button>
              </div>

              {feePreview && (
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Bid Amount</p>
                    <p className="text-2xl font-bold" data-testid="text-preview-final-price">
                      ₹{feePreview.finalPrice.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Platform Fee {feePreview.commissionEnabled ? "(Active)" : "(Disabled)"}
                    </p>
                    <p className="text-2xl font-bold text-orange-600" data-testid="text-preview-platform-fee">
                      ₹{feePreview.platformFee.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {feePreview.platformFeePercent}%
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Transporter Earning</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-preview-transporter-earning">
                      ₹{feePreview.transporterEarning.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600">Shadow Fee (If Enabled)</p>
                    <p className="text-2xl font-bold text-blue-700" data-testid="text-preview-shadow-fee">
                      ₹{feePreview.shadowPlatformFee.toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-500">
                      {feePreview.shadowPlatformFeePercent}%
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                SMS Settings
              </CardTitle>
              <CardDescription>
                Control SMS notifications and OTP delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-enabled">SMS Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    When disabled, no SMS messages are sent
                  </p>
                </div>
                <Switch
                  id="sms-enabled"
                  checked={smsEnabled}
                  onCheckedChange={setSmsEnabled}
                  data-testid="switch-sms-enabled"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-mode">SMS Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    {smsMode === "shadow" 
                      ? "Shadow: SMS logic runs but messages are logged only" 
                      : "Live: SMS messages are actually sent"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={smsMode === "shadow" ? "secondary" : "destructive"}>
                    {smsMode === "shadow" ? "Shadow" : "Live"}
                  </Badge>
                  <Switch
                    id="sms-mode"
                    checked={smsMode === "live"}
                    onCheckedChange={(checked) => setSmsMode(checked ? "live" : "shadow")}
                    data-testid="switch-sms-mode"
                  />
                </div>
              </div>

              {smsMode === "live" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <strong>Warning:</strong> Live mode will send actual SMS messages. Ensure MSG91 credentials are configured.
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="sms-provider">SMS Provider</Label>
                <Select
                  value={smsProvider || "none"}
                  onValueChange={(value) => setSmsProvider(value === "none" ? null : value as "msg91")}
                >
                  <SelectTrigger id="sms-provider" data-testid="select-sms-provider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Disabled)</SelectItem>
                    <SelectItem value="msg91">MSG91</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the SMS provider to use for OTP and notifications
                </p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>OTP Console Logging:</strong> When SMS is disabled or in shadow mode, OTPs are logged to the server console for testing purposes.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium">DLT Template ID Mapping</Label>
                  <p className="text-sm text-muted-foreground">
                    Map each SMS event to its MSG91 DLT template ID. Required for live mode.
                  </p>
                </div>
                
                <div className="space-y-3">
                  {SMS_TEMPLATE_KEYS.map((template) => (
                    <div key={template.key} className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start p-3 border rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">{template.label}</Label>
                        <p className="text-xs text-muted-foreground">{template.description}</p>
                        <code className="text-xs bg-gray-100 px-1 rounded">{template.key}</code>
                      </div>
                      <Input
                        placeholder="e.g., 110716xxxxxxx"
                        value={smsTemplates[template.key] || ""}
                        onChange={(e) => setSmsTemplates(prev => ({
                          ...prev,
                          [template.key]: e.target.value
                        }))}
                        data-testid={`input-template-${template.key}`}
                      />
                    </div>
                  ))}
                </div>

                {smsMode === "live" && smsProvider === "msg91" && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> All template IDs must be configured for live SMS to work. Missing templates will be skipped.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {settings?.updatedAt && (
          <p className="text-sm text-muted-foreground mt-6">
            Last updated: {new Date(settings.updatedAt).toLocaleString()}
          </p>
        )}
      </main>
    </div>
  );
}
