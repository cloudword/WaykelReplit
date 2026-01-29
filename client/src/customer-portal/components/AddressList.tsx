import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, MapPin, Trash2, Edit2, Star } from "lucide-react";
import { waykelApi, SavedAddress } from "../lib/waykelApi";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AddressForm } from "./AddressForm";

export function AddressList() {
    const { toast } = useToast();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

    const { data: addresses = [], isLoading } = useQuery({
        queryKey: ["customer-addresses"],
        queryFn: () => waykelApi.addresses.getSavedAddresses(),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => waykelApi.addresses.deleteAddress(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
            toast({ title: "Address deleted successfully" });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleEdit = (address: SavedAddress) => {
        setEditingAddress(address);
        setIsFormOpen(true);
    };

    const handleAddNew = () => {
        setEditingAddress(null);
        setIsFormOpen(true);
    };

    if (isLoading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-40 rounded-xl" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <Button onClick={handleAddNew} className="gap-2 shadow-lg shadow-primary/20 font-bold h-11 px-6">
                    <Plus className="w-4 h-4" />
                    Add New Address
                </Button>
            </div>

            {addresses.length === 0 ? (
                <Card className="border-dashed border-2 py-12">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <MapPin className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="font-bold text-lg">No addresses saved yet</p>
                            <p className="text-muted-foreground text-sm max-w-[250px]">Save your warehouse or office locations for quick selection during booking</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {addresses.map(address => (
                        <Card key={address.id} className="group border-card-border overflow-hidden hover:shadow-md transition-all">
                            <CardContent className="p-0">
                                <div className="p-5 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-primary" />
                                            </div>
                                            <h3 className="font-bold text-sm truncate">{address.label}</h3>
                                        </div>
                                        {address.isDefault && (
                                            <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-bold py-0.5">
                                                DEFAULT
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs text-foreground font-medium line-clamp-2">{address.street}</p>
                                        {address.landmark && (
                                            <p className="text-[10px] text-muted-foreground">Landmark: {address.landmark}</p>
                                        )}
                                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                                            {address.city}, {address.state} - {address.postalCode}
                                        </p>
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-muted/30 border-t border-border/50 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5"
                                        onClick={() => handleEdit(address)}
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                        onClick={() => deleteMutation.mutate(address.id)}
                                        disabled={deleteMutation.isPending}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <AddressForm
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                address={editingAddress}
            />
        </div>
    );
}
