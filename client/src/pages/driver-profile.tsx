import { MobileNav } from "@/components/layout/mobile-nav";
import { MOCK_USER } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FileText, Truck, LogOut, Star, ChevronRight, ShieldCheck } from "lucide-react";

export default function DriverProfile() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-6 pb-8">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-4 border-blue-50">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>RK</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{MOCK_USER.name}</h1>
            <p className="text-muted-foreground text-sm mb-1">{MOCK_USER.phone}</p>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
              <span className="font-medium">{MOCK_USER.rating}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="p-4 -mt-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Registered Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_USER.vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-gray-50 p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{vehicle.plateNumber}</p>
                  <p className="text-xs text-muted-foreground">{vehicle.type} • {vehicle.capacity}</p>
                </div>
                <Badge variant={vehicle.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                  {vehicle.status}
                </Badge>
              </div>
            ))}
            <Button variant="outline" className="w-full text-primary border-dashed border-primary/30">
              + Add New Vehicle
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {['Driving License', 'Aadhar Card', 'Vehicle Insurance', 'Fitness Certificate'].map((doc, i) => (
              <div key={i} className="flex justify-between items-center py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 px-2 -mx-2 rounded">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{doc}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </CardContent>
        </Card>
        
        <Button variant="destructive" className="w-full mt-4" onClick={() => window.location.href = '/'}>
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </Button>
      </main>

      <MobileNav />
    </div>
  );
}
