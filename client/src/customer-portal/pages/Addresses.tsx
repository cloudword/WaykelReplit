import { DashboardLayout } from "../components/DashboardLayout";
import { AddressList } from "../components/AddressList";

export default function Addresses() {
    return (
        <DashboardLayout currentPage="/customer/dashboard/addresses">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Saved Addresses</h1>
                    <p className="text-muted-foreground text-sm">Manage your frequent pickup and drop-off locations for faster bookings</p>
                </div>
                <AddressList />
            </div>
        </DashboardLayout>
    );
}
