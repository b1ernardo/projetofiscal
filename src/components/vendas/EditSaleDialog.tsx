import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSaleDetail, useUpdateSale } from "@/hooks/useSales";
import { useProducts } from "@/hooks/useProducts";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useCustomers } from "@/hooks/useCustomers";
import { Loader2, Trash2, Save, AlertTriangle, Search, Plus, ChevronsUpDown, Check, Edit3, Package, CreditCard, Calculator, User } from "lucide-react";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const currency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleId: string | null;
    onSuccess?: () => void;
}

export function EditSaleDialog({ open, onOpenChange, saleId, onSuccess }: Props) {
    const { data: sale, isLoading } = useSaleDetail(saleId);
    const { data: products = [] } = useProducts();
    const { data: paymentMethods = [] } = usePaymentMethods();
    const { data: customers = [] } = useCustomers();
    const updateSale = useUpdateSale();

    const [items, setItems] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [discount, setDiscount] = useState<number>(0);
    const [extra, setExtra] = useState<number>(0);
    const [productSearchOpen, setProductSearchOpen] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState("");
    const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [status, setStatus] = useState("completed");

    useEffect(() => {
        if (sale && open) {
            setItems(sale.items.map(i => ({
                id: i.product_id,
                product_name: i.product_name,
                quantity: Number(i.quantity),
                price: Number(i.unit_price)
            })));
            setPayments(sale.payments.map(p => ({
                methodName: p.method_name,
                amount: Number(p.amount)
            })));
            setDiscount(Number(sale.discount || 0));
            setExtra(0);
            
            if (sale.customer_id) {
                setSelectedCustomer({
                    id: sale.customer_id,
                    name: sale.customer_name
                });
            } else {
                setSelectedCustomer({
                    id: "default",
                    name: "CONSUMIDOR FINAL"
                });
            }
            setStatus(sale.status || "completed");
        }
    }, [sale, open]);

    const subtotal = items.reduce((s, i) => s + (Number(i.quantity) * Number(i.price)), 0);
    const total = subtotal - discount + extra;
    const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
    const difference = total - totalPaid;

    const filteredProducts = useMemo(() => {
        const term = productSearchTerm.toLowerCase();
        if (!term) return products.slice(0, 5);
        return products.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.product_code || "").toLowerCase().includes(term)
        ).slice(0, 10);
    }, [products, productSearchTerm]);

    const handleAddProduct = (product: any) => {
        const existing = items.find(i => i.id === product.id);
        if (existing) {
            setItems(items.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setItems([...items, {
                id: product.id,
                product_name: product.name,
                quantity: 1,
                price: Number(product.sale_price)
            }]);
        }
        setProductSearchOpen(false);
        setProductSearchTerm("");
    };

    const handleAddPayment = (methodName: string) => {
        setPayments([...payments, { methodName, amount: 0 }]);
    };

    const removePayment = (index: number) => {
        setPayments(payments.filter((_, i) => i !== index));
    };

    const handleUpdate = () => {
        if (!saleId) return;
        
        // Validation for 'Conta' payment
        const hasContaPayment = payments.some(p => p.methodName.toLowerCase() === 'conta' && p.amount > 0);
        if (hasContaPayment && (!selectedCustomer || selectedCustomer.id === "default")) {
            toast.error("Para vendas a prazo (Conta), você deve informar um cliente específico.");
            setCustomerSearchOpen(true);
            return;
        }

        if (Math.abs(difference) > 0.01) {
            toast.error("O total dos pagamentos deve ser igual ao total da venda.");
            return;
        }
        updateSale.mutate({
            id: saleId,
            data: {
                items,
                payments,
                total,
                discount,
                customerId: selectedCustomer?.id === "default" ? null : selectedCustomer?.id,
                status
            }
        }, {
            onSuccess: () => {
                toast.success("Venda atualizada com sucesso");
                onOpenChange(false);
                if (onSuccess) onSuccess();
            },
            onError: (err: any) => {
                toast.error("Erro ao atualizar venda: " + err.message);
            }
        });
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

    const updateQty = (id: string, qty: string) => {
        const n = parseFloat(qty) || 0;
        setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: n } : i));
    };

    const updatePrice = (id: string, price: string) => {
        const n = parseFloat(price) || 0;
        setItems(prev => prev.map(i => i.id === id ? { ...i, price: n } : i));
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
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-2">
                        <Edit3 className="h-5 w-5" /> Editar Venda #{sale?.sale_number}
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <p className="text-muted-foreground animate-pulse font-medium">Carregando dados da venda...</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <User className="h-3 w-3" /> Cliente da Venda
                                </label>
                                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-10 font-bold bg-slate-50 border-slate-200">
                                            {selectedCustomer ? selectedCustomer.name : "Selecione o Cliente..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Buscar cliente..." />
                                            <CommandList>
                                                <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem onSelect={() => { setSelectedCustomer({ id: "default", name: "CONSUMIDOR FINAL" }); setCustomerSearchOpen(false); }}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === "default" ? "opacity-100" : "opacity-0")} />
                                                        CONSUMIDOR FINAL
                                                    </CommandItem>
                                                    {customers.map((customer) => (
                                                        <CommandItem key={customer.id} onSelect={() => { setSelectedCustomer({ id: customer.id, name: customer.name }); setCustomerSearchOpen(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0")} />
                                                            {customer.name} - {customer.cpf_cnpj}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="w-full md:w-48 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Número Venda</label>
                                <Input readOnly value={sale?.sale_number || ""} className="h-10 bg-slate-100 font-bold text-center" />
                            </div>
                            <div className="w-full md:w-48 space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status da Venda</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-10 font-bold">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="completed">Concluída</SelectItem>
                                        <SelectItem value="cancelled">Cancelada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {sale?.fiscal_status === 'generated' && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800 text-sm shadow-sm">
                                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                                <div className="space-y-1">
                                    <p className="font-bold">Venda com Nota Fiscal Emitida!</p>
                                    <p className="opacity-90">
                                        Esta venda possui uma nota fiscal autorizada. Alterar itens ou valores pode causar inconsistência com a SEFAZ. 
                                        Recomendamos cancelar a nota antes de realizar alterações estruturais.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Package className="h-4 w-4" /> Itens da Venda
                                </h3>
                                <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 gap-2 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-bold">
                                            <Plus className="h-4 w-4" /> Adicionar Produto
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="end">
                                        <Command shouldFilter={false}>
                                            <CommandInput 
                                                placeholder="Buscar produto para adicionar..." 
                                                value={productSearchTerm}
                                                onValueChange={setProductSearchTerm}
                                            />
                                            <CommandList>
                                                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredProducts.map((p) => (
                                                        <CommandItem key={p.id} onSelect={() => handleAddProduct(p)} className="flex justify-between items-center py-3">
                                                            <div className="flex flex-col">
                                                                <span className="font-bold">{p.name}</span>
                                                                <span className="text-[10px] text-muted-foreground font-mono">{p.product_code || p.code}</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="font-black text-primary">{currency(Number(p.sale_price))}</span>
                                                                <div className="text-[10px] text-muted-foreground">Estoque: {p.stock_current}</div>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="py-4 font-bold">Produto</TableHead>
                                            <TableHead className="w-[100px] py-4 text-center font-bold">Qtd</TableHead>
                                            <TableHead className="text-right py-4 font-bold">Unitário</TableHead>
                                            <TableHead className="text-right py-4 font-bold">Subtotal</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item) => (
                                            <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium py-3">
                                                    <div className="flex flex-col">
                                                        <span>{item.product_name}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono">ID: {item.id.substring(0, 8)}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateQty(item.id, e.target.value)}
                                                        className="h-8 text-center font-bold"
                                                        step="0.01"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right py-3">
                                                    <Input
                                                        type="number"
                                                        value={item.price}
                                                        onChange={(e) => updatePrice(item.id, e.target.value)}
                                                        className="h-8 w-24 text-right ml-auto font-mono"
                                                        step="0.01"
                                                    />
                                                </TableCell>
                                                <TableCell className="text-right py-3 font-black text-slate-700">
                                                    {currency(item.quantity * item.price)}
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(item.id)} className="text-destructive hover:bg-destructive/10 h-8 w-8">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {items.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                                    Nenhum item na venda.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                            <CreditCard className="h-4 w-4" /> Formas de Pagamento
                                        </h3>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" size="sm" className="h-8 gap-1 font-bold">
                                                    <Plus className="h-3 w-3" /> Adicionar
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-1 w-48" align="end">
                                                {paymentMethods.filter(m => m.active).map(m => (
                                                    <Button 
                                                        key={m.id} 
                                                        variant="ghost" 
                                                        className="w-full justify-start text-xs font-bold" 
                                                        onClick={() => handleAddPayment(m.name)}
                                                    >
                                                        {m.name}
                                                    </Button>
                                                ))}
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2 bg-muted/20 p-4 rounded-xl border border-dashed">
                                        {payments.map((p, idx) => (
                                            <div key={idx} className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
                                                <span className="flex-1 text-xs font-black uppercase text-slate-500">{p.methodName}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground">R$</span>
                                                    <Input
                                                        type="number"
                                                        value={p.amount}
                                                        onChange={(e) => updatePayment(idx, e.target.value)}
                                                        className="w-28 h-8 text-right font-mono font-bold border-none bg-slate-50 focus-visible:ring-0"
                                                        step="0.01"
                                                    />
                                                    <Button variant="ghost" size="icon" onClick={() => removePayment(idx)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className={cn(
                                            "mt-4 p-3 rounded-lg text-[10px] font-black text-center uppercase tracking-wider shadow-inner transition-colors",
                                            Math.abs(difference) < 0.01 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                        )}>
                                            {Math.abs(difference) < 0.01 
                                                ? 'Conferência: Pagamento OK' 
                                                : `Conferência: Falta ${currency(difference)}`
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Calculator className="h-4 w-4" /> Resumo e Ajustes
                                </h3>
                                <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-6 shadow-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                                    
                                    <div className="space-y-4 relative z-10">
                                        <div className="flex justify-between items-center text-sm border-b border-white/10 pb-2">
                                            <span className="opacity-60 font-bold uppercase text-[10px]">Subtotal Bruto</span>
                                            <span className="font-mono">{currency(subtotal)}</span>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="opacity-60 font-bold uppercase text-[10px]">Desconto (R$)</span>
                                                <Input 
                                                    type="number"
                                                    value={discount}
                                                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                                                    className="w-24 h-8 bg-white/10 border-none text-right font-mono text-rose-400 focus-visible:ring-rose-500"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="opacity-60 font-bold uppercase text-[10px]">Acréscimo (R$)</span>
                                                <Input 
                                                    type="number"
                                                    value={extra}
                                                    onChange={(e) => setExtra(Number(e.target.value) || 0)}
                                                    className="w-24 h-8 bg-white/10 border-none text-right font-mono text-emerald-400 focus-visible:ring-emerald-500"
                                                />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-white/20">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Valor Final</span>
                                                <span className="text-4xl font-black tracking-tighter text-emerald-400">{currency(total)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full h-14 text-lg font-black gap-3 bg-emerald-500 hover:bg-emerald-600 text-white border-none shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                                        onClick={handleUpdate}
                                        disabled={updateSale.isPending || Math.abs(difference) > 0.01}
                                    >
                                        {updateSale.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6" />}
                                        SALVAR ALTERAÇÕES
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
