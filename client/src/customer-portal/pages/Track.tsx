import { DashboardLayout } from "../components/DashboardLayout";
import { TrackingView } from "../components/TrackingView";

export default function Track() {
  return (
    <DashboardLayout currentPage="/customer/dashboard/track">
      <TrackingView />
    </DashboardLayout>
  );
}
