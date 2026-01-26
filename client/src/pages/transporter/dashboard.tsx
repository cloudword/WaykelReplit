import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { 
  Bell, Building2, Truck, Users, FileText, 
  Plus, Settings, IndianRupee, MapPin, Package, CheckCircle, X, 
  BarChart3, Route, Clock, ArrowRight, Zap
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { OnboardingTracker } from "@/components/onboarding/OnboardingTracker";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useTransporterSessionGate } from "@/hooks/useTransporterSession";

export default function TransporterDashboard() {
  const [_, setLocation] = useLocation();
  const [stats, setStats] = useState({
    totalDrivers: 0,
    totalVehicles: 0,
    activeBids: 0,
    completedRides: 0,
    pendingBids: 0,
    totalEarnings: 0,
    activeRides: 0,
    pendingRides: 0,
  });
  const [recentBids, setRecentBids] = useState<any[]>([]);
  const [recentRides, setRecentRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transporter, setTransporter] = useState<any>(null);
  const { user: sessionUser, isReady: sessionReady, isChecking: sessionChecking } = useTransporterSessionGate();
  const user = sessionUser;

  // Onboarding status (single source of truth) — fetched via hook
  const transporterId = user?.transporterId;
  const { data: onboardingStatus } = useOnboardingStatus(transporterId);

  const loadNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE}/notifications`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: any) => !n.isRead).length);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { 
        method: "PATCH",
        credentials: "include" 
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification read:", error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    if (!notification.isRead) {
      await markNotificationRead(notification.id);
    }
    
    if (notification.type === "new_booking" && notification.rideId) {
      setShowNotifications(false);
      setLocation("/transporter/marketplace");
    } else if (notification.type === "bid_accepted" || notification.type === "bid_rejected") {
      setShowNotifications(false);
      setLocation("/transporter/bids");
    }
  };

  useEffect(() => {
    if (!sessionReady || !user?.transporterId) return;

    const loadDashboardData = async () => {
      if (!sessionReady || !user?.transporterId) return;
      setLoading(true);
      
      try {
        const [bidsData, vehiclesData, usersData, transporterData, ridesData] = await Promise.all([
          api.bids.list({ transporterId: user.transporterId }),
          api.vehicles.list({ transporterId: user.transporterId }),
          api.users.list({ transporterId: user.transporterId, role: "driver" }),
          api.transporters.get(user.transporterId),
          api.rides.list({ transporterId: user.transporterId }),
        ]);

        const bids = Array.isArray(bidsData) ? bidsData : [];
        const vehiclesList = Array.isArray(vehiclesData) ? vehiclesData : [];
        const driversList = Array.isArray(usersData) ? usersData : [];
        const allRides = Array.isArray(ridesData) ? ridesData : [];
        
        const transporterRides = allRides.filter((r: any) => 
          r.transporterId === user.transporterId || 
          bids.some((b: any) => b.rideId === r.id && b.status === "accepted")
        );

        setRecentBids(bids.slice(0, 5));
        setRecentRides(transporterRides.slice(0, 5));
        setVehicles(vehiclesList);
        setDrivers(driversList);
        setTransporter(transporterData);

        const pendingBids = bids.filter((b: any) => b.status === "pending").length;
        const acceptedBids = bids.filter((b: any) => b.status === "accepted");
        const totalEarnings = acceptedBids.reduce((sum: number, b: any) => sum + parseFloat(b.amount || 0), 0);
        const activeRides = transporterRides.filter((r: any) => r.status === "active" || r.status === "assigned").length;
        const pendingRides = transporterRides.filter((r: any) => r.status === "pending").length;
        const completedRides = transporterRides.filter((r: any) => r.status === "completed").length;

        setStats({
          totalDrivers: driversList.length,
          totalVehicles: vehiclesList.length,
          activeBids: bids.length,
          completedRides,
          pendingBids,
          totalEarnings,
          activeRides,
          pendingRides,
        });
        
        // Also load notifications
        await loadNotifications();
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    
    // Poll for notifications every 30 seconds
    const notificationInterval = setInterval(loadNotifications, 30000);
    return () => clearInterval(notificationInterval);
  }, [sessionReady, user?.transporterId]);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      localStorage.removeItem("currentUser");
      setLocation("/auth");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  if (sessionChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Checking your session...</p>
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pl-64">
      <TransporterSidebar />
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-500">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setShowNotifications(true)}
                data-testid="button-notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setLocation("/transporter/settings")} data-testid="button-settings">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {onboardingStatus && onboardingStatus.overallStatus !== "completed" && (
          <div className="mb-6">
            <OnboardingTracker data={onboardingStatus} />
          </div>
        )}

        {transporter && transporter.status === "pending_verification" && (
          <Card className="mb-6 border-amber-200 bg-amber-50" data-testid="pending-verification-banner">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-800">Document Verification Required</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Please upload your required business documents to complete registration. Once submitted, our team will review them within 24-48 hours.
                  </p>
                  <Button size="sm" className="mt-3" onClick={() => setLocation("/transporter/documents")} data-testid="button-upload-documents">
                    <FileText className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transporter && transporter.status === "pending_approval" && (
          <Card className="mb-6 border-blue-200 bg-blue-50" data-testid="pending-approval-banner">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-800">Documents Under Review</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Your documents have been submitted and are being reviewed by our team. This usually takes 24-48 hours.
                    We'll notify you once your account is approved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transporter && transporter.status === "suspended" && (
          <Card className="mb-6 border-orange-300 bg-orange-50" data-testid="suspended-banner">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800">Account Suspended</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    Your transporter account has been temporarily suspended. You cannot accept new trips until this is resolved.
                  </p>
                  {transporter.rejectionReason && (
                    <div className="mt-2 p-3 bg-orange-100 rounded border border-orange-200">
                      <p className="text-sm font-medium text-orange-800">Reason:</p>
                      <p className="text-sm text-orange-700">{transporter.rejectionReason}</p>
                    </div>
                  )}
                  <p className="text-sm text-orange-700 mt-3">
                    Please contact support to resolve this issue and restore your account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transporter && transporter.status === "rejected" && (
          <Card className="mb-6 border-red-300 bg-red-50" data-testid="rejected-banner">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">Account Rejected</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Your transporter account application has been rejected.
                  </p>
                  {transporter.rejectionReason && (
                    <div className="mt-2 p-3 bg-red-100 rounded border border-red-200">
                      <p className="text-sm font-medium text-red-800">Reason:</p>
                      <p className="text-sm text-red-700">{transporter.rejectionReason}</p>
                    </div>
                  )}
                  <p className="text-sm text-red-700 mt-3">
                    Please review the feedback above and contact support if you believe this was an error, 
                    or update your documents and re-apply.
                  </p>
                  <Button size="sm" variant="outline" className="mt-4 text-red-700 border-red-300 hover:bg-red-100" onClick={() => setLocation("/transporter/documents")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Review Documents
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transporter && transporter.verificationStatus === 'approved' && onboardingStatus?.overallStatus === "completed" && (
          <Card className="mb-6 border-green-200 bg-green-50" data-testid="verified-banner">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Verified Transporter</h3>
                  <p className="text-sm text-green-700">Your account is verified. You can access the marketplace and receive trip requests.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {transporter && transporter.verificationStatus === 'approved' && onboardingStatus?.overallStatus !== "completed" && (
          <Card className="mb-6 border-amber-200 bg-amber-50" data-testid="verified-pending-onboarding-banner">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold text-amber-800">Account Verified — Complete Onboarding</h3>
                  <p className="text-sm text-amber-700">Your account is verified. Add required vehicles and drivers to complete onboarding and enable bidding.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card data-testid="stat-active-rides" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/transporter/trips")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Rides</CardTitle>
              <Route className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.activeRides}</div>
              <p className="text-xs text-gray-500">In progress</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-completed-rides" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/transporter/trips")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedRides}</div>
              <p className="text-xs text-gray-500">Total trips</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-bids" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/transporter/bids")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Bids</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingBids}</div>
              <p className="text-xs text-gray-500">Awaiting response</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-earnings">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Earnings</CardTitle>
              <IndianRupee className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">₹{stats.totalEarnings.toLocaleString()}</div>
              <p className="text-xs text-gray-500">From bids</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-vehicles" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/transporter/vehicles")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Vehicles</CardTitle>
              <Truck className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVehicles}</div>
              <p className="text-xs text-gray-500">Registered</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-drivers" className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/transporter/drivers")}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Drivers</CardTitle>
              <Users className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDrivers}</div>
              <p className="text-xs text-gray-500">In fleet</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" data-testid="recent-rides-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Trips</CardTitle>
                <CardDescription>Your latest ride activity</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setLocation("/transporter/trips")} data-testid="button-view-all-trips">
                  View All
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => setLocation("/transporter/post-trip")} 
                  data-testid="button-post-new-trip"
                  disabled={transporter && transporter.verificationStatus !== 'approved'}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Post Trip
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500 text-center py-8">Loading...</p>
              ) : recentRides.length > 0 ? (
                <div className="space-y-3">
                  {recentRides.map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors" data-testid={`ride-row-${ride.id}`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {ride.pickupLocation} <ArrowRight className="inline h-3 w-3 mx-1" /> {ride.dropLocation}
                          </p>
                          <p className="text-xs text-gray-500">{ride.date} • ₹{parseFloat(ride.price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant={
                        ride.status === "completed" ? "default" :
                        ride.status === "active" || ride.status === "assigned" ? "secondary" :
                        ride.status === "pending" ? "outline" : "destructive"
                      }>
                        {ride.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No trips yet</p>
                  <Button 
                    size="sm" 
                    className="mt-3" 
                    onClick={() => setLocation("/transporter/post-trip")}
                    disabled={transporter && transporter.verificationStatus !== 'approved'}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Post Your First Trip
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="quick-actions-card">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your operations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white" 
                onClick={() => setLocation("/transporter/post-trip")} 
                data-testid="button-post-trip"
                disabled={transporter && transporter.verificationStatus !== 'approved'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Post New Trip
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/marketplace")} data-testid="button-browse-loads">
                <Package className="h-4 w-4 mr-2" />
                Browse Available Loads
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/trips")} data-testid="button-view-trips">
                <Route className="h-4 w-4 mr-2" />
                View My Trips
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/bids")} data-testid="button-view-bids">
                <FileText className="h-4 w-4 mr-2" />
                My Bids
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/vehicles")} data-testid="button-manage-vehicles">
                <Truck className="h-4 w-4 mr-2" />
                Manage Vehicles
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/drivers")} data-testid="button-manage-drivers">
                <Users className="h-4 w-4 mr-2" />
                Manage Drivers
              </Button>
              <Button className="w-full justify-start" variant="outline" onClick={() => setLocation("/transporter/analytics")} data-testid="button-view-analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <Card data-testid="drivers-overview-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Drivers</CardTitle>
                <CardDescription>Your fleet drivers</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setLocation("/transporter/drivers")} data-testid="button-view-all-drivers">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {drivers.length > 0 ? (
                <div className="space-y-3">
                  {drivers.slice(0, 3).map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`driver-row-${driver.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{driver.name}</p>
                          <p className="text-xs text-gray-500">{driver.phone}</p>
                        </div>
                      </div>
                      <Badge variant={driver.isOnline ? "default" : "secondary"}>
                        {driver.isOnline ? "Online" : "Offline"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No drivers added yet</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="vehicles-overview-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vehicles</CardTitle>
                <CardDescription>Your fleet vehicles</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setLocation("/transporter/vehicles")} data-testid="button-view-all-vehicles">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {vehicles.length > 0 ? (
                <div className="space-y-3">
                  {vehicles.slice(0, 3).map((vehicle) => (
                    <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" data-testid={`vehicle-row-${vehicle.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Truck className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{vehicle.plateNumber}</p>
                          <p className="text-xs text-gray-500">{vehicle.type}</p>
                        </div>
                      </div>
                      <Badge variant={vehicle.status === "active" ? "default" : "secondary"}>
                        {vehicle.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No vehicles added yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount} new</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Booking requests and bid updates matching your profile
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-3 py-4" data-testid="notifications-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    notification.isRead 
                      ? "bg-gray-50 border-gray-200" 
                      : "bg-blue-50 border-blue-200"
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notification.type === "new_booking" 
                        ? "bg-green-100 text-green-600"
                        : notification.type === "bid_accepted"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {notification.type === "new_booking" ? (
                        <Package className="h-5 w-5" />
                      ) : notification.type === "bid_accepted" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <X className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      {notification.matchScore && (
                        <div className="flex items-center gap-1 mt-2">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs text-yellow-600 font-medium">
                            {notification.matchScore}% match
                          </span>
                          {notification.matchReason && (
                            <span className="text-xs text-gray-400 ml-1">
                              • {notification.matchReason.split(";")[0]}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">No notifications yet</p>
                <p className="text-sm mt-1">New booking requests matching your profile will appear here</p>
              </div>
            )}
          </div>
          
          <DialogFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowNotifications(false)}
              data-testid="button-close-notifications"
            >
              Close
            </Button>
            {notifications.length > 0 && (
              <Button 
                onClick={() => setLocation("/transporter/marketplace")}
                data-testid="button-browse-marketplace"
              >
                Browse Marketplace
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
