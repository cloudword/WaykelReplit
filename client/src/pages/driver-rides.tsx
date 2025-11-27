import { MobileNav } from "@/components/layout/mobile-nav";
import { MOCK_RIDES } from "@/lib/mockData";
import { RideCard } from "@/components/ride-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DriverRides() {
  const scheduledRides = MOCK_RIDES.filter(r => r.status === "scheduled");
  const completedRides = MOCK_RIDES.filter(r => r.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white px-4 py-4 sticky top-0 z-10 border-b">
        <h1 className="text-xl font-bold">My Rides</h1>
      </header>

      <main className="p-4">
        <Tabs defaultValue="scheduled" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="scheduled" className="space-y-4">
            {scheduledRides.length > 0 ? (
              scheduledRides.map(ride => (
                <RideCard key={ride.id} ride={ride} isReadOnly />
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">No scheduled rides</div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {completedRides.length > 0 ? (
              completedRides.map(ride => (
                <RideCard key={ride.id} ride={ride} isReadOnly />
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">No past rides</div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <MobileNav />
    </div>
  );
}
