import { MOCK_USER } from "@/lib/mockData";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Truck } from "lucide-react";
import { useState } from "react";

interface VehicleSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (vehicleId: string) => void;
}

export function VehicleSelector({ open, onOpenChange, onConfirm }: VehicleSelectorProps) {
  const [selectedVehicle, setSelectedVehicle] = useState(MOCK_USER.vehicles[0].id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Vehicle</DialogTitle>
          <DialogDescription>
            Please confirm which vehicle you will use for this trip.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
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
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onConfirm(selectedVehicle)}>Confirm & Start</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
