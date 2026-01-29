import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, MapPin, FileText, Package, Calendar } from "lucide-react";
import type { WaykelRide } from "../lib/waykelApi";

const getStatusVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case "active":
    case "in_transit":
      return "default";
    case "confirmed":
    case "accepted":
      return "secondary";
    case "delivered":
    case "completed":
      return "outline";
    case "pending":
    case "open":
    case "bidding":
      return "secondary";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
};

interface BookingsListProps {
  type: "active" | "history";
  rides: WaykelRide[];
  isLoading: boolean;
}

export function BookingsList({ type, rides, isLoading }: BookingsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredRides = rides.filter(ride => {
    const matchesSearch =
      ride.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ride.dropLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || ride.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card className="border-card-border animate-pulse mt-8">
        <CardContent className="h-64" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-card-border overflow-hidden shadow-sm">
        <CardHeader className="pb-4 bg-muted/10 border-b border-card-border/50 px-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, route..."
                className="pl-9 h-11 border-border/60"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] h-11 border-border/60">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {type === "active" ? (
                  <>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="open">Open (Bidding)</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="px-6 font-bold text-xs uppercase tracking-tight">Booking ID</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-tight">Schedule</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-tight">Trip Route</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-tight">Load</TableHead>
                  <TableHead className="font-bold text-xs uppercase tracking-tight">Status</TableHead>
                  <TableHead className="text-right px-6 font-bold text-xs uppercase tracking-tight">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRides.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">No {type} bookings found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRides.map(ride => (
                    <TableRow key={ride.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="px-6 font-mono text-sm font-bold text-primary">
                        {ride.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">{ride.date}</span>
                          <span className="text-[10px] text-muted-foreground uppercase flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {ride.pickupTime}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-bold text-sm flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block mr-1.5" />
                            {ride.pickupLocation}
                          </p>
                          <p className="font-bold text-sm flex items-center gap-1.5 truncate">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block mr-1.5" />
                            {ride.dropLocation}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs">{ride.cargoType}</span>
                          <span className="text-[10px] text-muted-foreground">{ride.weight}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(ride.status)} className="capitalize font-bold text-[10px] py-0.5 px-2">
                          {ride.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {["in_transit", "active"].includes(ride.status.toLowerCase()) && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <MapPin className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
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
