import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, DollarSign, Activity, Package, Building2, ChevronRight, ShieldCheck, Clock, FileText, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { API_BASE } from "@/lib/api";
import { useAdminSessionGate } from "@/hooks/useAdminSession";
import { motion } from "framer-motion";

interface AdminStats {
  totalDrivers: number;
  totalTransporters: number;
  totalCustomers: number;
  totalVehicles: number;
  activeVehicles: number;
  totalRides: number;
  completedRides: number;
  activeRides: number;
  pendingRides: number;
  totalBids: number;
  totalRevenue: number;
  pendingVerifications: number;
  pendingApprovals: number;
  recentRides: {
    id: string;
    pickupLocation: string;
    dropLocation: string;
    status: string;
    createdAt: string;
  }[];
}

export default function AdminDashboard() {
  const { isReady, isChecking } = useAdminSessionGate();
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: isReady,
  });

  const formatRevenue = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(0)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "active": case "in_progress": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "bidding": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "accepted": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
      case "assigned": return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
      case "scheduled": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isChecking || isLoading) {
    return (
      <div className="min-h-screen bg-background pl-72">
        <AdminSidebar />
        <main className="p-8 flex items-center justify-center h-screen">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pl-72">
      <AdminSidebar />

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground" data-testid="text-dashboard-title">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Overview of your logistics operations</p>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
              Live Updates
            </div>
          </div>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div variants={item}>
            <Link href="/admin/drivers">
              <Card data-testid="card-total-drivers" className="cursor-pointer hover-lift group border-l-4 border-l-blue-500 overflow-hidden relative">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users size={64} />
                  </div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                      <Users size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Drivers</p>
                  <h3 className="text-2xl font-bold mt-1" data-testid="stat-total-drivers">{stats?.totalDrivers || 0}</h3>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link href="/admin/vehicles">
              <Card data-testid="card-active-vehicles" className="cursor-pointer hover-lift group border-l-4 border-l-purple-500 overflow-hidden relative">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Truck size={64} />
                  </div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg text-purple-600 dark:text-purple-400">
                      <Truck size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-purple-600 transition-colors" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Active Vehicles</p>
                  <h3 className="text-2xl font-bold mt-1" data-testid="stat-active-vehicles">{stats?.activeVehicles || 0}</h3>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link href="/admin/rides">
              <Card data-testid="card-total-revenue" className="cursor-pointer hover-lift group border-l-4 border-l-emerald-500 overflow-hidden relative">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign size={64} />
                  </div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <DollarSign size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Total Revenue</p>
                  <h3 className="text-2xl font-bold mt-1" data-testid="stat-total-revenue">{formatRevenue(stats?.totalRevenue || 0)}</h3>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div variants={item}>
            <Link href="/admin/rides?status=active">
              <Card data-testid="card-active-rides" className="cursor-pointer hover-lift group border-l-4 border-l-orange-500 overflow-hidden relative">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Activity size={64} />
                  </div>
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg text-orange-600 dark:text-orange-400">
                      <Activity size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-orange-600 transition-colors" />
                  </div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Active Rides</p>
                  <h3 className="text-2xl font-bold mt-1" data-testid="stat-active-rides">{stats?.activeRides || 0}</h3>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <motion.div variants={item}>
            <Link href="/admin/transporters">
              <Card className="cursor-pointer hover-lift p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600">
                    <Building2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Transporters</p>
                    <p className="text-lg font-bold">{stats?.totalTransporters || 0}</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <Link href="/admin/customers">
              <Card className="cursor-pointer hover-lift p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-600">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Customers</p>
                    <p className="text-lg font-bold">{stats?.totalCustomers || 0}</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <Link href="/admin/rides?status=pending">
              <Card className="cursor-pointer hover-lift p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600">
                    <Package size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Pending Rides</p>
                    <p className="text-lg font-bold">{stats?.pendingRides || 0}</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
          <motion.div variants={item}>
            <Link href="/admin/bids">
              <Card className="cursor-pointer hover-lift p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-full text-cyan-600">
                    <DollarSign size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Total Bids</p>
                    <p className="text-lg font-bold">{stats?.totalBids || 0}</p>
                  </div>
                </div>
              </Card>
            </Link>
          </motion.div>
        </motion.div>

        {((stats?.pendingVerifications || 0) + (stats?.pendingApprovals || 0)) > 0 && (
          <Link href="/admin/transporters?filter=pending">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 dark:bg-amber-900/10 cursor-pointer hover:shadow-md transition-shadow" data-testid="card-pending-verifications">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center shadow-sm">
                        <ShieldCheck className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900 dark:text-amber-100 text-lg">Action Required</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          {stats?.pendingVerifications || 0} awaiting document review, {stats?.pendingApprovals || 0} ready for approval
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-3xl font-black text-amber-700 dark:text-amber-300">{(stats?.pendingVerifications || 0) + (stats?.pendingApprovals || 0)}</div>
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pending</div>
                      </div>
                      <ChevronRight size={24} className="text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </Link>
        )}

        <div className="grid grid-cols-1 gap-6">
          <Card className="glass-card">
            <CardHeader className="border-b border-border/50">
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {stats?.recentRides && stats.recentRides.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {stats.recentRides.map((ride) => (
                    <motion.div
                      key={ride.id}
                      className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                      data-testid={`ride-activity-${ride.id}`}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                    >
                      <div className={`w-2 h-2 rounded-full ${ride.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <span>{ride.pickupLocation}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{ride.dropLocation}</span>
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock size={12} />
                          {ride.createdAt ? formatDistanceToNow(new Date(ride.createdAt), { addSuffix: true }) : "Recently"}
                        </p>
                      </div>
                      <Badge variant="outline" className={`${getStatusColor(ride.status)} border-0 font-medium px-3 py-1`}>
                        {ride.status}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No recent activity</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
