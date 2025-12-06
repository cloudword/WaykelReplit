import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Search, Phone, Mail, Calendar, MapPin, Package } from "lucide-react";
import { format } from "date-fns";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isOnline: boolean;
  totalTrips: number;
  createdAt: string;
}

interface Ride {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  date: string;
  status: string;
  price: string;
  cargoType: string;
}

export default function AdminCustomers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      return res.json();
    },
  });

  const { data: customerRides = [] } = useQuery<Ride[]>({
    queryKey: ["/api/rides", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer) return [];
      const res = await fetch(`/api/rides?createdById=${selectedCustomer.id}`);
      return res.json();
    },
    enabled: !!selectedCustomer,
  });

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "active": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">Customers</h1>
          <p className="text-muted-foreground">Manage all registered customers</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Users className="w-5 h-5 mr-2" />
          {customers.length} Total
        </Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="search-customers"
        />
      </div>

      <div className="grid gap-4">
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No customers found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "Try a different search term" : "Customers will appear here when they sign up"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer) => (
            <Sheet key={customer.id}>
              <SheetTrigger asChild>
                <Card 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedCustomer(customer)}
                  data-testid={`customer-card-${customer.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold text-primary">
                            {customer.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold" data-testid={`customer-name-${customer.id}`}>
                            {customer.name}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {customer.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {customer.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Trips</p>
                          <p className="font-semibold">{customer.totalTrips || 0}</p>
                        </div>
                        <Badge variant={customer.isOnline ? "default" : "secondary"}>
                          {customer.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SheetTrigger>
              <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {customer.name}
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>Joined {customer.createdAt ? format(new Date(customer.createdAt), "MMM d, yyyy") : "N/A"}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Trip History ({customerRides.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {customerRides.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No trips yet</p>
                      ) : (
                        <div className="space-y-3">
                          {customerRides.slice(0, 5).map((ride) => (
                            <div key={ride.id} className="border rounded-lg p-3">
                              <div className="flex justify-between items-start mb-2">
                                <Badge className={getStatusColor(ride.status)}>
                                  {ride.status}
                                </Badge>
                                <span className="font-semibold">₹{ride.price}</span>
                              </div>
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-green-600" />
                                  <span className="truncate">{ride.pickupLocation}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3 h-3 text-red-600" />
                                  <span className="truncate">{ride.dropLocation}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Package className="w-3 h-3" />
                                  <span>{ride.cargoType}</span>
                                  <span>•</span>
                                  <span>{ride.date}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </SheetContent>
            </Sheet>
          ))
        )}
      </div>
    </div>
  );
}
