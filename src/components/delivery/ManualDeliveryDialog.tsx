import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateDeliveryOrder } from "@/hooks/useDeliveryOrders";
import { useProducts } from "@/hooks/useProducts";
import { useDeliveryNeighborhoods, useSaveDeliverySettings } from "@/hooks/useDeliverySettings";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { PlusCircle, Search, Trash2, Loader2, Minus, Plus, Banknote } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ManualDeliveryDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { data: neighborhoods } = useDeliveryNeighborhoods();
    const { data: paymentMethods } = usePaymentMethods();

    const [form, setForm] = useState({
        customer_name: "",
        customer_phone: "",
        delivery_address: "",
        delivery_neighborhood: "",
        order_type: "delivery", // delivery or retira
        payment_method: "Dinheiro",
        change_for: "",
        delivery_fee: 0,
        observation: ""
    });

    const [items, setItems] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    const { data: products } = useProducts();
    const createOrder = useCreateDeliveryOrder();

    const handleUpdate = (f: string, v: any) => setForm(p => ({ ...p, [f]: v }));

    const subtotal = useMemo(() => items.reduce((acc, it) => acc + (it.price * it.quantity), 0), [items]);
    const total = subtotal + Number(form.delivery_fee);

    const handleSave = () => {
        if (!form.customer_name) {
            toast.error("O nome do cliente é obrigatório");
            return;
        }
        if (items.length === 0) {
            toast.error("Adicione ao menos um item ao pedido");
            return;
        }

        createOrder.mutate({
            ...form,
            delivery_address: form.delivery_neighborhood ? `${form.delivery_address} - Bairro: ${form.delivery_neighborhood}` : form.delivery_address,
            subtotal,
            total,
            items,
            change_for: form.change_for,
            status: "preparando",
            source: "manual"
        }, {
            onSuccess: () => {
                toast.success("Pedido manual criado com sucesso!");
                onOpenChange(false);
            }
        });
    };

    const addItem = (product: any) => {
        const exists = items.find(i => i.product_id === product.id);
        if (exists) {
            setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setItems([...items, { product_id: product.id, product_name: product.name, price: Number(product.sale_price), quantity: 1, observation: "" }]);
        }
        setSearch("");
    };

    const removeItem = (id: string) => setItems(items.filter(i => i.product_id !== id));
    const updateQty = (id: string, delta: number) => {
        setItems(items.map(i => {
            if (i.product_id === id) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };
    const updateObs = (id: string, obs: string) => setItems(items.map(i => i.product_id === id ? { ...i, observation: obs } : i));

    const filteredProducts = useMemo(() => {
        if (!products || !search) return [];
        return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code?.includes(search));
    }, [products, search]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="p-6 pb-2 border-b">
                    <DialogTitle>Novo Pedido Delivery/Balcão</DialogTitle>
                </DialogHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Painel Esquerdo: Produtos */}
                    <div className="w-1/2 p-6 flex flex-col border-r border-border gap-4">
                        <div>
                            <Label>Buscar Produto no Catálogo</Label>
                            <div className="relative mt-2">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Nome ou código do produto..."
                                    className="pl-10 h-10 bg-muted/30"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                        </div>
                        <ScrollArea className="flex-1 -mx-6 px-6">
                            <div className="grid grid-cols-2 gap-3 pb-8">
                                {filteredProducts.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => addItem(p)}
                                        className="flex flex-col text-left p-3 rounded-lg border bg-card hover:border-primary hover:bg-primary/5 transition-colors shadow-sm"
                                    >
                                        <h4 className="font-semibold text-sm line-clamp-2">{p.name}</h4>
                                        <span className="font-bold text-primary text-sm mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(p.sale_price))}</span>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Painel Direito: Infos e Carrinho */}
                    <div className="w-1/2 flex flex-col bg-muted/10">
                        <ScrollArea className="flex-1 p-6">
                            <div className="space-y-4 mb-6">
                                <h3 className="font-bold border-b pb-2 uppercase tracking-wide text-xs">Dados do Cliente</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Nome</Label>
                                        <Input value={form.customer_name} onChange={e => handleUpdate("customer_name", e.target.value)} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Telefone (Opcional)</Label>
                                        <Input value={form.customer_phone} onChange={e => handleUpdate("customer_phone", e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <Label>Tipo de Pedido</Label>
                                        <Select value={form.order_type} onValueChange={v => handleUpdate("order_type", v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="delivery">Delivery 🛵</SelectItem>
                                                <SelectItem value="retira">Retirar Balcão 🧳</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {form.order_type === 'delivery' && (
                                        <div className="space-y-1">
                                            <Label>Taxa Entrega</Label>
                                            <Input type="number" step="0.5" value={form.delivery_fee} onChange={e => handleUpdate("delivery_fee", parseFloat(e.target.value) || 0)} />
                                        </div>
                                    )}
                                </div>
                                {form.order_type === 'delivery' && (
                                    <>
                                        {neighborhoods && neighborhoods.length > 0 && (
                                            <div className="space-y-1">
                                                <Label>Bairro</Label>
                                                <Select
                                                    value={form.delivery_neighborhood}
                                                    onValueChange={v => {
                                                        const nb = neighborhoods.find(n => n.name === v);
                                                        setForm(p => ({
                                                            ...p,
                                                            delivery_neighborhood: v,
                                                            delivery_fee: nb ? Number(nb.fee) : p.delivery_fee
                                                        }));
                                                    }}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Selecione o bairro" /></SelectTrigger>
                                                    <SelectContent>
                                                        {neighborhoods.map(n => (
                                                            <SelectItem key={n.id} value={n.name}>{n.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n.fee))})</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        <div className="space-y-1">
                                            <Label>Endereço Completo</Label>
                                            <Input value={form.delivery_address} onChange={e => handleUpdate("delivery_address", e.target.value)} placeholder="Rua, Número, Referência..." />
                                        </div>
                                    </>
                                )}
                            </div>

                            <h3 className="font-bold border-b pb-2 uppercase tracking-wide text-xs mb-4">Itens Selecionados ({items.length})</h3>
                            <div className="flex flex-col gap-3">
                                {items.length === 0 ? (
                                    <p className="text-muted-foreground text-sm text-center py-4">Nenhum item adicionado.</p>
                                ) : items.map(it => (
                                    <div key={it.product_id} className="bg-background rounded-md border p-3 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-semibold text-sm">{it.product_name}</span>
                                            <button onClick={() => removeItem(it.product_id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(it.product_id, -1)}><Minus className="h-3 w-3" /></Button>
                                                <span className="font-mono font-bold w-4 text-center">{it.quantity}</span>
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQty(it.product_id, 1)}><Plus className="h-3 w-3" /></Button>
                                            </div>
                                            <span className="font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.price * it.quantity)}</span>
                                        </div>
                                        <Input
                                            placeholder="Observação (Ex: Sem cebola)"
                                            className="mt-2 h-8 text-xs bg-muted/20"
                                            value={it.observation}
                                            onChange={e => updateObs(it.product_id, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t border-border space-y-4">
                                <div>
                                    <Label className="flex items-center gap-1.5"><Banknote size={14} className="text-primary" /> Forma de Pagamento</Label>
                                    <Select value={form.payment_method} onValueChange={v => handleUpdate("payment_method", v)}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {paymentMethods?.filter(m => m.active).map(m => (
                                                <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                            ))}
                                            {!paymentMethods && <SelectItem value="Dinheiro">Dinheiro</SelectItem>}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {form.payment_method === 'Dinheiro' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-xs text-muted-foreground">Troco para quanto?</Label>
                                        <Input
                                            className="mt-1"
                                            placeholder="Ex: 50.00"
                                            value={form.change_for}
                                            onChange={e => handleUpdate("change_for", e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between font-bold text-xl items-center pt-2">
                                    <span>Total:</span>
                                    <span className="text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="p-4 border-t bg-background">
                            <Button className="w-full h-12 font-bold text-lg" disabled={createOrder.isPending} onClick={handleSave}>
                                {createOrder.isPending && <Loader2 className="w-5 h-5 mr-2 animate-spin" />}
                                Finalizar Pedido
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
