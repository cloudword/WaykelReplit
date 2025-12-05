import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, Phone, Mail, MapPin, Wallet, CreditCard, 
  Bell, Shield, HelpCircle, LogOut, ChevronRight,
  Package, Truck
} from "lucide-react";

export default function CustomerProfile() {
  const [_, setLocation] = useLocation();
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    setLocation("/auth/login");
  };

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  const menuItems = [
    { icon: Wallet, label: "Wallet & Payments", href: "#" },
    { icon: MapPin, label: "Saved Addresses", href: "#" },
    { icon: Bell, label: "Notifications", href: "/customer/notifications" },
    { icon: Shield, label: "Privacy & Security", href: "#" },
    { icon: HelpCircle, label: "Help & Support", href: "#" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-primary text-white px-4 py-6">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 border-2 border-white">
            <AvatarFallback className="bg-white text-primary text-xl font-bold">
              {user.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm opacity-80">{user.phone}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 -mt-4">
        <Card className="border-none shadow-lg">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Wallet Balance</p>
                <p className="text-2xl font-bold">₹0.00</p>
              </div>
              <Button size="sm">Add Money</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-gray-500">Full Name</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{user.phone}</p>
                <p className="text-xs text-gray-500">Phone Number</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-gray-500">Email Address</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md">
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={index}>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between px-4 py-6 h-auto rounded-none"
                  onClick={() => item.href !== "#" && setLocation(item.href)}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-gray-500" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </Button>
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Button 
          variant="outline" 
          className="w-full h-12 text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="h-5 w-5 mr-2" />
          Logout
        </Button>
      </main>
      
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16">
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/customer")}>
             <Truck size={20} />
             <span className="text-[10px]">Book</span>
           </Button>
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-gray-400 hover:text-gray-600" onClick={() => setLocation("/customer/rides")}>
             <Package size={20} />
             <span className="text-[10px]">My Rides</span>
           </Button>
           <Button variant="ghost" className="flex flex-col gap-1 h-full w-full text-primary">
             <User size={20} />
             <span className="text-[10px]">Profile</span>
           </Button>
        </div>
      </nav>
    </div>
  );
}
