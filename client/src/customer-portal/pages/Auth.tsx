import { useState } from "react";
import { PhoneLoginModal } from "../components/PhoneLoginModal";
import { Truck, ShieldCheck, Zap, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Auth() {
    const [showModal, setShowModal] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="mb-12 text-center max-w-md mx-auto">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/30">
                        <Truck className="h-7 w-7 fill-current" />
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter">
                        WAY<span className="text-primary">KEL</span>
                    </h1>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">India's Premium Trucking Marketplace</h2>
                <p className="text-muted-foreground font-medium mb-8">
                    Join thousands of businesses who trust Waykel for their commercial logistics needs.
                </p>

                <div className="grid grid-cols-1 gap-4 text-left mb-8">
                    <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-border/50">
                        <div className="mt-1 w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Verified Transporters</p>
                            <p className="text-xs text-muted-foreground">All vehicles and drivers are strictly vetted for safety.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-border/50">
                        <div className="mt-1 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <Gavel className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Competitive Bidding</p>
                            <p className="text-xs text-muted-foreground">Get multiple quotes and choose the best price for your route.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 bg-white rounded-xl shadow-sm border border-border/50">
                        <div className="mt-1 w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                            <Zap className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-sm">Instant Booking</p>
                            <p className="text-xs text-muted-foreground">Book trucks in minutes with our streamlined checkout process.</p>
                        </div>
                    </div>
                </div>

                <Button
                    className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all"
                    onClick={() => setShowModal(true)}
                    data-testid="button-get-started"
                >
                    Sign In to Portal
                </Button>
            </div>

            <PhoneLoginModal open={showModal} onOpenChange={setShowModal} />

            <p className="mt-8 text-xs text-muted-foreground font-medium uppercase tracking-widest">
                Reliable • Secure • PAN India
            </p>
        </div>
    );
}
