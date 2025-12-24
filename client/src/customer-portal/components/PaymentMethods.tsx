import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CreditCard, Smartphone, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PaymentMethod } from "@shared/schema";

export function PaymentMethods() {
  const { toast } = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUpi, setNewUpi] = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardName, setNewCardName] = useState("");

  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/payment-methods"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: { type: string; name: string; details: string; isDefault?: boolean }) => {
      const response = await apiRequest("POST", "/api/payment-methods", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Payment method added" });
      setIsAddModalOpen(false);
      setNewUpi("");
      setNewCardNumber("");
      setNewCardExpiry("");
      setNewCardName("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add payment method", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Payment method removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove payment method", variant: "destructive" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/payment-methods/${id}/default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment-methods"] });
      toast({ title: "Default payment method updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to set default payment method", variant: "destructive" });
    },
  });

  const handleAddUpi = () => {
    if (!newUpi) return;
    addMutation.mutate({
      type: "upi",
      name: "UPI Account",
      details: newUpi,
      isDefault: paymentMethods.length === 0,
    });
  };

  const handleAddCard = () => {
    if (!newCardNumber || !newCardExpiry || !newCardName) return;
    const last4 = newCardNumber.replace(/\s/g, "").slice(-4);
    addMutation.mutate({
      type: "card",
      name: newCardName,
      details: `**** **** **** ${last4}`,
      isDefault: paymentMethods.length === 0,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Payments</h1>
        <p className="text-muted-foreground">Manage your payment methods</p>
      </div>

      <Card className="border-card-border">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle className="text-lg">Payment Methods</CardTitle>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2" data-testid="button-add-payment">
                <Plus className="w-4 h-4" />
                Add New
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Payment Method</DialogTitle>
                <DialogDescription>Add a new UPI ID or card for payments</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="upi" className="mt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upi" data-testid="tab-upi">
                    <Smartphone className="w-4 h-4 mr-2" />
                    UPI
                  </TabsTrigger>
                  <TabsTrigger value="card" data-testid="tab-card">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Card
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upi" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input id="upi-id" placeholder="yourname@upi" value={newUpi} onChange={e => setNewUpi(e.target.value)} data-testid="input-upi-id" />
                  </div>
                  <Button className="w-full" onClick={handleAddUpi} disabled={addMutation.isPending} data-testid="button-save-upi">
                    {addMutation.isPending ? "Adding..." : "Add UPI"}
                  </Button>
                </TabsContent>
                <TabsContent value="card" className="space-y-4 mt-4">
                  <p className="text-sm text-muted-foreground">For security, we only store the last 4 digits of your card. Full card details are processed securely at checkout.</p>
                  <div className="space-y-2">
                    <Label htmlFor="card-name">Name on Card</Label>
                    <Input id="card-name" placeholder="John Doe" value={newCardName} onChange={e => setNewCardName(e.target.value)} data-testid="input-card-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Card Number</Label>
                    <Input id="card-number" placeholder="1234 5678 9012 3456" value={newCardNumber} onChange={e => setNewCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16))} data-testid="input-card-number" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="card-expiry">Expiry</Label>
                    <Input id="card-expiry" placeholder="MM/YY" value={newCardExpiry} onChange={e => setNewCardExpiry(e.target.value)} data-testid="input-card-expiry" />
                  </div>
                  <Button className="w-full" onClick={handleAddCard} disabled={addMutation.isPending} data-testid="button-save-card">
                    {addMutation.isPending ? "Adding..." : "Add Card"}
                  </Button>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {paymentMethods.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payment methods added yet.</p>
          ) : (
            <div className="grid gap-3">
              {paymentMethods.map(method => (
                <Card key={method.id} className="border-card-border">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {method.type === "upi" ? <Smartphone className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                      <div>
                        <p className="font-medium">{method.name}</p>
                        <p className="text-sm text-muted-foreground">{method.details}</p>
                      </div>
                      {method.isDefault && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Check className="w-3 h-3" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button variant="outline" size="sm" onClick={() => setDefaultMutation.mutate(method.id)} data-testid={`button-default-${method.id}`}>
                          Set Default
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(method.id)} data-testid={`button-delete-${method.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
