import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSaleDetail } from "@/hooks/useSales";
import { Loader2, Package, CreditCard, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleId: string | null;
}

export function SaleDetailsDialog({ open, onOpenChange, saleId }: Props) {
    const { data: sale, isLoading } = useSaleDetail(saleId);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center pr-6">
                        <span>Detalhes da Venda #{sale?.sale_number}</span>
                        {sale && (
                            <span className="text-sm font-normal text-muted-foreground uppercase">
                                {format(new Date(sale.created_at), "dd MMMM yyyy HH:mm", { locale: ptBR })}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : !sale ? (
                    <p className="text-center py-8 text-muted-foreground text-sm uppercase font-bold tracking-widest">
                        Venda não encontrada.
                    </p>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Cliente</p>
                                    <p className="font-medium">{sale.customer_name || "Consumidor Final"}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none mb-1">Data da Venda</p>
                                    <p className="font-medium">{format(new Date(sale.created_at), "dd/MM/yyyy HH:mm")}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                                <Package className="h-4 w-4" /> Itens Vendidos
                            </h3>
                            <div className="rounded-lg border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 pointer-events-none">
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="text-center">Qtd</TableHead>
                                            <TableHead className="text-right">Unitário</TableHead>
                                            <TableHead className="text-right">Subtotal</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sale.items.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.product_name}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(item.quantity * item.unit_price)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground">
                                    <CreditCard className="h-4 w-4" /> Pagamentos
                                </h3>
                                <div className="space-y-2">
                                    {sale.payments.map((p) => (
                                        <div key={p.id} className="flex justify-between items-center p-3 rounded-md border bg-muted/20">
                                            <span className="text-sm font-medium">{p.method_name}</span>
                                            <span className="font-semibold">{formatCurrency(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2 text-muted-foreground invisible">Resumo</h3>
                                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                                    <div className="flex justify-between text-sm text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span>{formatCurrency((sale.total_amount || 0) + (sale.discount || 0))}</span>
                                    </div>
                                    {(sale.discount || 0) > 0 && (
                                        <div className="flex justify-between text-sm text-destructive">
                                            <span>Desconto</span>
                                            <span>- {formatCurrency(sale.discount)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end pt-2 border-t border-primary/10">
                                        <span className="text-sm font-bold uppercase">Total Geral</span>
                                        <span className="text-2xl font-black text-primary">{formatCurrency(sale.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
