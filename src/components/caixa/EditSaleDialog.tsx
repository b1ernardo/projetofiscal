import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  CreditCard, Banknote, Smartphone, CheckCircle, X, Loader2,
  Plus, Minus, Trash2, Search, Package,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { SaleFormatDialog } from "@/components/pdv/SaleFormatDialog";

interface SaleData {
  id: string;
  total_amount: number;
  payment_method: string;
  status: string;
}

interface SaleItem {
  id?: string;
  product_id: string;
  item_key: string; // unique key: "productId" or "productId-label"
  product_name: string;
  quantity: number;
  unit_price: number;
  original_quantity: number;
}

interface BoxConfig {
  label: string;
  quantity: number;
  price: number;
}

interface ProductWithBoxConfigs {
  id: string;
  name: string;
  sale_price: number;
  boxConfigs: BoxConfig[];
}

interface EditSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: SaleData | null;
  onSaved: () => void;
}

const iconMap: Record<string, React.ReactNode> = {
  "Dinheiro": <Banknote className="h-5 w-5" />,
  "PIX": <Smartphone className="h-5 w-5" />,
};
const defaultIcon = <CreditCard className="h-5 w-5" />;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function EditSaleDialog({ open, onOpenChange, sale, onSaved }: EditSaleDialogProps) {
  const { user } = useAuth();
  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [payments, setPayments] = useState<{ methodId: string; methodName: string; amount: number }[]>([]);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [removedItems, setRemovedItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [productSearch, setProductSearch] = useState("");
  const [allProducts, setAllProducts] = useState<ProductWithBoxConfigs[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [formatDialogProduct, setFormatDialogProduct] = useState<ProductWithBoxConfigs | null>(null);

  useEffect(() => {
    if (!open || !sale) return;
    setRemovedItems([]);
    setProductSearch("");
    setShowProductSearch(false);
    setFormatDialogProduct(null);
    setLoadingData(true);

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const [methodsRes, saleRes, productsRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/payment_methods`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/sales/${sale.id}`, { headers }),
          fetch(`${import.meta.env.VITE_API_URL}/products?active=true`, { headers }),
        ]);

        const mData = await methodsRes.json();
        const sData = await saleRes.json();
        const pData = await productsRes.json();

        setMethods(mData);

        // Build products with box configs
        // We need an endpoint for box configs or they should come with products
        // For now, I'll assume products/configs endpoint is available or I'll fetch it separately.
        // Let's assume the product list includes configs or at least we have an endpoint.
        const products = pData.map((p: any) => ({
          ...p,
          boxConfigs: p.box_configs || [],
        }));
        setAllProducts(products);

        // Parse existing sale items
        const parsedItems: SaleItem[] = (sData.items || []).map((si: any) => ({
          id: si.id,
          product_id: si.product_id,
          item_key: `${si.product_id}-${si.unit_price}`,
          product_name: si.product_name || "Produto",
          quantity: parseFloat(si.quantity),
          unit_price: parseFloat(si.unit_price),
          original_quantity: parseFloat(si.quantity),
        }));
        setItems(parsedItems);

        // Parse payments
        const parsedPayments = (sData.payments || []).map((sp: any) => {
          const found = mData.find((m: any) => m.name === sp.method_name);
          return {
            methodId: found ? found.id : sp.method_name,
            methodName: sp.method_name,
            amount: parseFloat(sp.amount)
          };
        });
        setPayments(parsedPayments);

      } catch (err) {
        toast.error("Erro ao carregar dados da venda");
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [open, sale]);

  const newTotal = useMemo(() => items.reduce((s, i) => s + i.unit_price * i.quantity, 0), [items]);
  const remaining = newTotal - payments.reduce((s, p) => s + p.amount, 0);
  const selectedIds = new Set(payments.map((p) => p.methodId));

  // --- Item actions ---
  const updateItemQty = (itemKey: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.item_key === itemKey ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i
      )
    );
  };

  const removeItem = (itemKey: string) => {
    const item = items.find((i) => i.item_key === itemKey);
    if (item) setRemovedItems((prev) => [...prev, item]);
    setItems((prev) => prev.filter((i) => i.item_key !== itemKey));
  };

  const handleProductClick = (product: ProductWithBoxConfigs) => {
    if (product.boxConfigs.length > 0) {
      setFormatDialogProduct(product);
    } else {
      addProductItem(product.id, product.name, product.sale_price);
    }
  };

  const addProductItem = (productId: string, displayName: string, price: number) => {
    const itemKey = `${productId}-${price}`;
    const existing = items.find((i) => i.item_key === itemKey);
    if (existing) {
      updateItemQty(itemKey, 1);
    } else {
      setItems((prev) => [
        ...prev,
        { product_id: productId, item_key: itemKey, product_name: displayName, quantity: 1, unit_price: price, original_quantity: 0 },
      ]);
    }
    setShowProductSearch(false);
    setProductSearch("");
  };

  const filteredProducts = allProducts.filter(
    (p) => p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // --- Payment actions ---
  const addPayment = (methodId: string) => {
    const method = methods.find((m) => m.id === methodId);
    if (!method || selectedIds.has(methodId)) return;
    const autoAmount = Math.max(0, Math.round(remaining * 100) / 100);
    setPayments((prev) => [...prev, { methodId, methodName: method.name, amount: autoAmount }]);
  };

  const updatePaymentAmount = (methodId: string, amount: number) => {
    setPayments((prev) =>
      prev.map((p) => (p.methodId === methodId ? { ...p, amount: Math.max(0, amount) } : p))
    );
  };

  const removePayment = (methodId: string) => {
    setPayments((prev) => prev.filter((p) => p.methodId !== methodId));
  };

  // --- Save ---
  const handleSave = async () => {
    if (!sale || !user) return;
    if (items.length === 0) {
      toast.error("A venda precisa ter pelo menos um produto");
      return;
    }
    if (payments.length === 0) {
      toast.error("Adicione pelo menos uma forma de pagamento");
      return;
    }
    if (Math.abs(remaining) > 0.01) {
      toast.error("O valor dos pagamentos não confere com o total");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/${sale.id}`, {
        method: 'PUT', // Assuming PUT for update
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          total: newTotal,
          items: items.map(i => ({
            id: i.product_id,
            quantity: i.quantity,
            price: i.unit_price,
            original_quantity: i.original_quantity
          })),
          payments: payments.map(p => ({
            methodName: p.methodName,
            amount: p.amount
          }))
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao salvar alterações');
      }

      toast.success("Venda atualizada!");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!sale) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Venda</DialogTitle>
          </DialogHeader>

          {loadingData ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 pb-4">
                {/* --- Products Section --- */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Produtos</p>
                    <Button variant="outline" size="sm" onClick={() => setShowProductSearch(!showProductSearch)}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                    </Button>
                  </div>

                  {showProductSearch && (
                    <div className="mb-2 space-y-1">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Buscar produto..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-8 h-8 text-sm"
                          autoFocus
                        />
                      </div>
                      {productSearch && (
                        <div className="max-h-32 overflow-auto rounded-md border">
                          {filteredProducts.length === 0 ? (
                            <p className="p-2 text-xs text-muted-foreground">Nenhum produto encontrado</p>
                          ) : (
                            filteredProducts.slice(0, 8).map((p) => (
                              <button
                                key={p.id}
                                onClick={() => handleProductClick(p)}
                                className="flex w-full items-center justify-between p-2 text-sm hover:bg-muted transition-colors"
                              >
                                <span className="flex items-center gap-1.5">
                                  {p.name}
                                  {p.boxConfigs.length > 0 && <Package className="h-3.5 w-3.5 text-muted-foreground" />}
                                </span>
                                <span className="text-xs text-muted-foreground">{formatCurrency(p.sale_price)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div key={item.item_key} className="flex items-center gap-2 rounded-lg border p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.unit_price)} × {item.quantity} = {formatCurrency(item.unit_price * item.quantity)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQty(item.item_key, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateItemQty(item.item_key, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(item.item_key)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="text-sm font-medium w-20 text-right">{formatCurrency(item.unit_price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between mt-2 pt-2 border-t text-sm font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(newTotal)}</span>
                  </div>
                </div>

                {/* --- Payment Section --- */}
                <div>
                  <p className="text-sm font-medium mb-2">Formas de Pagamento</p>
                  <div className="grid grid-cols-3 gap-2">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => addPayment(m.id)}
                        className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all text-xs ${selectedIds.has(m.id)
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/30"
                          }`}
                      >
                        {iconMap[m.name] || defaultIcon}
                        <span className="font-medium">{m.name}</span>
                        {selectedIds.has(m.id) && <CheckCircle className="h-3.5 w-3.5" />}
                      </button>
                    ))}
                  </div>

                  {payments.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {payments.map((p) => (
                        <div key={p.methodId} className="flex items-center gap-2 rounded-lg border p-2">
                          <span className="text-sm font-medium flex-1">{p.methodName}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={p.amount || ""}
                              onChange={(e) => updatePaymentAmount(p.methodId, parseFloat(e.target.value) || 0)}
                              className="w-24 h-8 text-right text-sm"
                            />
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removePayment(p.methodId)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}

                      {Math.abs(remaining) > 0.01 && (
                        <p className={`text-xs font-medium text-center ${remaining > 0 ? "text-destructive" : "text-warning"}`}>
                          {remaining > 0 ? `Faltam ${formatCurrency(remaining)}` : `Excedente de ${formatCurrency(Math.abs(remaining))}`}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={items.length === 0 || payments.length === 0 || Math.abs(remaining) > 0.01 || loading}
                  onClick={handleSave}
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar Alterações
                </Button>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {formatDialogProduct && (
        <SaleFormatDialog
          open={!!formatDialogProduct}
          onOpenChange={(o) => !o && setFormatDialogProduct(null)}
          productName={formatDialogProduct.name}
          unitPrice={formatDialogProduct.sale_price}
          boxConfigs={formatDialogProduct.boxConfigs}
          onSelect={(label, price) => {
            const displayName = label === "Unidade"
              ? formatDialogProduct.name
              : `${formatDialogProduct.name} (${label})`;
            addProductItem(formatDialogProduct.id, displayName, price);
            setFormatDialogProduct(null);
          }}
          formatCurrency={formatCurrency}
        />
      )}
    </>
  );
}
