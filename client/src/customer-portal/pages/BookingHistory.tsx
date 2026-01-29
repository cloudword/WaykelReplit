import { DashboardLayout } from "../components/DashboardLayout";
import { BookingsList } from "../components/BookingsList";
import { useQuery } from "@tanstack/react-query";
import { waykelApi } from "../lib/waykelApi";

export default function BookingHistory() {
  const { data: rides = [], isLoading } = useQuery({
    queryKey: ["customer-rides"],
    queryFn: () => waykelApi.rides.getMyRides(),
  });

  const historyRides = rides.filter(r =>
    ["delivered", "completed", "cancelled"].includes(r.status.toLowerCase())
  );

  return (
    <DashboardLayout currentPage="/customer/dashboard/history">
      <div className="space-y-2 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Past Orders</h1>
        <p className="text-muted-foreground text-sm font-medium">Review your completed and cancelled shipments</p>
      </div>
      <BookingsList type="history" rides={historyRides} isLoading={isLoading} />
    </DashboardLayout>
  );
}
