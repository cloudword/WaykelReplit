import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Truck, IndianRupee, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface VehicleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (vehicleId: string, bidAmount: string) => void;
  basePrice?: number;
  vehicles: Array<{ id: string; plateNumber: string; type?: string; capacity?: string; documentStatus?: string }>;
}

export function VehicleSelector({ open, onOpenChange, onConfirm, basePrice, vehicles }: VehicleSelectorProps) {
  const approvedVehicles = useMemo(() => {
    // Prefer RC/document approved vehicles; fallback to all if none approved
    const rcApproved = vehicles?.filter(v => (v.documentStatus || "").toLowerCase() === "approved");
    if (rcApproved?.length) return rcApproved;
    return vehicles || [];
  }, [vehicles]);

  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(approvedVehicles[0]?.id || null);
  const [bidAmount, setBidAmount] = useState(basePrice ? basePrice.toString() : "");
  const [isBidSent, setIsBidSent] = useState(false);

  useEffect(() => {
    // Reset selected vehicle when list changes or dialog opens
    if (open) {
      setSelectedVehicle((prev) => prev && approvedVehicles.some(v => v.id === prev) ? prev : (approvedVehicles[0]?.id || null));
    }
  }, [open, approvedVehicles]);

  const handleConfirm = () => {
    if (!selectedVehicle) return;
    setIsBidSent(true);
    setTimeout(() => {
      onConfirm(selectedVehicle, bidAmount);
      setIsBidSent(false); // Reset for next time
    }, 2000);
  };

  if (isBidSent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md text-center py-10">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 animate-in zoom-in duration-300">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </div>
          <DialogTitle className="text-xl mb-2">Bid Placed Successfully!</DialogTitle>
          <DialogDescription>
            Your offer of ₹{bidAmount} has been sent to the admin for approval. You will be notified once confirmed.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Place Bid</DialogTitle>
          <DialogDescription>
            Select vehicle and enter your bid amount to request this load.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Select Vehicle</Label>
            {approvedVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicles available. Please add a vehicle and get RC approved.</p>
            ) : (
              <RadioGroup value={selectedVehicle || undefined} onValueChange={setSelectedVehicle} className="space-y-3">
                {approvedVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                    <RadioGroupItem value={vehicle.id} id={vehicle.id} />
                    <Label htmlFor={vehicle.id} className="flex-1 flex items-center cursor-pointer">
                      <div className="bg-gray-100 p-2 rounded-full mr-3">
                        <Truck className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium">{vehicle.plateNumber}</p>
                        <p className="text-xs text-muted-foreground">{vehicle.type || "Vehicle"}{vehicle.capacity ? ` • ${vehicle.capacity}` : ""}</p>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>

          <div className="space-y-3">
            <Label htmlFor="bid" className="text-sm font-medium text-gray-700">Your Offer (Bid)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input 
                id="bid" 
                type="number" 
                value={bidAmount} 
                onChange={(e) => setBidAmount(e.target.value)}
                className="pl-9 h-12 text-lg font-semibold"
                placeholder={basePrice ? basePrice.toString() : "0"}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Client's Budget: ₹{basePrice}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!bidAmount || !selectedVehicle || approvedVehicles.length === 0}>
            Place Bid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
