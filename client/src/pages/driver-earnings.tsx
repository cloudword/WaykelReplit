import { MobileNav } from "@/components/layout/mobile-nav";
import { EARNINGS_DATA, MOCK_USER } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, IndianRupee } from "lucide-react";

export default function DriverEarnings() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-primary px-4 pt-8 pb-16 text-white rounded-b-[2rem]">
        <div className="flex justify-between items-start mb-6">
          <h1 className="text-xl font-bold">Earnings</h1>
          <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
            This Week
          </span>
        </div>
        
        <div className="text-center">
          <p className="text-blue-100 text-sm mb-1">Total Payout</p>
          <h2 className="text-4xl font-bold flex items-center justify-center">
            <IndianRupee className="h-8 w-8" />
            14,350
          </h2>
          <div className="flex items-center justify-center gap-1 text-green-300 text-sm mt-2">
            <ArrowUpRight className="h-4 w-4" />
            <span>+12% from last week</span>
          </div>
        </div>
      </header>

      <main className="p-4 -mt-10 space-y-6">
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="text-base">Weekly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={EARNINGS_DATA}>
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
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {EARNINGS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 5 ? 'hsl(221 83% 53%)' : '#e2e8f0'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Today</p>
              <p className="text-2xl font-bold">₹{MOCK_USER.earningsToday}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Trips</p>
              <p className="text-2xl font-bold">{MOCK_USER.totalTrips}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payouts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between items-center pb-4 border-b last:border-0 last:pb-0">
                <div>
                  <p className="font-medium">Weekly Settlement</p>
                  <p className="text-xs text-muted-foreground">Nov {20 - i}, 2025</p>
                </div>
                <p className="font-bold text-green-600">+ ₹4,200</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
