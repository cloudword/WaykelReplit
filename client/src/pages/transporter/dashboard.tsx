import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  Bell, Building2, Truck, Users, FileText,
  Plus, Settings, IndianRupee, MapPin, Package, CheckCircle, X,
  BarChart3, Route, Clock, ArrowRight, Zap, ShieldAlert, Sparkles
} from "lucide-react";
import { api, API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { OnboardingTracker } from "@/components/onboarding/OnboardingTracker";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";
import { useTransporterSessionGate } from "@/hooks/useTransporterSession";
import { motion } from "framer-motion";

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

        await loadNotifications();
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const notificationInterval = setInterval(loadNotifications, 30000);
    return () => clearInterval(notificationInterval);
  }, [sessionReady, user?.transporterId]);

  if (sessionChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pl-72">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background pl-72">
      <TransporterSidebar />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-200/50">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground text-sm font-medium">Welcome back, {user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="relative shadow-sm rounded-full w-10 h-10"
              onClick={() => setShowNotifications(true)}
              data-testid="button-notifications"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold border-2 border-background">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setLocation("/transporter/settings")} className="shadow-sm rounded-full w-10 h-10">
              <Settings className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {onboardingStatus && onboardingStatus.overallStatus !== "completed" && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <OnboardingTracker data={onboardingStatus} />
          </motion.div>
        )}

        {/* Alerts Section */}
        <div className="space-y-4">
          {transporter && transporter.status === "pending_verification" && (
            <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-amber-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100">Verification Required</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">Upload business documents to unlock full access.</p>
                  <Button size="sm" variant="outline" className="mt-2 border-amber-300 text-amber-800 hover:bg-amber-100" onClick={() => setLocation("/transporter/documents")}>
                    Upload Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {transporter && transporter.status === "rejected" && (
            <Card className="border-l-4 border-l-destructive bg-destructive/5">
              <CardContent className="p-4 flex items-start gap-4">
                <div className="p-2 bg-destructive/10 rounded-lg text-destructive">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-destructive">Account Rejected</h3>
                  <p className="text-sm text-muted-foreground mt-1">{transporter.rejectionReason || "Please review your documents and try again."}</p>
                  <Button size="sm" variant="outline" className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => setLocation("/transporter/documents")}>
                    Review Documents
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          <motion.div variants={item}>
            <Card className="hover-lift cursor-pointer group" onClick={() => setLocation("/transporter/trips")}>
              <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Rides</CardTitle>
                <Route className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{stats.activeRides}</div>
                <p className="text-xs text-muted-foreground group-hover:text-blue-500 transition-colors">In progress</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-lift cursor-pointer group" onClick={() => setLocation("/transporter/trips")}>
              <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{stats.completedRides}</div>
                <p className="text-xs text-muted-foreground group-hover:text-emerald-500 transition-colors">All time</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-lift cursor-pointer group" onClick={() => setLocation("/transporter/bids")}>
              <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Bids</CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{stats.pendingBids}</div>
                <p className="text-xs text-muted-foreground group-hover:text-amber-500 transition-colors">Awaiting action</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-lift cursor-pointer group bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Earnings</CardTitle>
                <IndianRupee className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold text-primary">₹{stats.totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">From bids</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-lift cursor-pointer group" onClick={() => setLocation("/transporter/vehicles")}>
              <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vehicles</CardTitle>
                <Truck className="h-4 w-4 text-cyan-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{stats.totalVehicles}</div>
                <p className="text-xs text-muted-foreground group-hover:text-cyan-500 transition-colors">Registered</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={item}>
            <Card className="hover-lift cursor-pointer group" onClick={() => setLocation("/transporter/drivers")}>
              <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Drivers</CardTitle>
                <Users className="h-4 w-4 text-indigo-500" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="text-2xl font-bold">{stats.totalDrivers}</div>
                <p className="text-xs text-muted-foreground group-hover:text-indigo-500 transition-colors">Active fleet</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-border/60">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <div>
                <CardTitle className="text-lg">Recent Trips</CardTitle>
                <CardDescription>Your latest logistics activity</CardDescription>
              </div>
              <Button size="sm" onClick={() => setLocation("/transporter/post-trip")} className="gap-2">
                <Plus className="h-4 w-4" /> Post Trip
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center p-8"><span className="loading loading-spinner text-primary"></span></div>
              ) : recentRides.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {recentRides.map((ride) => (
                    <div key={ride.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setLocation("/transporter/trips")}>
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full ${ride.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                          {ride.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-2">
                            {ride.pickupLocation} <ArrowRight className="h-3 w-3 text-muted-foreground" /> {ride.dropLocation}
                          </p>
                          <p className="text-xs text-muted-foreground">{ride.date} • ₹{parseFloat(ride.price || 0).toLocaleString()}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">{ride.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground">No recent activity found</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" /> Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all" onClick={() => setLocation("/transporter/marketplace")}>
                <Package className="h-4 w-4 mr-3 text-muted-foreground" /> Browse Marketplace
              </Button>
              <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all" onClick={() => setLocation("/transporter/trips")}>
                <Route className="h-4 w-4 mr-3 text-muted-foreground" /> My Trips
              </Button>
              <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all" onClick={() => setLocation("/transporter/bids")}>
                <FileText className="h-4 w-4 mr-3 text-muted-foreground" /> My Bids
              </Button>
              <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all" onClick={() => setLocation("/transporter/vehicles")}>
                <Truck className="h-4 w-4 mr-3 text-muted-foreground" /> Manage Vehicles
              </Button>
              <Button variant="outline" className="w-full justify-start h-10 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all" onClick={() => setLocation("/transporter/drivers")}>
                <Users className="h-4 w-4 mr-3 text-muted-foreground" /> Manage Drivers
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount} new</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Recent updates and alerts
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-4 px-1" data-testid="notifications-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${notification.isRead
                      ? "bg-card border-border"
                      : "bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
                    }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notification.type === "new_booking" ? "bg-green-100 text-green-600" :
                        "bg-primary/10 text-primary"
                      }`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm ${!notification.isRead ? 'font-bold' : 'font-medium'}`}>{notification.title}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                          {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <Sparkles className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">All caught up!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
