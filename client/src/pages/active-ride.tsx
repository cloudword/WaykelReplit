import { useLocation, useRoute } from "wouter";
import { MOCK_RIDES } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Phone, MessageSquare, MapPin, Navigation, IndianRupee, Shield, AlertCircle } from "lucide-react";
import mapRouteImage from "@assets/generated_images/gps_navigation_route_map.png";

export default function ActiveRide() {
  const [_, params] = useRoute("/driver/active-ride/:id");
  const [__, setLocation] = useLocation();
  
  const ride = MOCK_RIDES.find(r => r.id === params?.id);

  if (!ride) return <div>Ride not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Map Area - Taking up top half */}
      <div className="relative h-[45vh] w-full bg-gray-200">
        <Button 
          variant="secondary" 
          size="icon" 
          className="absolute top-4 left-4 z-10 rounded-full shadow-md"
          onClick={() => setLocation("/driver")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <img 
          src={mapRouteImage} 
          alt="Route Map" 
          className="w-full h-full object-cover"
        />
        
        {/* Navigation Overlay */}
        <div className="absolute bottom-4 right-4">
          <Button className="rounded-full h-12 px-6 shadow-lg gap-2">
            <Navigation className="h-5 w-5" />
            Start Navigation
          </Button>
        </div>
      </div>

      {/* Bottom Sheet Content */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] p-6 pb-safe-area-bottom overflow-y-auto">
        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

        <div className="space-y-6">
          {/* Customer Card */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-gray-100">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {ride.customerName?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-bold text-lg">{ride.customerName}</h3>
                <p className="text-sm text-muted-foreground">Customer</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="icon" variant="outline" className="rounded-full h-10 w-10 border-green-200 bg-green-50 text-green-600">
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="rounded-full h-10 w-10 border-blue-200 bg-blue-50 text-blue-600">
                <MessageSquare className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Route Details */}
          <div className="space-y-6 relative">
            <div className="absolute left-[11px] top-2 bottom-8 w-0.5 bg-gray-200" />
            
            <div className="flex gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-green-100 border-4 border-white shadow-sm flex items-center justify-center shrink-0 z-10">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">PICKUP</p>
                <p className="font-semibold text-gray-900 leading-tight">{ride.pickupLocation}</p>
                <p className="text-xs text-gray-500 mt-1">Gate 4, Warehouse Complex</p>
              </div>
            </div>

            <div className="flex gap-4 relative">
              <div className="w-6 h-6 rounded-full bg-red-100 border-4 border-white shadow-sm flex items-center justify-center shrink-0 z-10">
                <div className="w-2 h-2 bg-red-600 rounded-full" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium mb-1">DROP OFF</p>
                <p className="font-semibold text-gray-900 leading-tight">{ride.dropLocation}</p>
                <p className="text-xs text-gray-500 mt-1">{ride.distance} • Est. 45 mins</p>
              </div>
            </div>
          </div>

          {/* Trip Finances */}
          <Card className="bg-gray-50 border-none">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Trip Earnings</p>
                <div className="flex items-center text-xl font-bold text-gray-900">
                  <IndianRupee className="h-5 w-5" />
                  {ride.price}
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Incentive</p>
                <div className="flex items-center justify-end text-sm font-bold text-green-600">
                  + <IndianRupee className="h-3 w-3" />
                  {Math.floor(ride.price * 0.05)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Button */}
          <div className="pt-2">
            <Button className="w-full h-14 text-lg font-bold shadow-xl shadow-primary/20 rounded-xl">
              Start Trip
            </Button>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400">
              <Shield className="h-3 w-3" />
              <span>Waykel Secure Trip</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
