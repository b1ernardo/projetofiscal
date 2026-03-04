import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Search, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckoutDialog } from "@/components/pdv/CheckoutDialog";
import { ReceiptOptionsDialog } from "@/components/pdv/ReceiptOptionsDialog";
import { useFiscal } from "@/hooks/useFiscal";
import { printReceipt, getWhatsappUrl } from "@/utils/printReceipt";

interface ComandaDetailDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    comandaId: string;
}

export function ComandaDetailDialog({ open, onOpenChange, comandaId }) {
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState("");
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [receiptOptionsOpen, setReceiptOptionsOpen] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<any>(null);
    const emitFiscal = useFiscal();

    const { data: comanda, isLoading: isLoadingDetail } = useQuery({
        queryKey: ["comanda", comandaId],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas/${comandaId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        },
        enabled: !!comandaId && open
    });

    const { data: products = [] } = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/products`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        }
    });

    const addItemMutation = useMutation({
        mutationFn: async ({ productId, quantity, unitPrice }: any) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas/${comandaId}/items`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ product_id: productId, quantity, unit_price: unitPrice })
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comanda", comandaId] });
            queryClient.invalidateQueries({ queryKey: ["comandas"] });
            toast.success("Item adicionado");
        },
        onError: () => toast.error("Erro ao adicionar item")
    });

    const removeItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            await fetch(`${import.meta.env.VITE_API_URL}/comandas/items/${itemId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comanda", comandaId] });
            queryClient.invalidateQueries({ queryKey: ["comandas"] });
            toast.success("Item removido");
        },
        onError: () => toast.error("Erro ao remover item")
    });

    const closeComandaMutation = useMutation({
        mutationFn: async (paymentData: any) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas/${comandaId}/close`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(paymentData)
            });
            if (!response.ok) throw new Error("Erro no servidor");
            return response.json();
        },
        onSuccess: (res, paymentData) => {
            queryClient.invalidateQueries({ queryKey: ["comandas"] });
            toast.success("Comanda fechada com sucesso!");
            setLastSaleData({
                saleId: res.sale_id,
                saleNumber: res.sale_number || "COMANDA",
                cart: comanda?.items?.map((it: any) => ({
                    name: it.product_name,
                    quantity: it.quantity,
                    price: it.unit_price
                })) || [],
                total: paymentData.total,
                discount: 0,
                payments: paymentData.payments,
                date: new Date()
            });
            setReceiptOptionsOpen(true);
            setIsCheckoutOpen(false);
        },
        onError: (err: any) => toast.error("Erro ao fechar comanda: " + err.message)
    });

    const filteredProducts = products.filter((p: any) => {
        let term = searchQuery.toLowerCase();
        const starMatch = searchQuery.match(/^([\d.,]+)\s*\*\s*(.*)$/);
        if (starMatch) {
            term = starMatch[2].toLowerCase().trim();
        }

        if (!term) return false;

        return p.name.toLowerCase().includes(term) ||
            (p.code?.toLowerCase() || "").includes(term) ||
            String(p.product_code || "").includes(term);
    }).slice(0, 5);

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        const raw = e.currentTarget.value.trim();
        if (!raw) return;

        let qty = 1;
        let term = raw;
        const starMatch = raw.match(/^([\d.,]+)\s*\*\s*(.+)$/);
        if (starMatch) {
            const parsedQty = parseFloat(starMatch[1].replace(',', '.'));
            if (!isNaN(parsedQty) && parsedQty > 0) {
                qty = parsedQty;
                term = starMatch[2].trim();
            }
        }

        const exact = products.find((p: any) =>
            (p.code || '').toLowerCase() === term.toLowerCase() ||
            String(p.product_code || '') === term
        );

        const candidate = exact || (filteredProducts.length === 1 ? filteredProducts[0] : null);

        if (candidate) {
            addItemMutation.mutate({
                productId: candidate.id,
                quantity: qty,
                unitPrice: candidate.sale_price
            });
            setSearchQuery("");
            toast.success(`${qty}x ${candidate.name} adicionado!`);
        } else if (filteredProducts.length === 0 && term) {
            toast.error('Nenhum produto encontrado para este código.');
        }
    };

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    const total = comanda?.items?.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0) ?? 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>{comanda?.table_number} - {comanda?.customer_name || "Sem nome"}</span>
                        <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Buscador de Produtos */}
                    <div className="space-y-2">
                        <Label>Adicionar Item</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar produto..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                        </div>
                        {searchQuery && (
                            <div className="border rounded-md mt-1 divide-y bg-card">
                                {filteredProducts.map((p: any) => (
                                    <div
                                        key={p.id}
                                        className="p-2 flex justify-between items-center hover:bg-muted cursor-pointer"
                                        onClick={() => {
                                            let qty = 1;
                                            const starMatch = searchQuery.match(/^([\d.,]+)\s*\*\s*(.*)$/);
                                            if (starMatch) {
                                                const parsedQty = parseFloat(starMatch[1].replace(',', '.'));
                                                if (!isNaN(parsedQty) && parsedQty > 0) qty = parsedQty;
                                            }

                                            addItemMutation.mutate({
                                                productId: p.id,
                                                quantity: qty,
                                                unitPrice: p.sale_price
                                            });
                                            setSearchQuery("");
                                        }}
                                    >
                                        <div>
                                            <p className="font-medium">{p.name}</p>
                                            <p className="text-xs text-muted-foreground">Estoque: {p.stock_current} {p.unit}</p>
                                        </div>
                                        <div className="font-bold text-sm">{formatCurrency(p.sale_price)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tabela de Itens */}
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="w-20">Qtde</TableHead>
                                    <TableHead>Preço</TableHead>
                                    <TableHead>Subtotal</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingDetail ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                                ) : comanda?.items?.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-4">Nenhum item adicionado.</TableCell></TableRow>
                                ) : (
                                    comanda?.items?.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                                            <TableCell>{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive"
                                                    onClick={() => removeItemMutation.mutate(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar Janela</Button>
                    <Button
                        disabled={!comanda?.items?.length}
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => setIsCheckoutOpen(true)}
                    >
                        Finalizar e Receber
                    </Button>
                </DialogFooter>
            </DialogContent>

            {/* Checkout Dialog */}
            {comanda && (
                <CheckoutDialog
                    open={isCheckoutOpen}
                    onOpenChange={setIsCheckoutOpen}
                    total={total}
                    onConfirm={async (payments, customerId) => {
                        try {
                            await closeComandaMutation.mutateAsync({
                                customerId: customerId || comanda.customer_id,
                                total,
                                payments
                            });
                            setIsCheckoutOpen(false);
                        } catch (err: any) {
                            // the mutation's onError will handle showing the toast
                        }
                    }}
                />
            )}

            <ReceiptOptionsDialog
                open={receiptOptionsOpen}
                onOpenChange={setReceiptOptionsOpen}
                onEmitNFCe={() => {
                    if (lastSaleData?.saleId) {
                        emitFiscal.mutate({ saleId: lastSaleData.saleId, model: '65' });
                    }
                    setReceiptOptionsOpen(false);
                    onOpenChange(false);
                }}
                onPrintReceipt={() => {
                    if (lastSaleData) {
                        printReceipt(lastSaleData);
                    }
                    setReceiptOptionsOpen(false);
                    onOpenChange(false);
                }}
                onWhatsApp={() => {
                    if (lastSaleData) {
                        window.open(getWhatsappUrl(lastSaleData), '_blank');
                    }
                    setReceiptOptionsOpen(false);
                    onOpenChange(false);
                }}
            />
        </Dialog>
    );
}
