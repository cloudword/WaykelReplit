import { DashboardLayout } from "../components/DashboardLayout";
import { BookingsList } from "../components/BookingsList";
import { useQuery } from "@tanstack/react-query";
import { waykelApi } from "../lib/waykelApi";

export default function ActiveBookings() {
  const { data: rides = [], isLoading } = useQuery({
    queryKey: ["customer-rides"],
    queryFn: () => waykelApi.rides.getMyRides(),
  });

  const activeRides = rides.filter(r =>
    ["pending", "open", "bidding", "accepted", "in_transit", "active"].includes(r.status.toLowerCase())
  );

  return (
    <DashboardLayout currentPage="/customer/dashboard/active">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Active Bookings</h1>
        <p className="text-muted-foreground text-sm font-medium">Track and manage your ongoing shipments</p>
      </div>
      <BookingsList type="active" rides={activeRides} isLoading={isLoading} />
    </DashboardLayout>
  );
}
