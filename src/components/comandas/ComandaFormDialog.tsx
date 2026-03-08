import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useSellers } from "@/hooks/useSellers";
import { toast } from "sonner";

interface ComandaFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export function ComandaFormDialog({
    open,
    onOpenChange,
    onSave,
    initialData = null
}: ComandaFormDialogProps) {
    const [tableNumber, setTableNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerId, setCustomerId] = useState("");
    const [sellerId, setSellerId] = useState("");

    const { data: customers = [] } = useQuery({
        queryKey: ["customers"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        }
    });

    const { data: sellers = [] } = useSellers();

    useEffect(() => {
        if (open) {
            setTableNumber(initialData?.table_number ?? "");
            setCustomerName(initialData?.customer_name ?? "");
            setCustomerId(initialData?.customer_id ?? "");
            setSellerId(initialData?.seller_id ?? "");
        }
    }, [open, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const requireSeller = localStorage.getItem("pdv_require_seller") === "true";
        if (requireSeller && (!sellerId || sellerId === "none")) {
            toast.error("Por favor, selecione um vendedor para abrir a comanda.");
            return;
        }

        onSave({
            table_number: tableNumber,
            customer_name: customerName || (customers.find((c: any) => c.id === customerId)?.name),
            customer_id: customerId,
            seller_id: sellerId === "none" ? null : sellerId
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{initialData ? "Editar Comanda" : "Abrir Nova Comanda"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="table">Mesa / Número</Label>
                            <Input
                                id="table"
                                placeholder="Ex: Mesa 05"
                                value={tableNumber}
                                onChange={(e) => setTableNumber(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="customer">Cliente (Opcional)</Label>
                            <Select value={customerId} onValueChange={setCustomerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {customers.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {!customerId || customerId === "none" ? (
                                <Input
                                    placeholder="Nome do cliente avulso"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            ) : null}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="seller">Vendedor (Opcional)</Label>
                            <Select value={sellerId} onValueChange={setSellerId}>
                                <SelectTrigger id="seller">
                                    <SelectValue placeholder="Selecione um vendedor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum</SelectItem>
                                    {sellers.filter((s: any) => s.active).map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {initialData ? "Salvar Alterações" : "Abrir Comanda"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
