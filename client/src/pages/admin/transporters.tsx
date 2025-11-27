import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, MoreHorizontal, Building2, Download } from "lucide-react";
import { MOCK_TRANSPORTERS } from "@/lib/mockData";

export default function AdminTransporters() {
  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transporters</h1>
            <p className="text-gray-500">Manage fleet owners and logistics companies</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Export Excel
            </Button>
            <Button>+ Add Transporter</Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 w-full max-w-md">
              <Search className="h-4 w-4 text-gray-500" />
              <Input placeholder="Search company name..." />
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Fleet Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_TRANSPORTERS.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 rounded flex items-center justify-center text-blue-600">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <span className="font-medium">{t.companyName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{t.ownerName}</p>
                        <p className="text-xs text-gray-500">{t.contact}</p>
                      </div>
                    </TableCell>
                    <TableCell>{t.location}</TableCell>
                    <TableCell>{t.fleetSize} Vehicles</TableCell>
                    <TableCell>
                      <Badge variant={t.status === 'active' ? 'default' : 'secondary'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
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
