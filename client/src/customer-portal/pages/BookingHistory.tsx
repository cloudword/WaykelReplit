import { DashboardLayout } from "../components/DashboardLayout";
import { BookingsList } from "../components/BookingsList";

export default function BookingHistory() {
  return (
    <DashboardLayout currentPage="/customer/dashboard/history">
      <BookingsList type="history" />
    </DashboardLayout>
  );
}
