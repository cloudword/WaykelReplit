import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, MapPin, FileText } from "lucide-react";

const mockBookings = [
  { id: "WYK-2024-001", date: "Dec 4, 2024", route: "Mumbai to Delhi", vehicle: "Container 32ft", status: "In Transit", amount: "Rs 85,000", driver: "Suresh Kumar", phone: "+91 98765 43210" },
  { id: "WYK-2024-002", date: "Dec 5, 2024", route: "Chennai to Bangalore", vehicle: "Eicher 17ft", status: "Confirmed", amount: "Rs 25,000", driver: "Pending Assignment", phone: "-" },
  { id: "WYK-2024-003", date: "Dec 6, 2024", route: "Pune to Hyderabad", vehicle: "Tata 407", status: "Pending", amount: "Rs 18,000", driver: "Pending Assignment", phone: "-" },
  { id: "WYK-2024-004", date: "Dec 2, 2024", route: "Delhi to Jaipur", vehicle: "Eicher 14ft", status: "Delivered", amount: "Rs 15,000", driver: "Ramesh Singh", phone: "+91 99887 66554" },
  { id: "WYK-2024-005", date: "Dec 1, 2024", route: "Kolkata to Patna", vehicle: "Container 20ft", status: "Delivered", amount: "Rs 42,000", driver: "Anil Verma", phone: "+91 88776 55443" },
];

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "in transit":
      return "default";
    case "confirmed":
      return "secondary";
    case "delivered":
      return "outline";
    case "pending":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

interface BookingsListProps {
  type?: "active" | "history";
}

export function BookingsList({ type = "active" }: BookingsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredBookings = mockBookings.filter(booking => {
    const matchesSearch = booking.id.toLowerCase().includes(searchQuery.toLowerCase()) || booking.route.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesType = type === "active" ? ["in transit", "confirmed", "pending"].includes(booking.status.toLowerCase()) : booking.status.toLowerCase() === "delivered";
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">{type === "active" ? "Active Bookings" : "Booking History"}</h1>
        <p className="text-muted-foreground">{type === "active" ? "Track and manage your ongoing shipments" : "View all your past completed bookings"}</p>
      </div>

      <Card className="border-card-border">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or route..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                data-testid="input-search-bookings"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {type === "active" ? (
                  <>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in transit">In Transit</SelectItem>
                  </>
                ) : (
                  <SelectItem value="delivered">Delivered</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">No bookings found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map(booking => (
                    <TableRow key={booking.id} data-testid={`row-booking-${booking.id}`}>
                      <TableCell className="font-medium">{booking.id}</TableCell>
                      <TableCell>{booking.date}</TableCell>
                      <TableCell>{booking.route}</TableCell>
                      <TableCell>{booking.vehicle}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(booking.status)}>{booking.status}</Badge>
                      </TableCell>
                      <TableCell>{booking.amount}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" data-testid={`button-view-${booking.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          {booking.status.toLowerCase() === "in transit" && (
                            <Button variant="ghost" size="icon" data-testid={`button-track-${booking.id}`}>
                              <MapPin className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" data-testid={`button-invoice-${booking.id}`}>
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
