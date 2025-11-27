import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, DollarSign, Activity } from "lucide-react";
import chartImage from "@assets/generated_images/admin_dashboard_analytics_graph.png";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of your logistics operations</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Users size={24} />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">+12%</span>
              </div>
              <p className="text-gray-500 text-sm">Total Drivers</p>
              <h3 className="text-2xl font-bold">1,248</h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                  <Truck size={24} />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">+5%</span>
              </div>
              <p className="text-gray-500 text-sm">Active Vehicles</p>
              <h3 className="text-2xl font-bold">856</h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                  <DollarSign size={24} />
                </div>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">+24%</span>
              </div>
              <p className="text-gray-500 text-sm">Total Earnings</p>
              <h3 className="text-2xl font-bold">₹24.5L</h3>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                  <Activity size={24} />
                </div>
                <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">Live</span>
              </div>
              <p className="text-gray-500 text-sm">Ongoing Trips</p>
              <h3 className="text-2xl font-bold">142</h3>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Recent Activity */}
        <div className="grid grid-cols-3 gap-6">
          <Card className="col-span-2 overflow-hidden">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <img src={chartImage} alt="Analytics Chart" className="w-full h-64 object-cover" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Live Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Driver #{1000+i} started trip</p>
                      <p className="text-xs text-gray-400">Mumbai to Pune • 2m ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
