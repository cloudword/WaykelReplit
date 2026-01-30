import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MapPin, Search } from "lucide-react";
import { getApiUrl } from "../lib/waykelApi";

interface TrackingResult {
  id: string;
  status: string;
  pickupLocation: string;
  dropLocation: string;
  currentLocation?: string;
  eta?: string;
}

export function TrackingView() {
  const [searchId, setSearchId] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(getApiUrl(`/track/${searchId}`), { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      const data = await response.json();
      setResult(data as TrackingResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not fetch tracking info");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-card-border">
      <CardHeader>
        <CardTitle className="text-lg">Track Shipment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input
            placeholder="Enter Trip ID or Tracking ID"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            data-testid="input-track"
          />
          <Button onClick={handleSearch} disabled={loading} className="shrink-0" data-testid="button-track">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            <span className="ml-2">Track</span>
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/60">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold text-lg">{result.status}</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {result.pickupLocation}
                </p>
              </div>
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground">Drop</p>
                <p className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {result.dropLocation}
                </p>
              </div>
            </div>
            {result.currentLocation && (
              <div className="p-3 rounded-lg border">
                <p className="text-xs text-muted-foreground">Current Location</p>
                <p className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {result.currentLocation}
                </p>
              </div>
            )}
            {result.eta && (
              <div className="text-sm text-muted-foreground">ETA: {result.eta}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
