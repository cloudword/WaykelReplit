import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { waykelApi, SavedAddress, CreateAddressData } from "../lib/waykelApi";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AddressFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    address?: SavedAddress | null;
}

export function AddressForm({ open, onOpenChange, address }: AddressFormProps) {
    const { toast } = useToast();
    const [formData, setFormData] = useState<CreateAddressData>({
        label: "",
        street: "",
        city: "",
        state: "",
        postalCode: "",
        landmark: "",
        isDefault: false,
        addressType: "warehouse",
    });

    useEffect(() => {
        if (address) {
            setFormData({
                label: address.label,
                street: address.street,
                city: address.city,
                state: address.state,
                postalCode: address.postalCode,
                landmark: address.landmark || "",
                isDefault: address.isDefault,
                addressType: address.addressType,
            });
        } else {
            setFormData({
                label: "",
                street: "",
                city: "",
                state: "",
                postalCode: "",
                landmark: "",
                isDefault: false,
                addressType: "warehouse",
            });
        }
    }, [address, open]);

    const mutation = useMutation({
        mutationFn: (data: CreateAddressData) => {
            if (address) {
                return waykelApi.addresses.updateAddress(address.id, data);
            }
            return waykelApi.addresses.createAddress(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["customer-addresses"] });
            toast({ title: address ? "Address updated" : "Address added" });
            onOpenChange(false);
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{address ? "Edit Address" : "Add New Address"}</DialogTitle>
                        <DialogDescription>
                            Save details about your loading or unloading points.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="label" className="text-right text-xs font-bold uppercase tracking-tight text-muted-foreground">Label</Label>
                            <Input
                                id="label"
                                placeholder="e.g. Main Warehouse"
                                className="col-span-3 h-10 font-medium"
                                value={formData.label}
                                onChange={e => setFormData({ ...formData, label: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right text-xs font-bold uppercase tracking-tight text-muted-foreground">Type</Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.addressType}
                                    onValueChange={v => setFormData({ ...formData, addressType: v })}
                                >
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="warehouse">Warehouse</SelectItem>
                                        <SelectItem value="office">Office</SelectItem>
                                        <SelectItem value="factory">Factory</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="street" className="text-right text-xs font-bold uppercase tracking-tight text-muted-foreground mt-2">Street</Label>
                            <Input
                                id="street"
                                placeholder="Full address details"
                                className="col-span-3 h-10 font-medium"
                                value={formData.street}
                                onChange={e => setFormData({ ...formData, street: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="landmark" className="text-right text-xs font-bold uppercase tracking-tight text-muted-foreground">Landmark</Label>
                            <Input
                                id="landmark"
                                placeholder="Near Metro Station"
                                className="col-span-3 h-10 font-medium"
                                value={formData.landmark}
                                onChange={e => setFormData({ ...formData, landmark: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4 ml-[100px]">
                            <div className="space-y-1">
                                <Label htmlFor="city" className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">City</Label>
                                <Input
                                    id="city"
                                    placeholder="Mumbai"
                                    className="h-10 font-medium"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="state" className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">State</Label>
                                <Input
                                    id="state"
                                    placeholder="Maharashtra"
                                    className="h-10 font-medium"
                                    value={formData.state}
                                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="postalCode" className="text-right text-xs font-bold uppercase tracking-tight text-muted-foreground">Pincode</Label>
                            <Input
                                id="postalCode"
                                placeholder="400001"
                                maxLength={6}
                                className="col-span-1 h-10 font-medium"
                                value={formData.postalCode}
                                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex items-center space-x-2 ml-[100px] mt-2">
                            <Checkbox
                                id="isDefault"
                                checked={formData.isDefault}
                                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: !!checked })}
                            />
                            <label htmlFor="isDefault" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">Set as primary address</label>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-6 font-bold">Cancel</Button>
                        <Button type="submit" disabled={mutation.isPending} className="h-11 px-8 font-bold min-w-[120px]">
                            {mutation.isPending ? "Saving..." : address ? "Update Address" : "Save Address"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
