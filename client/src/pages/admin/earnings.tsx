import { useState, useEffect } from "react";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, Building2, Truck, Download, ArrowUpRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280'];

export default function AdminEarnings() {
  const [rides, setRides] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ridesRes, transportersRes] = await Promise.all([
        api.rides.list(),
        api.transporters.list()
      ]);
      setRides(Array.isArray(ridesRes) ? ridesRes : []);
      setTransporters(Array.isArray(transportersRes) ? transportersRes : []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const completedRides = rides.filter(r => r.status === "completed");
  const totalRevenue = completedRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
  const totalTrips = completedRides.length;
  const avgTripValue = totalTrips > 0 ? Math.round(totalRevenue / totalTrips) : 0;
  const activeTransporters = transporters.filter(t => t.status === "active").length;

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    const monthRides = completedRides.filter(r => {
      const rideDate = new Date(r.date);
      return rideDate.getMonth() === date.getMonth() && rideDate.getFullYear() === date.getFullYear();
    });
    const revenue = monthRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
    const trips = monthRides.length;
    return { name: monthName, revenue, trips };
  });

  const revenueByTransporter = transporters.map((transporter, index) => {
    const transporterRides = completedRides.filter(r => r.transporterId === transporter.id);
    const value = transporterRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
    return {
      name: transporter.companyName,
      value,
      color: COLORS[index % COLORS.length]
    };
  }).filter(t => t.value > 0).slice(0, 5);

  const recentTransactions = completedRides.slice(0, 5).map(ride => ({
    id: ride.id.slice(0, 8),
    transporter: transporters.find(t => t.id === ride.transporterId)?.companyName || "Direct",
    amount: parseFloat(ride.price || "0"),
    type: "Trip Completion",
    date: ride.date,
    route: `${ride.pickupLocation?.split(',')[0]} → ${ride.dropLocation?.split(',')[0]}`
  }));

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Revenue</h1>
            <p className="text-gray-500">Platform-wide financial overview</p>
          </div>
          <div className="flex gap-3">
            <Select defaultValue="2025">
              <SelectTrigger className="w-[120px]" data-testid="select-year">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                      <DollarSign size={24} />
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                      <TrendingUp size={12} />
                      Platform
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">Total Revenue</p>
                  <h3 className="text-2xl font-bold" data-testid="text-total-revenue">
                    ₹{totalRevenue >= 100000 ? `${(totalRevenue / 100000).toFixed(1)}L` : totalRevenue.toLocaleString()}
                  </h3>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                      <Truck size={24} />
                    </div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">Completed</span>
                  </div>
                  <p className="text-gray-500 text-sm">Total Trips</p>
                  <h3 className="text-2xl font-bold" data-testid="text-total-trips">{totalTrips.toLocaleString()}</h3>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                      <ArrowUpRight size={24} />
                    </div>
                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">Avg</span>
                  </div>
                  <p className="text-gray-500 text-sm">Avg. Trip Value</p>
                  <h3 className="text-2xl font-bold" data-testid="text-avg-value">₹{avgTripValue.toLocaleString()}</h3>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                      <Building2 size={24} />
                    </div>
                    <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded">Active</span>
                  </div>
                  <p className="text-gray-500 text-sm">Active Transporters</p>
                  <h3 className="text-2xl font-bold" data-testid="text-active-transporters">{activeTransporters}</h3>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>Revenue Trend (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={last6Months}>
                        <XAxis 
                          dataKey="name" 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="#888888" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false}
                          tickFormatter={(value) => value >= 1000 ? `₹${(value / 1000)}K` : `₹${value}`}
                        />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Revenue by Transporter</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueByTransporter.length > 0 ? (
                    <>
                      <div className="h-[200px] w-full mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={revenueByTransporter}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              dataKey="value"
                            >
                              {revenueByTransporter.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number) => [`₹${value >= 100000 ? (value / 100000).toFixed(1) + 'L' : value.toLocaleString()}`, '']}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-2">
                        {revenueByTransporter.map((item) => (
                          <div key={item.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
                            </div>
                            <span className="font-medium">
                              ₹{item.value >= 100000 ? `${(item.value / 100000).toFixed(1)}L` : item.value.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-gray-400 py-8">No revenue data yet</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button variant="ghost" size="sm" data-testid="button-view-all">View All</Button>
              </CardHeader>
              <CardContent>
                {recentTransactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Trip ID</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Transporter</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Route</th>
                          <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTransactions.map((txn) => (
                          <tr key={txn.id} className="border-b last:border-0 hover:bg-gray-50" data-testid={`row-transaction-${txn.id}`}>
                            <td className="py-3 px-4 font-medium">#{txn.id}</td>
                            <td className="py-3 px-4 text-gray-600">{txn.transporter}</td>
                            <td className="py-3 px-4 text-gray-600 text-sm truncate max-w-[200px]">{txn.route}</td>
                            <td className="py-3 px-4 text-gray-500 text-sm">{txn.date}</td>
                            <td className="py-3 px-4 text-right font-bold text-green-600">+₹{txn.amount.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-center text-gray-400 py-8">No completed transactions yet</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
