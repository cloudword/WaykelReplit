import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollText, Search, RefreshCw, Clock, Globe, AlertCircle, Activity, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { API_BASE } from "@/lib/api";

interface ApiLog {
  id: string;
  method: string;
  path: string;
  statusCode: number | null;
  userId: string | null;
  userRole: string | null;
  origin: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  requestBody: any;
  responseTime: number | null;
  errorMessage: string | null;
  isExternal: boolean;
  createdAt: string;
}

interface LogStats {
  totalRequests: number;
  externalRequests: number;
  errorCount: number;
  avgResponseTime: number;
}

export default function AdminApiLogs() {
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchPath, setSearchPath] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [endpointFilter, setEndpointFilter] = useState<string>("all");

  const uniqueEndpoints = Array.from(new Set(logs.map(log => {
    const parts = log.path.split('?')[0].split('/');
    if (parts.length >= 3) {
      return `/${parts[1]}/${parts[2]}`;
    }
    return log.path.split('?')[0];
  }))).sort();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [logsRes, statsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/logs?limit=200`, { credentials: "include" }),
        fetch(`${API_BASE}/admin/logs/stats`, { credentials: "include" }),
      ]);
      
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogs(Array.isArray(logsData) ? logsData : []);
      }
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-800";
      case "POST": return "bg-blue-100 text-blue-800";
      case "PATCH": return "bg-yellow-100 text-yellow-800";
      case "PUT": return "bg-orange-100 text-orange-800";
      case "DELETE": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: number | null) => {
    if (!status) return "outline";
    if (status >= 500) return "destructive";
    if (status >= 400) return "secondary";
    if (status >= 300) return "outline";
    return "default";
  };

  const filteredLogs = logs.filter(log => {
    const matchesPath = !searchPath || log.path.toLowerCase().includes(searchPath.toLowerCase());
    const matchesMethod = methodFilter === "all" || log.method === methodFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "success" && log.statusCode && log.statusCode < 400) ||
      (statusFilter === "error" && log.statusCode && log.statusCode >= 400) ||
      (statusFilter === "external" && log.isExternal);
    const matchesEndpoint = endpointFilter === "all" || log.path.startsWith(endpointFilter);
    return matchesPath && matchesMethod && matchesStatus && matchesEndpoint;
  });

  return (
    <div className="min-h-screen bg-gray-100 pl-64">
      <AdminSidebar />
      
      <main className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">API Logs</h1>
            <p className="text-gray-500">Monitor all API requests (internal and external)</p>
          </div>
          <Button onClick={fetchData} variant="outline" className="gap-2" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalRequests?.toLocaleString() || 0}</p>
                  <p className="text-sm text-gray-500">Total Requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Globe className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.externalRequests?.toLocaleString() || 0}</p>
                  <p className="text-sm text-gray-500">External (Portal)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.errorCount?.toLocaleString() || 0}</p>
                  <p className="text-sm text-gray-500">Errors (4xx/5xx)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.avgResponseTime || 0}ms</p>
                  <p className="text-sm text-gray-500">Avg Response Time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="h-5 w-5" />
                Request Logs
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="Filter by path..." 
                    value={searchPath}
                    onChange={(e) => setSearchPath(e.target.value)}
                    className="w-48"
                    data-testid="input-search-path"
                  />
                </div>
                <Select value={methodFilter} onValueChange={setMethodFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32" data-testid="select-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success (2xx)</SelectItem>
                    <SelectItem value="error">Errors (4xx/5xx)</SelectItem>
                    <SelectItem value="external">External Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={endpointFilter} onValueChange={setEndpointFilter}>
                  <SelectTrigger className="w-40" data-testid="select-endpoint">
                    <Filter className="h-4 w-4 mr-1" />
                    <SelectValue placeholder="Endpoint" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Endpoints</SelectItem>
                    {uniqueEndpoints.map(endpoint => (
                      <SelectItem key={endpoint} value={endpoint}>{endpoint}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ScrollText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                No API logs found
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Time</TableHead>
                      <TableHead className="w-20">Method</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead className="w-20">Time (ms)</TableHead>
                      <TableHead>User / Origin</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id} className={log.statusCode && log.statusCode >= 400 ? "bg-red-50" : ""} data-testid={`row-log-${log.id}`}>
                        <TableCell className="text-xs text-gray-500">
                          {log.createdAt ? format(new Date(log.createdAt), "HH:mm:ss") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${getMethodColor(log.method)}`}>
                            {log.method}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-xs truncate" title={log.path}>
                          {log.path}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(log.statusCode)}>
                            {log.statusCode || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.responseTime || "-"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {log.isExternal && (
                            <Badge variant="outline" className="mr-1 text-purple-600 border-purple-300">
                              <Globe className="h-3 w-3 mr-1" /> External
                            </Badge>
                          )}
                          {log.userRole && (
                            <span className="text-gray-600">{log.userRole}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-red-600 max-w-xs truncate" title={log.errorMessage || ""}>
                          {log.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
