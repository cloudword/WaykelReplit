import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft, MapPin, Truck, Calendar, Clock,
    Package, IndianRupee, ShieldCheck, Gavel,
    ExternalLink, Map, Phone, User
} from "lucide-react";
import { waykelApi, WaykelRide, WaykelBid } from "../lib/waykelApi";
import { formatWeight } from "../lib/weightUtils";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "../components/DashboardLayout";

const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case "in_transit":
        case "active":
            return "bg-blue-500/10 text-blue-600";
        case "confirmed":
        case "accepted":
            return "bg-green-500/10 text-green-600 border-green-200";
        case "pending":
        case "open":
        case "bidding":
            return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
        case "delivered":
        case "completed":
            return "bg-gray-500/10 text-gray-600";
        default:
            return "bg-muted text-muted-foreground";
    }
};

export default function TripDetails() {
    const [, params] = useRoute("/customer/dashboard/trip/:id");
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const id = params?.id;

    const { data: ride, isLoading: rideLoading } = useQuery<WaykelRide>({
        queryKey: ["customer-ride", id],
        queryFn: async () => {
            const rides = await waykelApi.rides.getMyRides();
            const match = rides.find(r => r.id === id);
            if (!match) throw new Error("Trip not found");
            return match;
        },
        enabled: !!id,
    });

    const { data: bids = [], isLoading: bidsLoading } = useQuery<WaykelBid[]>({
        queryKey: ["customer-bids", id],
        queryFn: () => (id ? waykelApi.bids.getBidsForRide(id) : Promise.resolve([])),
        enabled: !!id && ["pending", "open", "bidding"].includes(ride?.status.toLowerCase() || ""),
    });

    const acceptBidMutation = useMutation({
        mutationFn: (bidId: string) => waykelApi.bids.acceptBid(bidId),
        onSuccess: () => {
            toast({ title: "Bid Accepted!" });
            queryClient.invalidateQueries({ queryKey: ["customer-ride", id] });
        },
    });

    if (rideLoading) {
        return (
            <DashboardLayout currentPage="/customer/dashboard">
                <div className="space-y-6">
                    <Skeleton className="h-8 w-48" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Skeleton className="h-64" />
                            <Skeleton className="h-48" />
                        </div>
                        <Skeleton className="h-96" />
                    </div>
                </div>
            </DashboardLayout>
        );
    }

    if (!ride) return null;

    return (
        <DashboardLayout currentPage="/customer/dashboard">
            <div className="space-y-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setLocation("/customer/dashboard/active")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold font-mono tracking-tight text-primary">
                                    {ride.entityId || ride.id.slice(0, 6)}
                                </h1>
                                <Badge variant="outline" className={`${getStatusColor(ride.status)} uppercase font-bold text-[10px] px-2`}>
                                    {ride.status.replace("_", " ")}
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">Created on {ride.createdAt ? new Date(ride.createdAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {["active", "in_transit"].includes(ride.status.toLowerCase()) && (
                            <Button className="gap-2 shadow-lg shadow-primary/20">
                                <MapPin className="w-4 h-4" /> Track Live
                            </Button>
                        )}
                        <Button variant="outline" className="gap-2">
                            <ExternalLink className="w-4 h-4" /> Share Trip
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Route Card */}
                        <Card className="border-card-border overflow-hidden">
                            <CardHeader className="bg-muted/30 border-b py-4">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Map className="w-4 h-4 text-primary" /> Trip Route
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-8 relative">
                                    <div className="absolute left-[7px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-emerald-500 rounded-full opacity-30" />

                                    <div className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-100 shrink-0 mt-1" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-blue-600 uppercase tracking-tight">Origin (Pickup)</p>
                                            <p className="text-lg font-bold leading-tight">{ride.pickupLocation}</p>
                                            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                                                <span className="text-xs flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded">
                                                    <Calendar className="w-3 h-3" /> {ride.date}
                                                </span>
                                                <span className="text-xs flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded">
                                                    <Clock className="w-3 h-3" /> {ride.pickupTime}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-4 relative">
                                        <div className="w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-100 shrink-0 mt-1" />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-tight">Destination (Drop)</p>
                                            <p className="text-lg font-bold leading-tight">{ride.dropLocation}</p>
                                            <div className="flex items-center gap-3 mt-2 text-muted-foreground">
                                                <span className="text-xs flex items-center gap-1 font-medium bg-muted px-2 py-0.5 rounded">
                                                    <Clock className="w-3 h-3" /> TBD
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Load Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-card-border">
                                <CardHeader className="py-4 border-b bg-muted/20">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                        <Package className="w-4 h-4" /> Cargo Details
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Cargo Type</p>
                                            <p className="font-bold text-sm">{ride.cargoType}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Weight</p>
                                            <p className="font-bold text-sm">{formatWeight(ride.weight).display}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-card-border">
                                <CardHeader className="py-4 border-b bg-muted/20">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                        <IndianRupee className="w-4 h-4" /> Trip Economics
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter text-left">Estimated Cost</p>
                                            <p className="text-2xl font-black text-primary">₹{ride.price.toLocaleString()}</p>
                                        </div>
                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold">
                                            Fixed Price
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Bids Section if applicable */}
                        {["pending", "open", "bidding"].includes(ride.status.toLowerCase()) && (
                            <Card className="border-card-border">
                                <CardHeader className="py-4 border-b bg-muted/20 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                            <Gavel className="w-4 h-4" /> Marketplace Bids
                                        </CardTitle>
                                        <CardDescription className="text-xs">Select a bid to confirm your booking</CardDescription>
                                    </div>
                                    <Badge className="font-bold">{bids.length} Active</Badge>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {bidsLoading ? (
                                        <div className="p-4 space-y-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
                                    ) : bids.length === 0 ? (
                                        <div className="p-12 text-center text-muted-foreground">
                                            <Gavel className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                            <p className="font-medium">Waiting for transporters to bid</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {bids.map(bid => (
                                                <div key={bid.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/10 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="w-10 h-10 rounded-lg">
                                                            <AvatarFallback className="bg-primary/5 text-primary text-sm font-bold">{bid.transporter?.name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-bold text-sm tracking-tight">{bid.transporter?.name}</p>
                                                                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1 rounded">{bid.transporter?.transporterId}</span>
                                                                {bid.transporter?.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-xs font-bold text-amber-500">★ {bid.transporter?.rating || '4.5'}</span>
                                                                <span className="text-muted-foreground/30">•</span>
                                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase">{bid.vehicle?.model || 'Tata Ace'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4 shrink-0">
                                                        <div className="text-right">
                                                            <p className="text-lg font-black tracking-tight">₹{Number(bid.amount).toLocaleString()}</p>
                                                            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter italic">Recommended</p>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="font-bold px-6"
                                                            onClick={() => acceptBidMutation.mutate(bid.id)}
                                                            disabled={acceptBidMutation.isPending}
                                                        >
                                                            Accept
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Team Assigned Card */}
                        <Card className="border-card-border overflow-hidden ring-1 ring-primary/10">
                            <CardHeader className="py-4 border-b bg-primary/5">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary" /> Delivery Team
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {ride.transporter || ride.driver || ride.vehicle ? (
                                    <>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                                                <Avatar className="w-10 h-10 rounded-lg border-2 border-white shadow-sm">
                                                    <AvatarFallback className="bg-blue-500 text-white font-bold">{ride.transporter?.name?.[0] || 'T'}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Transporter</p>
                                                    <p className="text-sm font-bold truncate leading-tight">{ride.transporter?.name || "Waykel Direct"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center border-2 border-white shadow-sm">
                                                    <User className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Assigned Driver</p>
                                                    <p className="text-sm font-bold truncate leading-tight">{ride.driver?.name || "TBD"}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
                                                <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center border-2 border-white shadow-sm">
                                                    <Truck className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-tighter">Vehicle</p>
                                                    <p className="text-sm font-bold truncate leading-tight">{ride.vehicle?.vehicleNumber || "TBD"}</p>
                                                    <p className="text-[10px] text-muted-foreground font-medium uppercase">{ride.vehicle?.vehicleType || "-"} • {ride.vehicle?.rcStatus || "Pending Verif."}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-12 text-center text-muted-foreground">
                                        <Truck className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        <p className="text-sm font-medium">Bidding in progress...</p>
                                        <p className="text-xs mt-1">Accept a bid to assign a team</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Support/Need Help Card */}
                        <Card className="border-card-border bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl">
                            <CardContent className="p-6 space-y-4">
                                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                                    <Phone className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Need assistance?</h3>
                                    <p className="text-slate-400 text-sm mt-1">Our customer support team is available 24/7 for this trip.</p>
                                </div>
                                <Button className="w-full bg-white text-slate-900 hover:bg-white/90 font-bold transition-transform active:scale-95">
                                    Call Support
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
