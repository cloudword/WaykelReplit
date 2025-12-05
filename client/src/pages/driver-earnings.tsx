import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, IndianRupee, TrendingUp, Calendar, Truck, Wallet } from "lucide-react";
import { api } from "@/lib/api";

export default function DriverEarnings() {
  const [_, setLocation] = useLocation();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user] = useState<any>(() => {
    const stored = localStorage.getItem("currentUser");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    const loadRides = async () => {
      if (!user?.id) return;
      try {
        const data = await api.rides.list({ driverId: user.id });
        setRides(Array.isArray(data) ? data.filter((r: any) => r.status === "completed") : []);
      } catch (error) {
        console.error("Failed to load rides:", error);
      } finally {
        setLoading(false);
      }
    };
    loadRides();
  }, [user?.id]);

  const totalEarnings = rides.reduce((sum, ride) => sum + parseFloat(ride.price || "0"), 0);
  const totalTrips = rides.length;
  const todaysEarnings = user?.earningsToday ? parseFloat(user.earningsToday) : 0;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayRides = rides.filter(r => {
      const rideDate = new Date(r.date);
      return rideDate.toDateString() === date.toDateString();
    });
    const amount = dayRides.reduce((sum, r) => sum + parseFloat(r.price || "0"), 0);
    return { name: dayName, amount, date: date.toDateString() };
  });

  const recentPayouts = rides.slice(0, 5).map(ride => ({
    id: ride.id,
    date: ride.date,
    amount: parseFloat(ride.price || "0"),
    from: ride.pickupLocation,
    to: ride.dropLocation,
  }));

  if (!user) {
    setLocation("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-primary px-4 pt-8 pb-16 text-white rounded-b-[2rem]">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-xl font-bold">Earnings</h1>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
            All Time
          </span>
        </div>
        
        <div className="text-center">
          <p className="text-blue-100 text-sm mb-1">Total Earnings</p>
          <h2 className="text-4xl font-bold flex items-center justify-center" data-testid="text-total-earnings">
            <IndianRupee className="h-8 w-8" />
            {totalEarnings.toLocaleString()}
          </h2>
          <div className="flex items-center justify-center gap-1 text-green-300 text-sm mt-2">
            <TrendingUp className="h-4 w-4" />
            <span>{totalTrips} completed trips</span>
          </div>
        </div>
      </header>

      <main className="p-4 -mt-10 space-y-6">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400">
                Loading...
              </div>
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7Days}>
                    <XAxis 
                      dataKey="name" 
                      stroke="#888888" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false} 
                    />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Earnings']}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {last7Days.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === last7Days.length - 1 ? 'hsl(221 83% 53%)' : '#e2e8f0'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-4 w-4 text-green-600" />
                <p className="text-sm text-muted-foreground">Today</p>
              </div>
              <p className="text-2xl font-bold" data-testid="text-today-earnings">₹{todaysEarnings.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-2">
                <Truck className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-muted-foreground">Total Trips</p>
              </div>
              <p className="text-2xl font-bold" data-testid="text-total-trips">{totalTrips}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Earnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentPayouts.length > 0 ? (
              recentPayouts.map((payout) => (
                <div key={payout.id} className="flex justify-between items-center pb-4 border-b last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-sm truncate max-w-[180px]">
                      {payout.from} → {payout.to}
                    </p>
                    <p className="text-xs text-muted-foreground">{payout.date}</p>
                  </div>
                  <p className="font-bold text-green-600">+ ₹{payout.amount.toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 py-4">No completed rides yet</p>
            )}
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
