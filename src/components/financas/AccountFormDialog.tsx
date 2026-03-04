import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";

interface AccountFormData {
    description: string;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid';
    supplier_id?: string;
    customer_id?: string;
    category: string;
    payment_date?: string;
}

interface AccountFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: AccountFormData) => void;
    type: 'payable' | 'receivable';
    title: string;
}

export function AccountFormDialog({ open, onOpenChange, onSave, type, title }: AccountFormDialogProps) {
    const [form, setForm] = useState<AccountFormData>({
        description: "",
        amount: 0,
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        category: 'Geral'
    });

    const { data: suppliers = [] } = useQuery({
        queryKey: ["suppliers"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/suppliers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        },
        enabled: type === 'payable'
    });

    const { data: customers = [] } = useQuery({
        queryKey: ["customers"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        },
        enabled: type === 'receivable'
    });

    const { data: chartItems = [] } = useQuery({
        queryKey: ["chart-of-accounts"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/chart-of-accounts`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        },
    });

    const filteredChart = chartItems.filter((i: any) => i.type === (type === 'payable' ? 'expense' : 'revenue'));

    useEffect(() => {
        if (open) {
            setForm({
                description: "",
                amount: 0,
                due_date: new Date().toISOString().split('T')[0],
                status: 'pending',
                category: 'Geral'
            });
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...form,
            payment_date: form.status === 'paid' ? form.due_date : undefined
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição *</Label>
                        <Input
                            id="description"
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            placeholder="Ex: Aluguel, Compra de mercadoria..."
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor *</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={form.amount || ""}
                                onChange={e => setForm({ ...form, amount: Number(e.target.value) })}
                                placeholder="0,00"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_date">Vencimento *</Label>
                            <Input
                                id="due_date"
                                type="date"
                                value={form.due_date}
                                onChange={e => setForm({ ...form, due_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{type === 'payable' ? 'Fornecedor' : 'Cliente'}</Label>
                        <Select
                            value={type === 'payable' ? form.supplier_id : form.customer_id}
                            onValueChange={v => setForm(type === 'payable' ? { ...form, supplier_id: v } : { ...form, customer_id: v })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {type === 'payable'
                                    ? suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                                    : customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                                }
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Plano de Contas (Categoria) *</Label>
                        <Select
                            value={form.category}
                            onValueChange={v => setForm({ ...form, category: v })}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria..." />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredChart.map((item: any) => (
                                    <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Checkbox
                            id="status"
                            checked={form.status === 'paid'}
                            onCheckedChange={checked => setForm({ ...form, status: checked ? 'paid' : 'pending' })}
                        />
                        <Label htmlFor="status" className="cursor-pointer">
                            {type === 'payable' ? 'Marcar como PAGO agora' : 'Confirmar RECEBIMENTO agora'}
                        </Label>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit">Salvar Lançamento</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
