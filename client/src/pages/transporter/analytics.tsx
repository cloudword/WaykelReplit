import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, TrendingDown, IndianRupee, 
  Truck, Users, Route, Package, BarChart3, PieChart, MapPin
} from "lucide-react";
import { TransporterSidebar } from "@/components/layout/transporter-sidebar";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, Legend 
} from "recharts";
import { toast } from "sonner";

interface AnalyticsData {
  summary: {
    totalRides: number;
    completedRides: number;
    activeRides: number;
    pendingRides: number;
    cancelledRides: number;
    totalEarnings: number;
    totalIncentives: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
    earningsGrowth: number;
    avgTripValue: number;
    avgDistance: number;
    totalDrivers: number;
    totalVehicles: number;
    activeVehicles: number;
  };
  bidStats: {
    totalBids: number;
    acceptedBids: number;
    pendingBids: number;
    rejectedBids: number;
    successRate: number;
    avgBidAmount: number;
  };
  charts: {
    last7Days: { date: string; earnings: number; rides: number }[];
    monthly: { month: string; earnings: number; rides: number }[];
    cargoTypes: { type: string; count: number; earnings: number }[];
    topRoutes: { route: string; count: number; earnings: number }[];
  };
  vehicleStats: {
    id: string;
    plateNumber: string;
    type: string;
    status: string;
    totalRides: number;
    earnings: number;
  }[];
  driverStats: {
    id: string;
    name: string;
    phone: string;
    isOnline: boolean;
    totalRides: number;
    earnings: number;
    rating: string;
  }[];
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function TransporterAnalytics() {
  const [_, setLocation] = useLocation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await fetch("/api/transporter/analytics", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to load analytics");
      }
    } catch (error) {
      console.error("Failed to load analytics:", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  };

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
            <BarChart3 className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Analytics & Reports</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : analytics ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card data-testid="stat-total-earnings">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(analytics.summary.totalEarnings)}
                  </div>
                  <p className="text-xs text-gray-500">From {analytics.summary.completedRides} completed rides</p>
                </CardContent>
              </Card>

              <Card data-testid="stat-this-month">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(analytics.summary.thisMonthEarnings)}
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    {analytics.summary.earningsGrowth >= 0 ? (
                      <>
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        <span className="text-green-600">+{analytics.summary.earningsGrowth}%</span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        <span className="text-red-600">{analytics.summary.earningsGrowth}%</span>
                      </>
                    )}
                    <span className="text-gray-400">vs last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="stat-avg-trip">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Avg Trip Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {formatCurrency(analytics.summary.avgTripValue)}
                  </div>
                  <p className="text-xs text-gray-500">Per completed ride</p>
                </CardContent>
              </Card>

              <Card data-testid="stat-bid-success">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Bid Success Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {analytics.bidStats.successRate.toFixed(1)}%
                  </div>
                  <p className="text-xs text-gray-500">{analytics.bidStats.acceptedBids} of {analytics.bidStats.totalBids} bids</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="earnings" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-lg">
                <TabsTrigger value="earnings" data-testid="tab-earnings">Earnings</TabsTrigger>
                <TabsTrigger value="rides" data-testid="tab-rides">Rides</TabsTrigger>
                <TabsTrigger value="fleet" data-testid="tab-fleet">Fleet</TabsTrigger>
                <TabsTrigger value="routes" data-testid="tab-routes">Routes</TabsTrigger>
              </TabsList>

              <TabsContent value="earnings" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card data-testid="chart-daily-earnings">
                    <CardHeader>
                      <CardTitle>Last 7 Days Earnings</CardTitle>
                      <CardDescription>Daily earnings trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.charts.last7Days}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                            <Bar dataKey="earnings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="chart-monthly-earnings">
                    <CardHeader>
                      <CardTitle>Monthly Earnings</CardTitle>
                      <CardDescription>Last 6 months trend</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analytics.charts.monthly}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                            <Line type="monotone" dataKey="earnings" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="chart-cargo-breakdown">
                  <CardHeader>
                    <CardTitle>Earnings by Cargo Type</CardTitle>
                    <CardDescription>Revenue breakdown by cargo category</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.charts.cargoTypes.length > 0 ? (
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={analytics.charts.cargoTypes}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="earnings"
                              nameKey="type"
                              label={({ type, percent }) => `${type} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {analytics.charts.cargoTypes.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`₹${value}`, 'Earnings']} />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No cargo data available yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="rides" className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">{analytics.summary.totalRides}</div>
                        <p className="text-sm text-gray-500 mt-1">Total Rides</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">{analytics.summary.completedRides}</div>
                        <p className="text-sm text-gray-500 mt-1">Completed</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-yellow-600">{analytics.summary.activeRides}</div>
                        <p className="text-sm text-gray-500 mt-1">Active</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-orange-600">{analytics.summary.pendingRides}</div>
                        <p className="text-sm text-gray-500 mt-1">Pending</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-red-600">{analytics.summary.cancelledRides}</div>
                        <p className="text-sm text-gray-500 mt-1">Cancelled</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card data-testid="chart-ride-trend">
                  <CardHeader>
                    <CardTitle>Ride Volume Trend</CardTitle>
                    <CardDescription>Number of rides over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.charts.monthly}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="rides" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="stats-bid-breakdown">
                  <CardHeader>
                    <CardTitle>Bid Performance</CardTitle>
                    <CardDescription>Bidding statistics and conversion</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold">{analytics.bidStats.totalBids}</div>
                        <p className="text-sm text-gray-500">Total Bids</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{analytics.bidStats.acceptedBids}</div>
                        <p className="text-sm text-gray-500">Accepted</p>
                      </div>
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{analytics.bidStats.pendingBids}</div>
                        <p className="text-sm text-gray-500">Pending</p>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{analytics.bidStats.rejectedBids}</div>
                        <p className="text-sm text-gray-500">Rejected</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Average Bid Amount</span>
                        <span className="text-xl font-bold text-blue-600">{formatCurrency(analytics.bidStats.avgBidAmount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="fleet" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card data-testid="vehicle-performance">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Vehicle Performance
                      </CardTitle>
                      <CardDescription>Earnings and utilization by vehicle</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.vehicleStats.length > 0 ? (
                        <div className="space-y-3">
                          {analytics.vehicleStats.map((vehicle) => (
                            <div key={vehicle.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                                  <Truck className="h-5 w-5 text-teal-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{vehicle.plateNumber}</p>
                                  <p className="text-xs text-gray-500">{vehicle.type}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600">{formatCurrency(vehicle.earnings)}</p>
                                <p className="text-xs text-gray-500">{vehicle.totalRides} rides</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No vehicles added yet</p>
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => setLocation("/transporter/vehicles")}>
                            Add Vehicle
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card data-testid="driver-performance">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Driver Performance
                      </CardTitle>
                      <CardDescription>Earnings and ratings by driver</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.driverStats.length > 0 ? (
                        <div className="space-y-3">
                          {analytics.driverStats.map((driver) => (
                            <div key={driver.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{driver.name}</p>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={driver.isOnline ? "default" : "secondary"} className="text-xs">
                                      {driver.isOnline ? "Online" : "Offline"}
                                    </Badge>
                                    {parseFloat(driver.rating) > 0 && (
                                      <span className="text-xs text-yellow-600">⭐ {parseFloat(driver.rating).toFixed(1)}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-green-600">{formatCurrency(driver.earnings)}</p>
                                <p className="text-xs text-gray-500">{driver.totalRides} rides</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                          <p>No drivers added yet</p>
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => setLocation("/transporter/drivers")}>
                            Add Driver
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Fleet Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-teal-50 rounded-lg">
                        <div className="text-3xl font-bold text-teal-600">{analytics.summary.totalVehicles}</div>
                        <p className="text-sm text-gray-500">Total Vehicles</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">{analytics.summary.activeVehicles}</div>
                        <p className="text-sm text-gray-500">Active Vehicles</p>
                      </div>
                      <div className="text-center p-4 bg-indigo-50 rounded-lg">
                        <div className="text-3xl font-bold text-indigo-600">{analytics.summary.totalDrivers}</div>
                        <p className="text-sm text-gray-500">Total Drivers</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="routes" className="space-y-6">
                <Card data-testid="top-routes">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Route className="h-5 w-5" />
                      Top Performing Routes
                    </CardTitle>
                    <CardDescription>Most profitable routes based on completed rides</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.charts.topRoutes.length > 0 ? (
                      <div className="space-y-3">
                        {analytics.charts.topRoutes.map((route, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{route.route}</p>
                                <p className="text-xs text-gray-500">{route.count} rides</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">{formatCurrency(route.earnings)}</p>
                              <p className="text-xs text-gray-500">
                                avg {formatCurrency(route.earnings / route.count)}/ride
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No route data available yet</p>
                        <p className="text-sm">Complete some rides to see your top routes</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-6 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">
                          {analytics.summary.avgDistance.toFixed(0)} km
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Average Trip Distance</p>
                      </div>
                      <div className="text-center p-6 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">
                          {analytics.summary.completedRides > 0 
                            ? formatCurrency(analytics.summary.totalEarnings / (analytics.summary.avgDistance * analytics.summary.completedRides || 1))
                            : "₹0"
                          }
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Revenue per km</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <Card className="p-8 text-center">
            <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">No Analytics Data</h2>
            <p className="text-gray-500 mb-4">Complete some rides to see your performance analytics</p>
            <Button onClick={() => setLocation("/transporter/marketplace")}>
              Browse Marketplace
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
