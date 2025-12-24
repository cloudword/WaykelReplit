import { DashboardLayout } from "../components/DashboardLayout";
import { PaymentMethods } from "../components/PaymentMethods";

export default function Payments() {
  return (
    <DashboardLayout currentPage="/customer/dashboard/payments">
      <PaymentMethods />
    </DashboardLayout>
  );
}
