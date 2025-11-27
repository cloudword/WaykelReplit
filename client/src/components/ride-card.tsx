import { Ride } from "@/lib/mockData";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, IndianRupee, Package } from "lucide-react";

interface RideCardProps {
  ride: Ride;
  onAccept?: () => void;
  isReadOnly?: boolean;
}

export function RideCard({ ride, onAccept, isReadOnly = false }: RideCardProps) {
  return (
    <Card className="overflow-hidden border-none shadow-md">
      <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
        <Badge variant="outline" className="bg-white font-normal text-xs">
          {ride.distance}
        </Badge>
        <Badge 
          variant={ride.status === 'completed' ? 'secondary' : 'default'} 
          className="uppercase text-[10px]"
        >
          {ride.status}
        </Badge>
      </div>
      
      <CardContent className="pt-4 pb-2 relative">
        {/* Timeline Line */}
        <div className="absolute left-[27px] top-[28px] bottom-[28px] w-0.5 bg-gray-200 border-l border-dashed border-gray-300" />
        
        <div className="space-y-6">
          {/* Pickup */}
          <div className="flex gap-3 relative">
            <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-white mt-1.5 z-10 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Pickup</p>
              <h3 className="font-semibold text-sm">{ride.pickupLocation}</h3>
              <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                <Clock className="h-3 w-3" /> {ride.pickupTime}
              </div>
            </div>
          </div>

          {/* Drop */}
          <div className="flex gap-3 relative">
            <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-white mt-1.5 z-10 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Drop</p>
              <h3 className="font-semibold text-sm">{ride.dropLocation}</h3>
              {ride.dropTime && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  <Clock className="h-3 w-3" /> {ride.dropTime}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 bg-blue-50/50 p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">{ride.cargoType} ({ride.weight})</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between items-center pt-2 pb-4 border-t border-gray-50 bg-white">
        <div className="text-lg font-bold flex items-center text-primary">
          <IndianRupee className="h-4 w-4" />
          {ride.price}
        </div>
        
        {!isReadOnly && onAccept && (
          <Button onClick={onAccept} className="px-6">
            Accept Load
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
