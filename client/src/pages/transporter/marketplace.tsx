import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MapPin, Clock, Package, Truck, IndianRupee, Calendar, User, Phone, Star, Sparkles, Filter, AlertCircle, FileText } from "lucide-react";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { VehicleSelector } from "@/components/vehicle-selector";
import { OnboardingTracker } from "@/components/onboarding/OnboardingTracker";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MarketplaceRide {
  id: string;
  pickupLocation: string;
  dropLocation: string;
  pickupTime: string;
  dropTime?: string;
  date: string;
  price: string;
  distance?: string;
  cargoType?: string;
  weight?: string;
  customerName?: string;
  customerPhone?: string;
  matchScore?: number;
  matchReason?: string;
  isMatched?: boolean;
}

export default function TransporterMarketplace() {
  const [_, setLocation] = useLocation();
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedRidePrice, setSelectedRidePrice] = useState<number>(0);
  const [rides, setRides] = useState<MarketplaceRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"matched" | "all">("matched");
  const [transporter, setTransporter] = useState<any>(null);
  const [permissions, setPermissions] = useState<any>(null);
  // Onboarding status (authoritative)
  const { data: onboarding, isLoading: onboardingLoading } = useOnboardingStatus(transporter?.id);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  const loadRides = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/transporter/marketplace`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setRides(Array.isArray(data) ? data : []);
      } else {
        const fallbackData = await api.rides.list({ status: "pending" });
        setRides(Array.isArray(fallbackData) ? fallbackData : []);
      }
    } catch (error) {
      console.error("Failed to load rides:", error);
      toast.error("Failed to load available loads");
    } finally {
      setLoading(false);
    }
  };

  const matchedRides = rides.filter(r => r.matchScore && r.matchScore > 0);
  const allRides = rides;

  useEffect(() => {
    loadRides();
    if (user?.transporterId) {
      api.transporters.get(user.transporterId).then(setTransporter);
      api.transporters.getPermissions(user.transporterId)
        .then((data) => {
          setPermissions(data?.permissions ?? data);
        })
        .catch((error) => {
          console.error("Failed to load transporter permissions", error);
          toast.error("Could not load transporter permissions");
        });
    }
  }, [user?.transporterId]);

  const handlePlaceBid = (rideId: string, price: number) => {
    setSelectedRideId(rideId);
    setSelectedRidePrice(price);
    setShowVehicleSelector(true);
  };

  const handleBidConfirm = async (vehicleId: string, bidAmount: string) => {
    if (!selectedRideId || !user?.id) return;
    try {
      await api.bids.create({
        rideId: selectedRideId,
        userId: user.id,
        transporterId: user.transporterId,
        vehicleId,
        amount: bidAmount,
      });
      setShowVehicleSelector(false);
      toast.success("Bid submitted! Awaiting Super Admin approval.");
      setLocation("/transporter/bids");
    } catch (error) {
      toast.error("Failed to place bid");
    }
  };

  // Canonical bid gating logic
  const canBid = permissions?.canBid;

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <TransporterSidebar />
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <MapPin className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Load Marketplace</h1>
            <div className="ml-auto">
              <Button variant="outline" size="sm" onClick={loadRides} data-testid="button-refresh">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Onboarding Tracker (compact) below header, above trip list */}
        {onboarding && (
          <div className="mb-6">
            <OnboardingTracker
              variant="compact"
              data={onboarding}
              onNavigate={(target) => {
                if (target === "business") setLocation("/transporter/documents");
                if (target === "vehicles") setLocation("/transporter/vehicles");
                if (target === "drivers") setLocation("/transporter/drivers");
              }}
            />
          </div>
        )}
        {permissions && permissions.verificationStatus !== 'approved' && (
          <Card className="mb-6 border-amber-200 bg-amber-50" data-testid="verification-required-banner">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800">Verification Required to Place Bids</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    You can view available loads, but to place bids you need to complete your account verification first.
                  </p>
                  <Button 
                    size="sm" 
                    className="mt-3"
                    onClick={() => setLocation("/transporter/documents")}
                    data-testid="button-complete-verification"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Complete Verification
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">How Bidding Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">1</span>
                <span>Browse available loads</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">2</span>
                <span>Select vehicle & place bid</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">3</span>
                <span>Wait for Super Admin approval</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">4</span>
                <span>Start delivery after approval</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "matched" | "all")} className="mb-6">
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="matched" className="gap-2" data-testid="tab-matched">
                <Sparkles className="h-4 w-4" />
                For You ({matchedRides.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="gap-2" data-testid="tab-all">
                <Filter className="h-4 w-4" />
                All Loads ({allRides.length})
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading available loads...</p>
          </div>
        ) : (viewMode === "matched" ? matchedRides : allRides).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(viewMode === "matched" ? matchedRides : allRides).map((ride) => (
              <Card key={ride.id} className={`relative overflow-hidden ${ride.matchScore && ride.matchScore >= 50 ? 'ring-2 ring-yellow-400' : ''}`} data-testid={`ride-card-${ride.id}`}>
                {ride.matchScore && ride.matchScore > 0 && (
                  <div className="absolute top-0 right-0 z-10">
                    <div className={`px-2 py-1 text-xs font-bold flex items-center gap-1 ${
                      ride.matchScore >= 70 ? 'bg-green-500 text-white' :
                      ride.matchScore >= 40 ? 'bg-yellow-500 text-black' :
                      'bg-gray-500 text-white'
                    }`}>
                      <Star className="h-3 w-3" />
                      {ride.matchScore}% Match
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex justify-between items-center">
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    {ride.distance || "N/A"}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {ride.date}
                  </Badge>
                </div>
                
                <CardContent className="p-4 space-y-4">
                  <div className="relative">
                    <div className="absolute left-[7px] top-[20px] bottom-[20px] w-0.5 bg-gray-200 border-l border-dashed border-gray-300" />
                    
                    <div className="space-y-4">
                      <div className="flex gap-3 relative">
                        <div className="w-4 h-4 rounded-full border-2 border-green-500 bg-white mt-0.5 z-10 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground font-medium">PICKUP</p>
                          <p className="font-semibold text-sm">{ride.pickupLocation}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                            <Clock className="h-3 w-3" /> {ride.pickupTime}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 relative">
                        <div className="w-4 h-4 rounded-full border-2 border-red-500 bg-white mt-0.5 z-10 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground font-medium">DROP</p>
                          <p className="font-semibold text-sm">{ride.dropLocation}</p>
                          {ride.dropTime && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <Clock className="h-3 w-3" /> {ride.dropTime}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 py-2 bg-gray-50 rounded-lg px-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Cargo</p>
                        <p className="text-xs font-medium">{ride.cargoType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase">Weight</p>
                        <p className="text-xs font-medium">{ride.weight}</p>
                      </div>
                    </div>
                  </div>
                  
                  {(ride.customerName || ride.customerPhone) && (
                    <div className="flex items-center gap-3 text-sm text-gray-600 bg-blue-50 p-2 rounded-lg">
                      <User className="h-4 w-4 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-xs">{ride.customerName || "Customer"}</p>
                        {ride.customerPhone && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {ride.customerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {ride.matchReason && ride.matchScore && ride.matchScore > 0 && (
                    <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded-lg">
                      <Sparkles className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="line-clamp-2">{ride.matchReason}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Base Price</p>
                      <p className="text-xl font-bold text-green-600 flex items-center">
                        <IndianRupee className="h-4 w-4" />
                        {parseFloat(ride.price).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => handlePlaceBid(ride.id, parseFloat(ride.price))}
                      data-testid={`button-bid-${ride.id}`}
                      className="bg-blue-600 hover:bg-blue-700"
                      disabled={!canBid}
                    >
                      Place Bid
                    </Button>
                    {!canBid && (
                      <p className="text-sm text-muted mt-2">
                        Complete onboarding to place bids.
                        <span
                          className="ml-2 text-primary underline cursor-pointer"
                          onClick={() => setLocation("/transporter/dashboard")}
                        >
                          Complete setup
                        </span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {viewMode === "matched" ? (
              <>
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No matched loads found</p>
                <p className="text-sm mb-4">Update your vehicle and service area details to get better matches</p>
                <Button variant="outline" onClick={() => setViewMode("all")} data-testid="button-view-all">
                  View All Available Loads
                </Button>
              </>
            ) : (
              <>
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg mb-2">No loads available for bidding</p>
                <p className="text-sm">Check back later for new opportunities</p>
              </>
            )}
          </div>
        )}
      </main>
      
      <VehicleSelector 
        open={showVehicleSelector} 
        onOpenChange={setShowVehicleSelector}
        basePrice={selectedRidePrice}
        onConfirm={handleBidConfirm}
      />
    </div>
  );
}
