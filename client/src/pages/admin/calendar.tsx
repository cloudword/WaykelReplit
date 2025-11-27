import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { CalendarView } from "@/components/calendar-view";
import { MOCK_RIDES } from "@/lib/mockData";

export default function AdminCalendar() {
  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      <main className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500">Global view of all scheduled and ongoing trips</p>
        </div>
        <div className="max-w-4xl">
          <CalendarView rides={MOCK_RIDES} view="admin" />
        </div>
      </main>
    </div>
  );
}
