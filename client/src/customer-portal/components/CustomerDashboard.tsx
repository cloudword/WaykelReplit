import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Gavel, Truck, Timer, History, CheckCircle, IndianRupee, Plus, ShieldCheck } from "lucide-react";
import { waykelApi, WaykelRide, WaykelBid } from "../lib/waykelApi";
import { formatWeight } from "../lib/weightUtils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { trackBidAccepted } from "../lib/customerTracking";
import { DashboardLayout } from "./DashboardLayout";

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "in_transit":
    case "in transit":
    case "active":
      return "bg-blue-500/10 text-blue-600";
    case "confirmed":
    case "accepted":
      return "bg-green-500/10 text-green-600";
    case "pending":
    case "open":
      return "bg-yellow-500/10 text-yellow-600";
    case "delivered":
    case "completed":
      return "bg-gray-500/10 text-gray-600";
    default:
      return "";
  }
};

const formatDate = (date: string | null) => {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
};

function RideCard({ ride, onViewBids }: { ride: WaykelRide; onViewBids: () => void }) {
  const { status, pickupLocation, dropLocation, date, pickupTime, cargoType, weight, transporter, driver, vehicle } = ride;
  const showTrack = ["in_transit", "active", "confirmed", "accepted"].includes(status.toLowerCase());
  const showBids = ["pending", "open"].includes(status.toLowerCase());

  return (
    <Card className="border-card-border">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Trip ID: {ride.id}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{cargoType}</Badge>
              <Badge variant="outline">{formatWeight(weight).display}</Badge>
              {vehicle?.vehicleType && <Badge variant="outline">{vehicle.vehicleType}</Badge>}
            </div>
          </div>
          <Badge className={getStatusColor(status)}>{status}</Badge>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 bg-muted/50 p-3 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Pickup</p>
            <p className="font-medium">{pickupLocation}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Drop</p>
            <p className="font-medium">{dropLocation}</p>
          </div>
          <div className="text-sm text-muted-foreground flex flex-col gap-1">
            <span>
              {date} · {pickupTime}
            </span>
            <span>Distance: {ride.distance} km</span>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Transporter</p>
            <p className="font-medium">{transporter?.name || "TBD"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Driver</p>
            <p className="font-medium">{driver?.name || "TBD"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vehicle</p>
            <p className="font-medium">{vehicle?.vehicleNumber || vehicle?.vehicleType || "TBD"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline">View Details</Button>
          {showTrack && <Button size="sm">Track Shipment</Button>}
          {showBids && <Button size="sm" variant="secondary" onClick={onViewBids}>View Bids</Button>}
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState("ongoing");
  const [selectedRide, setSelectedRide] = useState<WaykelRide | null>(null);
  const [showBidsModal, setShowBidsModal] = useState(false);
  const { toast } = useToast();

  const { data: allRides = [], isLoading } = useQuery<WaykelRide[]>({
    queryKey: ["customer-rides"],
    queryFn: () => waykelApi.rides.getMyRides(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const { data: bids = [], isLoading: bidsLoading } = useQuery<WaykelBid[]>({
    queryKey: ["customer-bids", selectedRide?.id],
    queryFn: () => (selectedRide?.id ? waykelApi.bids.getBidsForRide(selectedRide.id) : Promise.resolve([])),
    enabled: !!selectedRide?.id && showBidsModal,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const acceptBidMutation = useMutation({
    mutationFn: (bidId: string) => waykelApi.bids.acceptBid(bidId),
    onSuccess: (_, bidId) => {
      const acceptedBid = bids.find(b => b.id === bidId);
      if (selectedRide && acceptedBid) {
        trackBidAccepted(
          { id: selectedRide.createdById, name: "Customer" },
          { bidId, rideId: selectedRide.id, transporterName: acceptedBid.transporter?.name, amount: String(acceptedBid.amount) },
        );
      }
      toast({ title: "Bid Accepted!", description: "The transporter has been notified" });
      queryClient.invalidateQueries({ queryKey: ["customer-rides"] });
      queryClient.invalidateQueries({ queryKey: ["customer-bids", selectedRide?.id] });
      setShowBidsModal(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept bid",
        variant: "destructive",
      });
    },
  });

  const ongoing = allRides.filter(r => ["in_transit", "active", "confirmed", "accepted", "assigned"].includes(r.status.toLowerCase()));
  const upcoming = allRides.filter(r => ["pending", "open", "bidding"].includes(r.status.toLowerCase()));
  const history = allRides.filter(r => ["delivered", "completed", "cancelled"].includes(r.status.toLowerCase()));

  const handleViewBids = (ride: WaykelRide) => {
    setSelectedRide(ride);
    setShowBidsModal(true);
  };

  if (isLoading) {
    return (
      <DashboardLayout currentPage="/customer/dashboard">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-36" />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout currentPage="/customer/dashboard">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">My Trips</h1>
              {allRides[0]?.createdById && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="font-mono text-xs" data-testid="badge-customer-id">
                      {allRides[0].createdById}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your Waykel ID for support.</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-muted-foreground">Track and manage all your shipments</p>
          </div>
          <Button className="gap-2" data-testid="button-book-trip" asChild>
            <Link href="/customer/book">
              <Plus className="w-4 h-4" />
              Book New Trip
            </Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <Card className="border-card-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{ongoing.length}</p>
                <p className="text-sm text-muted-foreground">Ongoing</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Timer className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcoming.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-card-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{history.length}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="ongoing" className="gap-2" data-testid="tab-ongoing">
              <Truck className="w-4 h-4" />
              Ongoing
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="gap-2" data-testid="tab-upcoming">
              <Timer className="w-4 h-4" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2" data-testid="tab-history">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing" className="space-y-4">
            {ongoing.length === 0 ? (
              <Card className="border-card-border">
                <CardContent className="p-8 text-center">
                  <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No ongoing trips</p>
                  <p className="text-muted-foreground mb-4">You don't have any trips in progress right now</p>
                  <Button asChild data-testid="button-book-now-empty">
                    <Link href="/customer/book">Book a Trip</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              ongoing.map(ride => (
                <RideCard key={ride.id} ride={ride} onViewBids={() => handleViewBids(ride)} />
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcoming.length === 0 ? (
              <Card className="border-card-border">
                <CardContent className="p-8 text-center">
                  <Timer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No upcoming trips</p>
                  <p className="text-muted-foreground mb-4">Schedule your next shipment now</p>
                  <Button asChild data-testid="button-schedule-trip">
                    <Link href="/customer/book">Schedule a Trip</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              upcoming.map(ride => (
                <RideCard key={ride.id} ride={ride} onViewBids={() => handleViewBids(ride)} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {history.length === 0 ? (
              <Card className="border-card-border">
                <CardContent className="p-8 text-center">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No trip history</p>
                  <p className="text-muted-foreground">Your completed trips will appear here</p>
                </CardContent>
              </Card>
            ) : (
              history.map(ride => (
                <RideCard key={ride.id} ride={ride} onViewBids={() => handleViewBids(ride)} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {showBidsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" role="dialog">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5" />
                <div>
                  <p className="font-semibold">Bids for Trip</p>
                  {selectedRide && (
                    <p className="text-sm text-muted-foreground">
                      {selectedRide.pickupLocation} to {selectedRide.dropLocation}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              {bidsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : bids.length === 0 ? (
                <div className="text-center py-8">
                  <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No bids yet</p>
                  <p className="text-sm text-muted-foreground">Transporters will start bidding soon</p>
                </div>
              ) : (
                bids.map(bid => (
                  <Card key={bid.id} className="border-card-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {bid.transporter?.name?.charAt(0) || "T"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium">{bid.transporter?.name || "Transporter"}</p>
                              {bid.transporter?.transporterId && (
                                <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-transporter-id-${bid.id}`}>
                                  {bid.transporter.transporterId}
                                </Badge>
                              )}
                              {(bid.transporter?.isVerified || bid.transporter?.verificationStatus === "verified") && (
                                <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700" data-testid={`badge-verified-${bid.id}`}>
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </Badge>
                              )}
                              {bid.transporter?.verificationStatus === "pending" && (
                                <Badge variant="outline" className="text-xs" data-testid={`badge-pending-${bid.id}`}>
                                  Pending
                                </Badge>
                              )}
                            </div>
                            {bid.transporter?.rating && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                Rating: {bid.transporter.rating.toFixed(1)} ★
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">₹{Number(bid.amount).toLocaleString()}</p>
                          <Button
                            size="sm"
                            className="mt-2"
                            onClick={() => acceptBidMutation.mutate(bid.id)}
                            disabled={acceptBidMutation.isPending}
                            data-testid={`button-accept-bid-${bid.id}`}
                          >
                            {acceptBidMutation.isPending ? "Accepting..." : "Accept Bid"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <div className="p-3 border-t flex justify-end">
              <Button variant="ghost" onClick={() => setShowBidsModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
