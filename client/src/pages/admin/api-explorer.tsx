import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Copy, Check, Search, Code, Download, Globe, Server } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  description: string;
  category: string;
  requestBody?: Record<string, any>;
  queryParams?: string[];
  responseExample?: Record<string, any>;
}

const API_CATALOG: ApiEndpoint[] = [
  // Auth
  { id: "auth-register", method: "POST", path: "/api/auth/register", description: "Register a new user", category: "Authentication", requestBody: { name: "string", email: "string", phone: "string", password: "string", role: "customer|driver|transporter" } },
  { id: "auth-login", method: "POST", path: "/api/auth/login", description: "Login with phone and password", category: "Authentication", requestBody: { phone: "string", password: "string" } },
  { id: "auth-logout", method: "POST", path: "/api/auth/logout", description: "Logout current user", category: "Authentication" },
  { id: "auth-session", method: "GET", path: "/api/auth/session", description: "Check current session status", category: "Authentication" },
  { id: "auth-change-password", method: "POST", path: "/api/auth/change-password", description: "Change user password", category: "Authentication", requestBody: { currentPassword: "string", newPassword: "string" } },
  
  // Rides
  { id: "rides-list", method: "GET", path: "/api/rides", description: "List all rides", category: "Rides", queryParams: ["status", "driverId", "transporterId", "createdById"] },
  { id: "rides-get", method: "GET", path: "/api/rides/:id", description: "Get ride by ID", category: "Rides" },
  { id: "rides-create", method: "POST", path: "/api/rides", description: "Create a new ride/trip request", category: "Rides", requestBody: { pickupLocation: "string", dropLocation: "string", pickupTime: "string", date: "string", price: "string", distance: "string", cargoType: "string", weight: "string", customerName: "string?", customerPhone: "string?", createdById: "string?" } },
  { id: "rides-status", method: "PATCH", path: "/api/rides/:id/status", description: "Update ride status", category: "Rides", requestBody: { status: "pending|active|completed|cancelled|scheduled|bid_placed" } },
  { id: "rides-assign", method: "PATCH", path: "/api/rides/:id/assign", description: "Assign driver to ride", category: "Rides", requestBody: { driverId: "string", vehicleId: "string" } },
  
  // Bids
  { id: "bids-list", method: "GET", path: "/api/bids", description: "List all bids", category: "Bids", queryParams: ["rideId", "userId", "transporterId"] },
  { id: "bids-create", method: "POST", path: "/api/bids", description: "Create a new bid", category: "Bids", requestBody: { rideId: "string", userId: "string", vehicleId: "string", amount: "string", transporterId: "string?" } },
  { id: "bids-status", method: "PATCH", path: "/api/bids/:id/status", description: "Accept or reject a bid", category: "Bids", requestBody: { status: "pending|accepted|rejected" } },
  
  // Vehicles
  { id: "vehicles-list", method: "GET", path: "/api/vehicles", description: "List vehicles", category: "Vehicles", queryParams: ["userId", "transporterId"] },
  { id: "vehicles-all", method: "GET", path: "/api/vehicles/all", description: "Get all vehicles", category: "Vehicles" },
  { id: "vehicles-create", method: "POST", path: "/api/vehicles", description: "Add a new vehicle", category: "Vehicles", requestBody: { userId: "string?", transporterId: "string?", type: "string", plateNumber: "string", model: "string", capacity: "string" } },
  
  // Transporters
  { id: "transporters-list", method: "GET", path: "/api/transporters", description: "List all transporters", category: "Transporters", queryParams: ["status"] },
  { id: "transporters-create", method: "POST", path: "/api/transporters", description: "Register a new transporter", category: "Transporters", requestBody: { companyName: "string", ownerName: "string", contact: "string", email: "string", location: "string", baseCity: "string?" } },
  { id: "transporters-status", method: "PATCH", path: "/api/transporters/:id/status", description: "Update transporter status", category: "Transporters", requestBody: { status: "active|pending_approval|suspended" } },
  
  // Users
  { id: "users-list", method: "GET", path: "/api/users", description: "List all users", category: "Users", queryParams: ["transporterId", "role"] },
  { id: "customers-list", method: "GET", path: "/api/customers", description: "List all customers", category: "Users" },
  { id: "drivers-list", method: "GET", path: "/api/drivers", description: "List all drivers", category: "Users" },
  { id: "users-online", method: "PATCH", path: "/api/users/:id/online-status", description: "Update user online status", category: "Users", requestBody: { isOnline: "boolean" } },
  
  // Documents
  { id: "docs-list", method: "GET", path: "/api/documents", description: "List documents", category: "Documents", queryParams: ["userId", "vehicleId", "transporterId"] },
  { id: "docs-create", method: "POST", path: "/api/documents", description: "Upload a document", category: "Documents", requestBody: { userId: "string?", vehicleId: "string?", transporterId: "string?", entityType: "driver|vehicle|transporter", type: "license|aadhar|pan|insurance|fitness|registration|rc|permit|pollution", documentName: "string", url: "string", expiryDate: "string?" } },
  { id: "docs-status", method: "PATCH", path: "/api/documents/:id/status", description: "Update document status", category: "Documents", requestBody: { status: "verified|pending|expired|rejected" } },
  
  // Health
  { id: "health", method: "GET", path: "/api/health", description: "API health check", category: "System" },
];

const BASE_URLS = {
  dev: "https://dev.waykel.com",
  prod: "https://admin.waykel.com",
};

export default function ApiExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [environment, setEnvironment] = useState<"dev" | "prod">("dev");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const categories = ["all", ...Array.from(new Set(API_CATALOG.map(e => e.category)))];

  const filteredEndpoints = API_CATALOG.filter(endpoint => {
    const matchesSearch = endpoint.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         endpoint.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || endpoint.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getMethodColor = (method: HttpMethod) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-800 border-green-200";
      case "POST": return "bg-blue-100 text-blue-800 border-blue-200";
      case "PATCH": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DELETE": return "bg-red-100 text-red-800 border-red-200";
    }
  };

  const generateCurl = (endpoint: ApiEndpoint, baseUrl: string) => {
    let curl = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`;
    curl += ` \\\n  -H "Content-Type: application/json"`;
    curl += ` \\\n  -H "Cookie: connect.sid=YOUR_SESSION_ID"`;
    
    if (endpoint.requestBody) {
      const sampleBody = Object.fromEntries(
        Object.entries(endpoint.requestBody).map(([key, type]) => {
          if (type === "string") return [key, `example_${key}`];
          if (type === "string?") return [key, `example_${key}`];
          if (type === "boolean") return [key, true];
          if (type.includes("|")) return [key, type.split("|")[0]];
          return [key, type];
        })
      );
      curl += ` \\\n  -d '${JSON.stringify(sampleBody, null, 2)}'`;
    }
    
    return curl;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportCurlCollection = () => {
    const baseUrl = BASE_URLS[environment];
    let collection = `# Waykel API CURL Collection\n`;
    collection += `# Environment: ${environment === "dev" ? "Development" : "Production"}\n`;
    collection += `# Base URL: ${baseUrl}\n`;
    collection += `# Generated: ${new Date().toISOString()}\n\n`;

    const groupedEndpoints = API_CATALOG.reduce((acc, endpoint) => {
      if (!acc[endpoint.category]) acc[endpoint.category] = [];
      acc[endpoint.category].push(endpoint);
      return acc;
    }, {} as Record<string, ApiEndpoint[]>);

    Object.entries(groupedEndpoints).forEach(([category, endpoints]) => {
      collection += `\n## ${category}\n`;
      collection += `${"=".repeat(50)}\n\n`;
      endpoints.forEach(endpoint => {
        collection += `### ${endpoint.description}\n`;
        collection += `${generateCurl(endpoint, baseUrl)}\n\n`;
      });
    });

    const blob = new Blob([collection], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `waykel-api-curl-collection-${environment}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CURL collection exported", description: `Saved as waykel-api-curl-collection-${environment}.md` });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">API Explorer</h1>
          <p className="text-muted-foreground">View and test all available API endpoints</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={environment} onValueChange={(v: "dev" | "prod") => setEnvironment(v)}>
            <SelectTrigger className="w-[200px]" data-testid="env-selector">
              <Globe className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dev">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  Development (dev.waykel.com)
                </div>
              </SelectItem>
              <SelectItem value="prod">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Production (admin.waykel.com)
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCurlCollection} data-testid="export-curl">
            <Download className="w-4 h-4 mr-2" />
            Export CURL Collection
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Current Base URL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <code className="bg-muted px-3 py-2 rounded text-sm block" data-testid="base-url">
            {BASE_URLS[environment]}
          </code>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-endpoints"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === "all" ? "All Categories" : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {filteredEndpoints.map((endpoint) => (
          <Sheet key={endpoint.id}>
            <SheetTrigger asChild>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" data-testid={`endpoint-${endpoint.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Badge className={`${getMethodColor(endpoint.method)} font-mono min-w-[60px] justify-center`}>
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono flex-1">{endpoint.path}</code>
                    <Badge variant="outline">{endpoint.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 ml-[76px]">{endpoint.description}</p>
                </CardContent>
              </Card>
            </SheetTrigger>
            <SheetContent className="w-[600px] sm:max-w-[600px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <Badge className={`${getMethodColor(endpoint.method)} font-mono`}>
                    {endpoint.method}
                  </Badge>
                  <code className="text-lg">{endpoint.path}</code>
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-120px)] mt-6">
                <div className="space-y-6 pr-4">
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-muted-foreground">{endpoint.description}</p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-semibold mb-2">Full URL</h3>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-3 py-2 rounded text-sm flex-1 block">
                        {BASE_URLS[environment]}{endpoint.path}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(`${BASE_URLS[environment]}${endpoint.path}`, `url-${endpoint.id}`)}
                      >
                        {copiedId === `url-${endpoint.id}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {endpoint.queryParams && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2">Query Parameters</h3>
                        <div className="space-y-2">
                          {endpoint.queryParams.map(param => (
                            <div key={param} className="flex items-center gap-2">
                              <code className="bg-muted px-2 py-1 rounded text-sm">{param}</code>
                              <span className="text-sm text-muted-foreground">string (optional)</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {endpoint.requestBody && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-semibold mb-2">Request Body</h3>
                        <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                          {JSON.stringify(endpoint.requestBody, null, 2)}
                        </pre>
                      </div>
                    </>
                  )}

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold flex items-center gap-2">
                        <Code className="w-4 h-4" />
                        CURL Command
                      </h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(generateCurl(endpoint, BASE_URLS[environment]), `curl-${endpoint.id}`)}
                      >
                        {copiedId === `curl-${endpoint.id}` ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                        Copy CURL
                      </Button>
                    </div>
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                      {generateCurl(endpoint, BASE_URLS[environment])}
                    </pre>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        ))}
      </div>

      {filteredEndpoints.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Code className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No endpoints found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
