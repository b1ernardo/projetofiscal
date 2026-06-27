import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSellers } from "@/hooks/useSellers";
import { toast } from "sonner";

interface ComandaFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated?: (id: string) => void;
    initialData?: any;
}

export function ComandaFormDialog({
    open,
    onOpenChange,
    onCreated,
    initialData = null
}: ComandaFormDialogProps) {
    const queryClient = useQueryClient();
    const [tableNumber, setTableNumber] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerId, setCustomerId] = useState("");
    const [sellerId, setSellerId] = useState("");
    const [observation, setObservation] = useState("");

    const { data: customers = [] } = useQuery({
        queryKey: ["customers"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
            });
            return response.json();
        },
    });

    const { data: sellers = [] } = useSellers();

    const mutation = useMutation({
        mutationFn: async (data: any) => {
            const url = initialData
                ? `${import.meta.env.VITE_API_URL}/comandas/${initialData.id}`
                : `${import.meta.env.VITE_API_URL}/comandas`;
            const response = await fetch(url, {
                method: initialData ? "PUT" : "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.message || "Erro ao salvar comanda");
            }
            return response.json();
        },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: ["comandas"] });
            toast.success(initialData ? "Comanda atualizada!" : "Comanda aberta!");
            onOpenChange(false);
            if (!initialData && onCreated) onCreated(res.id);
        },
        onError: (err: any) => {
            toast.error(err.message || "Erro ao salvar comanda");
        },
    });

    useEffect(() => {
        if (open) {
            setTableNumber(initialData?.table_number ?? "");
            setCustomerName(initialData?.customer_name ?? "");
            setCustomerId(initialData?.customer_id ?? "");
            setSellerId(initialData?.seller_id ?? "");
            setObservation(initialData?.observation ?? "");
        }
    }, [open, initialData]);

    const handleSubmit = () => {
        if (!tableNumber.trim()) {
            toast.error("Informe o número da mesa.");
            return;
        }
        const requireSeller = localStorage.getItem("pdv_require_seller") === "true";
        if (requireSeller && (!sellerId || sellerId === "none")) {
            toast.error("Por favor, selecione um vendedor para abrir a comanda.");
            return;
        }
        mutation.mutate({
            table_number: tableNumber,
            customer_name: customerName || (customers.find((c: any) => c.id === customerId)?.name),
            customer_id: (customerId === "none" || customerId === "") ? null : customerId,
            seller_id: (sellerId === "none" || sellerId === "") ? null : sellerId,
            observation: observation.trim() || null,
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Comanda" : "Abrir Nova Comanda"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Mesa / Número</Label>
                        <Input
                            placeholder="Ex: Mesa 05"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label>Cliente (Opcional)</Label>
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
                        {(!customerId || customerId === "none") && (
                            <Input
                                placeholder="Nome do cliente avulso"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        )}
                    </div>
                    <div className="grid gap-2">
                        <Label>Vendedor (Opcional)</Label>
                        <Select value={sellerId} onValueChange={setSellerId}>
                            <SelectTrigger>
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
                    <div className="grid gap-2">
                        <Label>Observação (Opcional)</Label>
                        <Textarea
                            placeholder="Ex: Sem cebola, mesa perto da janela..."
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            maxLength={300}
                            rows={2}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={mutation.isPending}>
                        {mutation.isPending ? "Salvando..." : initialData ? "Salvar Alterações" : "Abrir Comanda"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
