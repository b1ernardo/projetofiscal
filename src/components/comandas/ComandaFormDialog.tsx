import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

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

    const { data: customers = [] } = useQuery({
        queryKey: ["customers"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        }
    });

    useEffect(() => {
        if (open) {
            setTableNumber(initialData?.table_number ?? "");
            setCustomerName(initialData?.customer_name ?? "");
            setCustomerId(initialData?.customer_id ?? "");
        }
    }, [open, initialData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            table_number: tableNumber,
            customer_name: customerName || (customers.find((c: any) => c.id === customerId)?.name),
            customer_id: customerId
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
