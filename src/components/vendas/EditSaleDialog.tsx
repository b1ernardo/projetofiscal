import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSaleDetail, useUpdateSale } from "@/hooks/useSales";
import { Loader2, Trash2, Save, AlertTriangle } from "lucide-react";

const currency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleId: string | null;
    onSuccess?: () => void;
}

export function EditSaleDialog({ open, onOpenChange, saleId, onSuccess }: Props) {
    const { data: sale, isLoading } = useSaleDetail(saleId);
    const updateSale = useUpdateSale();

    const [items, setItems] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    useEffect(() => {
        if (sale && open) {
            setItems(sale.items.map(i => ({
                id: i.product_id,
                product_name: i.product_name,
                quantity: i.quantity,
                price: i.unit_price
            })));
            setPayments(sale.payments.map(p => ({
                methodName: p.method_name,
                amount: p.amount
            })));
        }
    }, [sale, open]);

    const total = items.reduce((s, i) => s + i.quantity * i.price, 0);
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const difference = total - totalPaid;

    const handleUpdate = () => {
        if (!saleId) return;
        if (Math.abs(difference) > 0.01) {
            alert("O total dos pagamentos deve ser igual ao total da venda.");
            return;
        }
        updateSale.mutate({
            id: saleId,
            data: {
                items,
                payments,
                total
            }
        }, {
            onSuccess: () => {
                onOpenChange(false);
                if (onSuccess) onSuccess();
            }
        });
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

    const updateQty = (id: string, qty: string) => {
        const n = parseFloat(qty) || 0;
        setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: n } : i));
    };

    const updatePayment = (index: number, amount: string) => {
        const n = parseFloat(amount) || 0;
        setPayments(prev => {
            const next = [...prev];
            next[index].amount = n;
            return next;
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Venda #{sale?.sale_number}</DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        {sale?.fiscal_status === 'generated' && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-3 text-amber-800 text-sm">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p>
                                    <strong>Aviso:</strong> Esta venda possui uma nota fiscal emitida.
                                    Alterar itens ou valores pode causar inconsistência com a SEFAZ.
                                    O ideal é cancelar a nota antes de editar.
                                </p>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase text-muted-foreground">Itens da Venda</h3>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="w-[120px]">Quantidade</TableHead>
                                            <TableHead className="text-right">Unitário</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQty(item.id, e.target.value)}
                                                        className="h-8"
                                                        step="0.01"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right">{currency(item.price)}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {currency(item.quantity * item.price)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive h-8 w-8">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase text-muted-foreground">Pagamentos</h3>
                                <div className="space-y-2">
                                    {payments.map((p, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <span className="flex-1 text-sm font-medium">{p.methodName}</span>
                                            <Input
                                                type="number"
                                                value={p.amount}
                                                onChange={(e) => updatePayment(idx, e.target.value)}
                                                className="w-32 h-9 text-right font-mono"
                                                step="0.01"
                                            />
                                        </div>
                                    ))}
                                    <div className={`mt-2 p-2 rounded text-xs font-bold text-center ${Math.abs(difference) < 0.01 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {Math.abs(difference) < 0.01 ? 'PAGAMENTO CONFERE' : `DIFERENÇA: ${currency(difference)}`}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 rounded-xl bg-muted/30 border space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground font-bold uppercase">Novo Total</span>
                                    <span className="text-3xl font-black text-primary tracking-tighter">{currency(total)}</span>
                                </div>
                                <Button
                                    className="w-full h-12 text-lg font-bold gap-2"
                                    onClick={handleUpdate}
                                    disabled={updateSale.isPending || Math.abs(difference) > 0.01}
                                >
                                    {updateSale.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
