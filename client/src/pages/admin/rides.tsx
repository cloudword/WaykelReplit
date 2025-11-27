import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, CheckCircle, XCircle } from "lucide-react";
import { MOCK_RIDES } from "@/lib/mockData";

export default function AdminBids() {
  const ridesWithBids = MOCK_RIDES.filter(r => r.bids && r.bids.length > 0);

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bid Management</h1>
            <p className="text-gray-500">Approve or reject driver bids for loads</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 w-full max-w-md">
              <Search className="h-4 w-4 text-gray-500" />
              <Input placeholder="Search by Load ID..." />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Load ID</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver / Transporter</TableHead>
                  <TableHead>Bid Amount</TableHead>
                  <TableHead>Original Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ridesWithBids.map((ride) => (
                  ride.bids?.map((bid, idx) => (
                    <TableRow key={`${ride.id}-${idx}`}>
                      <TableCell className="font-medium">{ride.id}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <p><span className="text-gray-500">From:</span> {ride.pickupLocation}</p>
                          <p><span className="text-gray-500">To:</span> {ride.dropLocation}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{bid.driverName}</p>
                        <p className="text-xs text-gray-500">ID: {bid.driverId}</p>
                      </TableCell>
                      <TableCell className="font-bold text-green-600">₹{bid.amount}</TableCell>
                      <TableCell className="text-gray-500 line-through">₹{ride.price}</TableCell>
                      <TableCell>
                        <Badge variant={bid.status === 'pending' ? 'secondary' : 'default'}>
                          {bid.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                            Reject
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">
                            Approve
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
