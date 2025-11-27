import { useState } from "react";
import { useLocation } from "wouter";
import { MOCK_RIDES } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, ArrowLeft } from "lucide-react";

export default function TransporterBids() {
  const [_, setLocation] = useLocation();

  // Mocking some bids for the transporter view
  const myBids = MOCK_RIDES.filter(r => r.bids && r.bids.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/transporter")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-primary">My Bids</h1>
      </header>

      <main className="p-4 space-y-4">
        {myBids.map((ride) => (
          <Card key={ride.id} className="overflow-hidden">
            <CardHeader className="bg-gray-50 pb-2 pt-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-medium text-gray-500">Load ID: {ride.id}</CardTitle>
                {ride.bids?.map((bid, idx) => (
                    <Badge key={idx} variant={bid.status === 'pending' ? 'secondary' : bid.status === 'accepted' ? 'default' : 'destructive'}>
                        {bid.status}
                    </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground">Route</p>
                  <p className="font-semibold text-sm">{ride.pickupLocation}</p>
                  <p className="text-xs text-gray-400">to</p>
                  <p className="font-semibold text-sm">{ride.dropLocation}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">My Bid</p>
                  {ride.bids?.map((bid, idx) => (
                      <p key={idx} className="text-lg font-bold text-green-600">₹{bid.amount}</p>
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                Original Load Price: ₹{ride.price}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {myBids.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>You haven't placed any bids yet.</p>
            </div>
        )}
      </main>
    </div>
  );
}
