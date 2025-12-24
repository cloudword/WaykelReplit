import { DashboardLayout } from "../components/DashboardLayout";
import { BookingsList } from "../components/BookingsList";

export default function ActiveBookings() {
  return (
    <DashboardLayout currentPage="/customer/dashboard/active">
      <BookingsList type="active" />
    </DashboardLayout>
  );
}
