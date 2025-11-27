import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MoreHorizontal, FileText } from "lucide-react";

const MOCK_DRIVERS = [
  { id: "D001", name: "Rajesh Kumar", phone: "+91 98765 43210", city: "Mumbai", status: "Active", rating: 4.8, earnings: "₹45,200" },
  { id: "D002", name: "Suresh Singh", phone: "+91 98123 45678", city: "Pune", status: "On Trip", rating: 4.5, earnings: "₹32,100" },
  { id: "D003", name: "Amit Patel", phone: "+91 99887 76655", city: "Nashik", status: "Inactive", rating: 4.9, earnings: "₹12,500" },
  { id: "D004", name: "Vijay Yadav", phone: "+91 88776 65544", city: "Mumbai", status: "Active", rating: 4.2, earnings: "₹28,900" },
  { id: "D005", name: "Rahul Verma", phone: "+91 77665 54433", city: "Thane", status: "Blocked", rating: 3.5, earnings: "₹5,400" },
];

export default function AdminDrivers() {
  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Management</h1>
            <p className="text-gray-500">Manage drivers, documents and assignments</p>
          </div>
          <Button className="gap-2">
            + Register Driver
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2 w-full max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input placeholder="Search drivers..." className="pl-9" />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Base City</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Total Earnings</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_DRIVERS.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>{driver.city}</TableCell>
                    <TableCell>
                      <Badge variant={
                        driver.status === "Active" ? "default" : 
                        driver.status === "On Trip" ? "secondary" : 
                        driver.status === "Blocked" ? "destructive" : "outline"
                      }>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{driver.rating} ★</TableCell>
                    <TableCell>{driver.earnings}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
