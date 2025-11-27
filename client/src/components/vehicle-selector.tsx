import { MOCK_USER } from "@/lib/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Truck, IndianRupee } from "lucide-react";
import { useState } from "react";

interface VehicleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (vehicleId: string, bidAmount: string) => void;
  basePrice?: number;
}

export function VehicleSelector({ open, onOpenChange, onConfirm, basePrice }: VehicleSelectorProps) {
  const [selectedVehicle, setSelectedVehicle] = useState(MOCK_USER.vehicles[0].id);
  const [bidAmount, setBidAmount] = useState(basePrice ? basePrice.toString() : "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Accept Ride</DialogTitle>
          <DialogDescription>
            Select vehicle and enter your bid amount.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Select Vehicle</Label>
            <RadioGroup value={selectedVehicle} onValueChange={setSelectedVehicle} className="space-y-3">
              {MOCK_USER.vehicles.map((vehicle) => (
                <div key={vehicle.id} className="flex items-center space-x-2 border p-3 rounded-lg hover:bg-gray-50 cursor-pointer [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5">
                  <RadioGroupItem value={vehicle.id} id={vehicle.id} />
                  <Label htmlFor={vehicle.id} className="flex-1 flex items-center cursor-pointer">
                    <div className="bg-gray-100 p-2 rounded-full mr-3">
                      <Truck className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{vehicle.plateNumber}</p>
                      <p className="text-xs text-muted-foreground">{vehicle.type} • {vehicle.capacity}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
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
          <Button onClick={() => onConfirm(selectedVehicle, bidAmount)} disabled={!bidAmount}>
            Submit Bid & Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
