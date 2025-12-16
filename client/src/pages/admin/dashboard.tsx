import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, DollarSign, Activity, Package, Building2, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { API_BASE } from "@/lib/api";

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
  recentRides: {
    id: string;
    pickupLocation: string;
    dropLocation: string;
    status: string;
    createdAt: string;
  }[];
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/admin/stats`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
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
      case "completed": return "bg-green-100 text-green-800";
      case "active": case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "bid_placed": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 pl-64">
        <AdminSidebar />
        <main className="p-8 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-gray-500">Overview of your logistics operations</p>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <Link href="/admin/drivers">
            <Card data-testid="card-total-drivers" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-blue-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <Users size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Total Drivers</p>
                <h3 className="text-2xl font-bold" data-testid="stat-total-drivers">{stats?.totalDrivers || 0}</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/vehicles">
            <Card data-testid="card-active-vehicles" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-purple-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <Truck size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Active Vehicles</p>
                <h3 className="text-2xl font-bold" data-testid="stat-active-vehicles">{stats?.activeVehicles || 0}</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/rides">
            <Card data-testid="card-total-revenue" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-green-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 rounded-lg text-green-600">
                    <DollarSign size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-green-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Total Revenue</p>
                <h3 className="text-2xl font-bold" data-testid="stat-total-revenue">{formatRevenue(stats?.totalRevenue || 0)}</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/rides?status=active">
            <Card data-testid="card-active-rides" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-orange-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                    <Activity size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-orange-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Active Rides</p>
                <h3 className="text-2xl font-bold" data-testid="stat-active-rides">{stats?.activeRides || 0}</h3>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <Link href="/admin/transporters">
            <Card data-testid="card-transporters" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-indigo-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                    <Building2 size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Transporters</p>
                <h3 className="text-2xl font-bold" data-testid="stat-transporters">{stats?.totalTransporters || 0}</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/customers">
            <Card data-testid="card-customers" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-pink-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-pink-100 rounded-lg text-pink-600">
                    <Users size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-pink-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Customers</p>
                <h3 className="text-2xl font-bold" data-testid="stat-customers">{stats?.totalCustomers || 0}</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/rides?status=pending">
            <Card data-testid="card-pending-rides" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-yellow-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
                    <Package size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-yellow-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Pending Rides</p>
                <h3 className="text-2xl font-bold" data-testid="stat-pending-rides">{stats?.pendingRides || 0}</h3>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/bids">
            <Card data-testid="card-total-bids" className="cursor-pointer hover:shadow-lg transition-shadow hover:border-cyan-200 group">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600">
                    <DollarSign size={24} />
                  </div>
                  <ChevronRight size={18} className="text-gray-400 group-hover:text-cyan-600 transition-colors" />
                </div>
                <p className="text-gray-500 text-sm">Total Bids</p>
                <h3 className="text-2xl font-bold" data-testid="stat-total-bids">{stats?.totalBids || 0}</h3>
              </CardContent>
            </Card>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentRides && stats.recentRides.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentRides.map((ride) => (
                    <div key={ride.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid={`ride-activity-${ride.id}`}>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {ride.pickupLocation} → {ride.dropLocation}
                        </p>
                        <p className="text-xs text-gray-400">
                          {ride.createdAt ? formatDistanceToNow(new Date(ride.createdAt), { addSuffix: true }) : "Recently"}
                        </p>
                      </div>
                      <Badge className={getStatusColor(ride.status)}>
                        {ride.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
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
