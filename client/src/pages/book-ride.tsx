import { useState } from "react";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, IndianRupee, Gift, CheckCircle2 } from "lucide-react";

export default function BookRide() {
  const [_, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [fareAmount, setFareAmount] = useState("");

  const calculatedIncentive = fareAmount ? Math.floor(parseInt(fareAmount) * 0.05) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/driver")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold">Book External Load</h1>
      </header>

      <main className="p-4">
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader className="bg-blue-50/50 pb-4">
                <CardTitle className="text-base text-primary flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Partner Incentive
                </CardTitle>
                <CardDescription>
                  Earn extra by bringing your own leads to the platform.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-white border-2 border-dashed border-primary/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Estimated Incentive</p>
                  <div className="text-3xl font-bold text-green-600 flex items-center justify-center">
                    <IndianRupee className="h-6 w-6" />
                    {calculatedIncentive || 0}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">5% of trip fare</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup">Pickup Location</Label>
                  <Input id="pickup" placeholder="e.g. Andheri" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drop">Drop Location</Label>
                  <Input id="drop" placeholder="e.g. Vashi" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer">Customer Name</Label>
                <Input id="customer" placeholder="Client Name" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Customer Phone</Label>
                <Input id="phone" type="tel" placeholder="+91" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fare">Trip Fare (₹)</Label>
                <Input 
                  id="fare" 
                  type="number" 
                  placeholder="2000" 
                  value={fareAmount}
                  onChange={(e) => setFareAmount(e.target.value)}
                  required 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo Details</Label>
                <Input id="cargo" placeholder="e.g. 10 Boxes, Electronics" required />
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base">
              Create Booking
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
              <p className="text-muted-foreground max-w-xs mx-auto">
                Your external load has been registered. The incentive of ₹{calculatedIncentive} will be credited after trip completion.
              </p>
            </div>
            <Button className="w-full max-w-xs" onClick={() => setLocation("/driver")}>
              Back to Dashboard
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
