import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, MoreHorizontal, Truck } from "lucide-react";

const MOCK_VEHICLES = [
  { id: "V001", plate: "MH 12 DE 1432", type: "Tata Ace", owner: "Rajesh Kumar", capacity: "750 kg", status: "Active" },
  { id: "V002", plate: "MH 14 AB 9988", type: "Ashok Leyland Dost", owner: "Rajesh Kumar", capacity: "1250 kg", status: "Active" },
  { id: "V003", plate: "MH 02 XZ 5555", type: "Eicher Pro", owner: "Transport Co.", capacity: "3000 kg", status: "Maintenance" },
  { id: "V004", plate: "MH 43 QQ 1122", type: "Tata Ace", owner: "Suresh Singh", capacity: "750 kg", status: "On Trip" },
];

export default function AdminVehicles() {
  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vehicle Fleet</h1>
            <p className="text-gray-500">Track and manage registered vehicles</p>
          </div>
          <Button className="gap-2">
            + Add Vehicle
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-2 w-full max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input placeholder="Search vehicles..." className="pl-9" />
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
                  <TableHead>Vehicle ID</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_VEHICLES.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-medium">{vehicle.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                          <Truck className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">{vehicle.plate}</p>
                          <p className="text-xs text-gray-500">{vehicle.type}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{vehicle.owner}</TableCell>
                    <TableCell>{vehicle.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={
                        vehicle.status === "Active" ? "default" : 
                        vehicle.status === "On Trip" ? "secondary" : "outline"
                      }>
                        {vehicle.status}
                      </Badge>
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
