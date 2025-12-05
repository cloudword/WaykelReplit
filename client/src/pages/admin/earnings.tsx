import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Building2, Users, Truck, Download, ArrowUpRight } from "lucide-react";

const MONTHLY_REVENUE = [
  { name: 'Jan', revenue: 245000, trips: 120 },
  { name: 'Feb', revenue: 312000, trips: 145 },
  { name: 'Mar', revenue: 298000, trips: 138 },
  { name: 'Apr', revenue: 425000, trips: 189 },
  { name: 'May', revenue: 389000, trips: 176 },
  { name: 'Jun', revenue: 478000, trips: 210 },
  { name: 'Jul', revenue: 512000, trips: 234 },
  { name: 'Aug', revenue: 489000, trips: 221 },
  { name: 'Sep', revenue: 534000, trips: 245 },
  { name: 'Oct', revenue: 612000, trips: 278 },
  { name: 'Nov', revenue: 578000, trips: 264 },
  { name: 'Dec', revenue: 645000, trips: 298 },
];

const REVENUE_BY_TRANSPORTER = [
  { name: 'FastTrack Logistics', value: 1250000, color: '#3b82f6' },
  { name: 'Swift Movers', value: 980000, color: '#10b981' },
  { name: 'Highway Express', value: 850000, color: '#f59e0b' },
  { name: 'Metro Cargo', value: 720000, color: '#8b5cf6' },
  { name: 'Others', value: 1200000, color: '#6b7280' },
];

const RECENT_TRANSACTIONS = [
  { id: 'TXN-2851', transporter: 'FastTrack Logistics', amount: 45000, type: 'Trip Completion', date: 'Dec 5, 2025' },
  { id: 'TXN-2850', transporter: 'Swift Movers', amount: 32000, type: 'Trip Completion', date: 'Dec 5, 2025' },
  { id: 'TXN-2849', transporter: 'Highway Express', amount: 28500, type: 'Trip Completion', date: 'Dec 4, 2025' },
  { id: 'TXN-2848', transporter: 'Metro Cargo', amount: 51000, type: 'Trip Completion', date: 'Dec 4, 2025' },
  { id: 'TXN-2847', transporter: 'FastTrack Logistics', amount: 38000, type: 'Trip Completion', date: 'Dec 3, 2025' },
];

export default function AdminEarnings() {
  const totalRevenue = 5017000;
  const monthlyGrowth = 11.6;
  const totalTrips = 2318;
  const avgTripValue = Math.round(totalRevenue / totalTrips);

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
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <DollarSign size={24} />
                </div>
                <div className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                  <TrendingUp size={12} />
                  +{monthlyGrowth}%
                </div>
              </div>
              <p className="text-gray-500 text-sm">Total Revenue (YTD)</p>
              <h3 className="text-2xl font-bold" data-testid="text-total-revenue">₹{(totalRevenue / 100000).toFixed(1)}L</h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Truck size={24} />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">+8%</span>
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
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">+5%</span>
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
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">+3</span>
              </div>
              <p className="text-gray-500 text-sm">Active Transporters</p>
              <h3 className="text-2xl font-bold" data-testid="text-active-transporters">42</h3>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-8">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Monthly Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={MONTHLY_REVENUE}>
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
                      tickFormatter={(value) => `₹${(value / 1000)}K`}
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
              <div className="h-[200px] w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={REVENUE_BY_TRANSPORTER}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {REVENUE_BY_TRANSPORTER.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`₹${(value / 100000).toFixed(1)}L`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {REVENUE_BY_TRANSPORTER.slice(0, 4).map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-600 truncate max-w-[120px]">{item.name}</span>
                    </div>
                    <span className="font-medium">₹{(item.value / 100000).toFixed(1)}L</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Button variant="ghost" size="sm" data-testid="button-view-all">View All</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Transaction ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Transporter</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 text-sm">Date</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 text-sm">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_TRANSACTIONS.map((txn) => (
                    <tr key={txn.id} className="border-b last:border-0 hover:bg-gray-50" data-testid={`row-transaction-${txn.id}`}>
                      <td className="py-3 px-4 font-medium">{txn.id}</td>
                      <td className="py-3 px-4 text-gray-600">{txn.transporter}</td>
                      <td className="py-3 px-4">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">{txn.type}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm">{txn.date}</td>
                      <td className="py-3 px-4 text-right font-bold text-green-600">+₹{txn.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
