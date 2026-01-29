import { DashboardLayout } from "../components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Phone, Mail, FileText, ChevronRight } from "lucide-react";

export default function Help() {
    const supportCategories = [
        { title: "Booking Issues", icon: MessageSquare, description: "Problem with new or existing shipments" },
        { title: "Payment & Invoices", icon: FileText, description: "Billing queries and tax invoices" },
        { title: "Account & Security", icon: FileText, description: "Manage profile or login issues" },
    ];

    return (
        <DashboardLayout currentPage="/customer/dashboard/help">
            <div className="space-y-8 max-w-4xl">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Help & Support</h1>
                    <p className="text-muted-foreground text-sm">How can we help you with your logistics today?</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="grid gap-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Quick Support</p>
                            {supportCategories.map((cat, idx) => (
                                <Card key={idx} className="group cursor-pointer hover:border-primary/30 transition-all border-card-border overflow-hidden">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                            <cat.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-sm">{cat.title}</h3>
                                            <p className="text-[10px] text-muted-foreground font-medium">{cat.description}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 mb-1">Contact Waykel Team</p>
                            <Card className="border-primary/20 bg-primary/[0.02]">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                                            <Phone className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-black tracking-tight text-primary">Call Support</h4>
                                            <p className="text-xs font-bold text-foreground">+91-1800-WAYKEL-LOGI</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-primary/10 w-full" />
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <Mail className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-black tracking-tight text-blue-500">Email Us</h4>
                                            <p className="text-xs font-bold text-foreground">support@waykel.com</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Button className="w-full h-12 font-bold shadow-lg shadow-primary/10" variant="outline">
                                Visit Knowledge Base
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
