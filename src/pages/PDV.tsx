import { useState, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingCart, ListRestart, Loader2, Unlock, Lock } from "lucide-react";
import { CheckoutDialog } from "@/components/pdv/CheckoutDialog";
import { PauseSaleDialog } from "@/components/pdv/PauseSaleDialog";
import { PausedSalesDialog } from "@/components/pdv/PausedSalesDialog";
import { CartPanel } from "@/components/pdv/CartPanel";
import { SaleFormatDialog } from "@/components/pdv/SaleFormatDialog";
import { OpenCashRegisterDialog } from "@/components/caixa/OpenCashRegisterDialog";
import { CloseCashRegisterDialog } from "@/components/caixa/CloseCashRegisterDialog";
import { SaveToComandaDialog } from "@/components/pdv/SaveToComandaDialog";
import { ReceiptOptionsDialog } from "@/components/pdv/ReceiptOptionsDialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { useProducts, type ProductWithBoxConfigs } from "@/hooks/useProducts";
import { useSaveSale } from "@/hooks/useSaveSale";
import { useFiscal } from "@/hooks/useFiscal";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { printReceipt, getWhatsappUrl } from "@/utils/printReceipt";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PausedSale {
  id: number;
  items: CartItem[];
  total: number;
  pausedAt: Date;
  label: string;
  observation: string;
}

let pauseCounter = 0;

export default function PDV() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [pausedSalesOpen, setPausedSalesOpen] = useState(false);
  const [pausedSales, setPausedSales] = useState<PausedSale[]>([]);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [formatDialogProduct, setFormatDialogProduct] = useState<ProductWithBoxConfigs | null>(null);
  const [pendingQty, setPendingQty] = useState(1); // quantity from barcode scanner (QTY*CODE format)
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"percent" | "value">("percent");
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [closeCashDialog, setCloseCashDialog] = useState(false);
  const [saveToComandaOpen, setSaveToComandaOpen] = useState(false);
  const [receiptOptionsOpen, setReceiptOptionsOpen] = useState(false);
  const [lastSaleData, setLastSaleData] = useState<any>(null);
  const isMobile = useIsMobile();

  const { data: products = [], isLoading } = useProducts();
  const saveSale = useSaveSale();
  const emitFiscal = useFiscal();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cashRegister, isLoading: loadingRegister } = useQuery({
    queryKey: ["cash-register-open"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/current`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao verificar caixa');
      const data = await response.json();
      return data;
    },
  });

  const isCashOpen = !!cashRegister;

  const categories = useMemo(() => {
    const cats = new Set(products.map((p) => p.category_name).filter(Boolean) as string[]);
    return ["Todos", ...Array.from(cats).sort()];
  }, [products]);

  const searchRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter((p) => {
    let term = search.toLowerCase();

    // If user is typing "10*SKOL", use "SKOL" as the filter term
    const starMatch = search.match(/^[\d.,]+\s*\*\s*(.*)$/);
    if (starMatch) {
      term = starMatch[1].toLowerCase().trim();
    }

    if (!term) return true; // Show all if just "10*" is typed

    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      (p.code || "").toLowerCase().includes(term) ||
      String(p.product_code || "").includes(term);
    const matchesCategory = selectedCategory === "Todos" || p.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (id: string, name: string, price: number, qty: number = 1) => {
    setCart((prev) => {
      const key = `${id}-${name}`;
      const existing = prev.find((i) => i.id === key);
      if (existing) {
        return prev.map((i) => (i.id === key ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { id: key, name, price, quantity: qty }];
    });
  };

  // Barcode scan: on Enter, supports format QTY*CODE  (e.g. 10*7891234)
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    // Read directly from the DOM input to avoid any stale state
    let raw = e.currentTarget.value.trim();
    if (!raw) return;

    // Parse quantity prefix: "10*codigo" or "10 * codigo"
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

    // Exact match by barcode (code) or product_code
    const exact = products.find(
      (p) =>
        (p.code || '').toLowerCase() === term.toLowerCase() ||
        String(p.product_code || '') === term
    );

    // Fallback: single filtered result
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(term.toLowerCase()) ||
        String(p.product_code || '').includes(term)
    );
    const candidate = exact || (filtered.length === 1 ? filtered[0] : null);

    if (candidate) {
      if (candidate.boxConfigs.length > 0) {
        setPendingQty(qty);   // preserve scanner qty for the format dialog
        setFormatDialogProduct(candidate);
      } else {
        addToCart(candidate.id, candidate.name, candidate.sale_price, qty);
        toast.success(`${qty}x ${candidate.name} adicionado ao carrinho!`);
      }
      setSearch('');
    } else if (filtered.length === 0) {
      toast.error('Nenhum produto encontrado para este código.');
    }
    // If multiple results: do nothing, let user pick from cards
  };

  const handleProductClick = (product: ProductWithBoxConfigs) => {
    if (product.boxConfigs.length > 0) {
      setPendingQty(1);   // normal click always uses qty 1
      setFormatDialogProduct(product);
    } else {
      addToCart(product.id, product.name, product.sale_price);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const confirmPause = (observation: string) => {
    pauseCounter++;
    setPausedSales((prev) => [
      ...prev,
      { id: pauseCounter, items: [...cart], total: subtotal, pausedAt: new Date(), label: `Venda #${pauseCounter}`, observation },
    ]);
    setCart([]);
    setPauseDialogOpen(false);
    setCartDrawerOpen(false);
    toast.info("Venda pausada!");
  };

  const resumeSale = (sale: PausedSale) => {
    if (cart.length > 0) {
      pauseCounter++;
      setPausedSales((prev) => [
        ...prev,
        { id: pauseCounter, items: [...cart], total: subtotal, pausedAt: new Date(), label: `Venda #${pauseCounter}`, observation: "" },
      ]);
      toast.info("Venda atual foi pausada automaticamente.");
    }
    setCart(sale.items);
    setPausedSales((prev) => prev.filter((s) => s.id !== sale.id));
    toast.success(`${sale.label} retomada!`);
  };

  const deletePausedSale = (id: number) => {
    setPausedSales((prev) => prev.filter((s) => s.id !== id));
    toast.info("Venda pausada removida.");
  };

  const discountAmount = discountType === "percent" ? subtotal * (discount / 100) : discount;
  const totalWithDiscount = Math.max(0, subtotal - discountAmount);

  const cartPanelProps = {
    cart,
    onUpdateQuantity: updateQuantity,
    onRemove: removeFromCart,
    subtotal,
    discount,
    onDiscountChange: setDiscount,
    formatCurrency,
    onPause: () => setPauseDialogOpen(true),
    onCheckout: () => setCheckoutOpen(true),
    onSaveToComanda: () => setSaveToComandaOpen(true),
  };

  if (loadingRegister) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isCashOpen) {
    return (
      <div className="flex h-[calc(100vh-5rem)] flex-col items-center justify-center gap-4">
        <div className="text-center space-y-2">
          <Unlock className="mx-auto h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-bold">Caixa Fechado</h2>
          <p className="text-muted-foreground">Abra o caixa para começar a vender.</p>
        </div>
        <Button onClick={() => setOpenCashDialog(true)}>
          <Unlock className="mr-2 h-4 w-4" /> Abrir Caixa
        </Button>
        <OpenCashRegisterDialog
          open={openCashDialog}
          onOpenChange={setOpenCashDialog}
          onOpened={() => queryClient.invalidateQueries({ queryKey: ["cash-register-open"] })}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4">
      <div className="flex flex-1 flex-col gap-3 min-w-0">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Buscar por nome, código ou cód. barras (Enter para adicionar)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden" onClick={() => setPausedSalesOpen(true)}>
            <ListRestart className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setPausedSalesOpen(true)} className="relative hidden md:inline-flex">
            <ListRestart className="mr-2 h-4 w-4" />
            Vendas Pausadas
            {pausedSales.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 text-xs">{pausedSales.length}</Badge>
            )}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setCloseCashDialog(true)} className="shrink-0">
            <Lock className="mr-2 h-4 w-4" /> Fechar Caixa
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Badge key={cat} variant={selectedCategory === cat ? "default" : "outline"} className="cursor-pointer text-xs" onClick={() => setSelectedCategory(cat)}>
              {cat}
            </Badge>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid flex-1 gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 overflow-auto content-start pb-20 md:pb-0">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 transition-all hover:shadow-md hover:border-primary/50 text-center"
              >
                {product.photo_url ? (
                  <img src={product.photo_url} alt={product.name} className="h-10 w-10 md:h-14 md:w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center rounded-lg bg-primary/10 text-primary text-xl md:text-2xl font-bold">
                    {product.name.charAt(0)}
                  </div>
                )}
                <span className="text-xs md:text-sm font-medium line-clamp-2">{product.name}</span>
                <span className="text-xs md:text-sm font-bold text-primary">{formatCurrency(product.sale_price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <CartPanel {...cartPanelProps} asCard />

      {isMobile && (
        <button
          onClick={() => setCartDrawerOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs font-bold px-1">
              {totalItems}
            </span>
          )}
        </button>
      )}

      <Drawer open={cartDrawerOpen} onOpenChange={setCartDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader><DrawerTitle>Carrinho</DrawerTitle></DrawerHeader>
          <div className="px-4 pb-6 overflow-auto">
            <CartPanel {...cartPanelProps} asCard={false} />
          </div>
        </DrawerContent>
      </Drawer>

      <PauseSaleDialog open={pauseDialogOpen} onOpenChange={setPauseDialogOpen} onConfirm={confirmPause} itemCount={totalItems} total={formatCurrency(subtotal)} />
      <PausedSalesDialog open={pausedSalesOpen} onOpenChange={setPausedSalesOpen} pausedSales={pausedSales} onResume={resumeSale} onDelete={deletePausedSale} formatCurrency={formatCurrency} />
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        total={totalWithDiscount}
        onConfirm={async (payments, customerId) => {
          if (!user) {
            toast.error("Usuário não autenticado.");
            return;
          }
          const finalCustomerId = customerId === 'none' ? undefined : customerId;

          try {
            const res = await saveSale.mutateAsync({
              cart, total: totalWithDiscount, payments, userId: user.id, discount: discountAmount, customerId: finalCustomerId
            });
            toast.success(`Venda #${res.sale_number} finalizada com sucesso!`);
            setLastSaleData({
              saleId: res.id,
              saleNumber: res.sale_number,
              cart,
              total: totalWithDiscount,
              discount: discountAmount,
              payments,
              date: new Date()
            });
            setReceiptOptionsOpen(true);
            setCart([]);
            setDiscount(0);
            setCheckoutOpen(false);
            setCartDrawerOpen(false);
          } catch (err: any) {
            toast.error(`Erro ao salvar venda: ${err.message}`);
          }
        }}
      />
      <ReceiptOptionsDialog
        open={receiptOptionsOpen}
        onOpenChange={setReceiptOptionsOpen}
        onEmitNFCe={() => {
          if (lastSaleData?.saleId) {
            emitFiscal.mutate({ saleId: lastSaleData.saleId, model: '65' });
          }
          setReceiptOptionsOpen(false);
        }}
        onPrintReceipt={() => {
          if (lastSaleData) {
            printReceipt(lastSaleData);
          }
          setReceiptOptionsOpen(false);
        }}
        onWhatsApp={() => {
          if (lastSaleData) {
            window.open(getWhatsappUrl(lastSaleData), '_blank');
          }
          setReceiptOptionsOpen(false);
        }}
      />
      <SaveToComandaDialog
        open={saveToComandaOpen}
        onOpenChange={setSaveToComandaOpen}
        cart={cart}
        onSaved={() => {
          setCart([]);
          setSaveToComandaOpen(false);
          setCartDrawerOpen(false);
        }}
      />

      {formatDialogProduct && (
        <SaleFormatDialog
          open={!!formatDialogProduct}
          onOpenChange={(open) => !open && setFormatDialogProduct(null)}
          productName={formatDialogProduct.name}
          unitPrice={formatDialogProduct.sale_price}
          boxConfigs={formatDialogProduct.boxConfigs}
          onSelect={(label, price, boxQuantity) => {
            const displayName = label === "Unidade"
              ? formatDialogProduct.name
              : `${formatDialogProduct.name} (${label})`;
            // boxQuantity = units inside a box (e.g. 12 for a case of 12)
            // pendingQty  = how many boxes/units the user scanned (e.g. 10 from "10*barcode")
            const totalQty = pendingQty * (label === "Unidade" ? 1 : boxQuantity);
            addToCart(formatDialogProduct.id + "-" + label, displayName, price, totalQty);
            setPendingQty(1);
            setFormatDialogProduct(null);
          }}
          formatCurrency={formatCurrency}
        />
      )}

      {cashRegister && (
        <CloseCashRegisterDialog
          open={closeCashDialog}
          onOpenChange={setCloseCashDialog}
          cashRegisterId={cashRegister.id}
          currentBalance={0}
          onClosed={() => queryClient.invalidateQueries({ queryKey: ["cash-register-open"] })}
        />
      )}
    </div>
  );
}
