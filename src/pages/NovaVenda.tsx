import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Package, Users, Save, CheckCircle, XCircle, User } from "lucide-react";
import { useSellers } from "@/hooks/useSellers";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers, useAddCustomer } from "@/hooks/useCustomers";
import { useSaveProduct } from "@/hooks/useProducts";
import { useSaveSale } from "@/hooks/useSaveSale";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerFormDialog } from "@/components/clientes/CustomerFormDialog";
import { printReceipt, printReceiptA4, getWhatsappUrl } from "@/utils/printReceipt";
import { ProductFormDialog } from "@/components/produtos/ProductFormDialog";
import { CheckoutDialog } from "@/components/pdv/CheckoutDialog";
import { ReceiptOptionsDialog } from "@/components/pdv/ReceiptOptionsDialog";
import { SaleFormatDialog } from "@/components/pdv/SaleFormatDialog";
import { useFiscal } from "@/hooks/useFiscal";
import { cn } from "@/lib/utils";
import { QuoteDialog } from "@/components/pdv/QuoteDialog";
import { FileText } from "lucide-react";

export default function NovaVenda() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editingQuoteId = searchParams.get("edit");
    const [loadingQuote, setLoadingQuote] = useState(false);
    const { user } = useAuth();
    const { data: products = [] } = useProducts();
    const { data: customersList = [] } = useCustomers();
    const { data: sellers = [] } = useSellers();
    const saveSale = useSaveSale();
    const emitFiscal = useFiscal();
    const queryClient = useQueryClient();
    const addCustomerMutation = useAddCustomer();
    const saveProductMutation = useSaveProduct();

    const [openCustomerSearch, setOpenCustomerSearch] = useState(false);
    const [openSellerSearch, setOpenSellerSearch] = useState(false);
    const [openProductSearch, setOpenProductSearch] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState("");

    // Modals
    const [customerModalOpen, setCustomerModalOpen] = useState(false);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [receiptOptionsOpen, setReceiptOptionsOpen] = useState(false);
    const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
    const [lastSaleData, setLastSaleData] = useState<any>(null);

    // Form states
    const [selectedCustomer, setSelectedCustomer] = useState<any>({
        id: "default",
        name: "CONSUMIDOR FINAL",
        cpf_cnpj: ""
    });
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [itemQtd, setItemQtd] = useState<number>(1);
    const [itemPrice, setItemPrice] = useState<number>(0);
    const [selectedPriceType, setSelectedPriceType] = useState<1 | 2>(1);

    const [items, setItems] = useState<any[]>([]);
    const [desconto, setDesconto] = useState<number>(0);
    const [descontoPerc, setDescontoPerc] = useState<number>(0);
    const [acrescimo, setAcrescimo] = useState<number>(0);

    const [formatDialogProduct, setFormatDialogProduct] = useState<any>(null);
    const [formatDialogPendingQty, setFormatDialogPendingQty] = useState<number>(1);

    const filteredProducts = useMemo(() => {
        let term = productSearchTerm.toLowerCase();
        const starMatch = productSearchTerm.match(/^([\d.,]+)\s*\*\s*(.*)$/);
        if (starMatch) {
            term = starMatch[2].toLowerCase().trim();
        }

        if (!term) {
            return [...products]
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                .slice(0, 10);
        }

        return products.filter((p) => {
            return (
                p.name.toLowerCase().includes(term) ||
                (p.code || "").toLowerCase().includes(term) ||
                String(p.product_code || "").includes(term)
            );
        }).slice(0, 50);
    }, [products, productSearchTerm]);

    const qtdRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const addBtnRef = useRef<HTMLButtonElement>(null);
    const productSearchBtnRef = useRef<HTMLButtonElement>(null);

    // Computed totals
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const total = subtotal - desconto + acrescimo;

    // Handle select customer
    const handleSelectCustomer = (customer: any) => {
        setSelectedCustomer(customer);
        setOpenCustomerSearch(false);
        setTimeout(() => {
            productSearchBtnRef.current?.focus();
            setOpenProductSearch(true);
        }, 100);
    };

    const [selectedSeller, setSelectedSeller] = useState<any>(null);

    useEffect(() => {
        if (editingQuoteId && sellers.length > 0) {
            const fetchQuote = async () => {
                setLoadingQuote(true);
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/quotes/${editingQuoteId}`, {
                        headers: {
                            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                        },
                    });
                    if (!res.ok) throw new Error("Erro ao carregar orçamento");
                    const data = await res.json();

                    if (data.customer_id) {
                        setSelectedCustomer({
                            id: data.customer_id,
                            name: data.customer_name,
                            cpf_cnpj: ""
                        });
                    }

                    if (data.seller_id) {
                        const seller = sellers.find(s => s.id === data.seller_id);
                        if (seller) setSelectedSeller(seller);
                    }

                    setDesconto(Number(data.discount));
                    setItems(data.items.map((it: any) => ({
                        product_id: it.product_id,
                        name: it.product_name,
                        quantity: Number(it.quantity),
                        unit_price: Number(it.unit_price),
                        unit: it.product_unit
                    })));

                } catch (err: any) {
                    toast.error(err.message);
                } finally {
                    setLoadingQuote(false);
                }
            };
            fetchQuote();
        }
    }, [editingQuoteId, sellers]);

    const handleSelectSeller = (seller: any) => {
        setSelectedSeller(seller);
        setOpenSellerSearch(false);
    };

    // Helper to add item with suffix/multiplier
    const finalizeAddItem = (product: any, label: string, price: number, quantity: number) => {
        const isBox = label !== "Unidade";
        const suffix = isBox ? `-${label}` : "";
        const displayName = isBox ? `${product.name} (${label})` : product.name;

        const newItem = {
            product_id: product.id + suffix,
            name: displayName,
            code: product.product_code || product.code || '',
            unit: product.unit || 'UN',
            quantity: quantity,
            unit_price: price
        };
        setItems(prev => [...prev, newItem]);
        setSelectedProduct(null);
        setItemQtd(1);
        setItemPrice(0);
        setProductSearchTerm("");
        setOpenProductSearch(false);

        setTimeout(() => {
            productSearchBtnRef.current?.focus();
            setOpenProductSearch(true);
        }, 100);
    };

    const handleSelectProduct = (product: any) => {
        if (product.boxConfigs && product.boxConfigs.length > 0) {
            setFormatDialogPendingQty(1);
            setFormatDialogProduct(product);
            setOpenProductSearch(false);
        } else {
            setSelectedProduct(product);
            setSelectedPriceType(1);
            setItemPrice(Number(product.sale_price) || 0);
            setItemQtd(1);
            setOpenProductSearch(false);
            setProductSearchTerm("");
            setTimeout(() => qtdRef.current?.focus(), 100);
        }
    };

    const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        const raw = ((e.target as HTMLInputElement).value || productSearchTerm).trim();
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

        const exact = products.find(
            (p) =>
                (p.code || '').toLowerCase() === term.toLowerCase() ||
                String(p.product_code || '') === term
        );

        const filtered = products.filter(
            (p) =>
                p.name.toLowerCase().includes(term.toLowerCase()) ||
                (p.code || '').toLowerCase().includes(term.toLowerCase()) ||
                String(p.product_code || '').includes(term)
        );
        const candidate = exact || (filtered.length === 1 ? filtered[0] : null);

        if (candidate) {
            if (candidate.boxConfigs && candidate.boxConfigs.length > 0) {
                setFormatDialogPendingQty(qty);
                setFormatDialogProduct(candidate);
                setOpenProductSearch(false);
                setProductSearchTerm("");
                e.preventDefault();
            } else {
                setSelectedProduct(candidate);
                setSelectedPriceType(1);
                setItemPrice(Number(candidate.sale_price) || 0);
                setItemQtd(qty);
                setProductSearchTerm("");
                setOpenProductSearch(false);
                e.preventDefault();
                setTimeout(() => qtdRef.current?.focus(), 100);
            }
        } else if (filtered.length === 0) {
            toast.error('Nenhum produto encontrado para este código.');
        }
    };

    const handleAddItem = () => {
        if (!selectedProduct) {
            toast.error("Selecione um produto.");
            return;
        }
        if (itemQtd <= 0) {
            toast.error("Quantidade deve ser maior que 0.");
            return;
        }

        const newItem = {
            product_id: selectedProduct.id,
            name: selectedProduct.name,
            code: selectedProduct.product_code || selectedProduct.code || '',
            unit: selectedProduct.unit || 'UN',
            quantity: Number(itemQtd),
            unit_price: Number(itemPrice)
        };

        setItems([...items, newItem]);
        setSelectedProduct(null);
        setItemQtd(1);
        setItemPrice(0);

        setTimeout(() => {
            productSearchBtnRef.current?.focus();
            setOpenProductSearch(true);
        }, 100);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSaveCustomer = async (data: any) => {
        try {
            const res = await addCustomerMutation.mutateAsync(data);
            setSelectedCustomer({ id: res.id, name: data.name, cpf_cnpj: data.cpf_cnpj });
            queryClient.invalidateQueries({ queryKey: ["customers"] });
            setCustomerModalOpen(false);
            toast.success("Cliente cadastrado e selecionado!");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleSaveProduct = async (data: any) => {
        try {
            await saveProductMutation.mutateAsync({ data });
            queryClient.invalidateQueries({ queryKey: ["products-with-configs"] });
            setProductModalOpen(false);
            toast.success("Produto cadastrado com sucesso!");
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleConfirmCheckout = async (payments: any[], confirmCustomerId?: string) => {
        if (!user) {
            toast.error("Usuário não autenticado.");
            return;
        }

        let finalCustomerId = confirmCustomerId === 'none' ? undefined : confirmCustomerId;
        if (!finalCustomerId && selectedCustomer?.id && selectedCustomer.id !== "default") {
            finalCustomerId = selectedCustomer.id;
        }

        const finalCustomerObj = customersList.find(c => c.id === finalCustomerId);
        const finalCustomerName = finalCustomerObj?.name || (finalCustomerId ? "CLIENTE NÃO ENCONTRADO" : (selectedCustomer?.name || "CONSUMIDOR FINAL"));
        const finalCustomerDocument = finalCustomerObj?.cpf_cnpj || selectedCustomer?.cpf_cnpj || "";

        const payload = {
            cart: items.map(it => ({
                id: it.product_id,
                name: it.name,
                price: it.unit_price,
                quantity: it.quantity
            })),
            total,
            payments,
            userId: user.id,
            discount: desconto,
            customerId: finalCustomerId,
            sellerId: selectedSeller?.id,
            quoteId: editingQuoteId || undefined
        };

        try {
            const res = await saveSale.mutateAsync(payload);
            toast.success("Venda salva com sucesso!");
            setLastSaleData({
                saleId: res.id,
                saleNumber: res.sale_number,
                cart: payload.cart,
                total: payload.total,
                discount: payload.discount,
                payments: payload.payments,
                date: new Date(),
                customerName: finalCustomerName,
                customerDocument: finalCustomerDocument
            });
            setReceiptOptionsOpen(true);
            setCheckoutOpen(false);
            setItems([]);
            setDesconto(0);
            setAcrescimo(0);
            setSelectedCustomer({
                id: "default",
                name: "CONSUMIDOR FINAL",
                cpf_cnpj: ""
            });
            setSelectedSeller(null);
        } catch (error: any) {
            toast.error(`Erro ao salvar venda: ${error.message || "Tente novamente"}`);
        }
    };

    const handleOpenCheckout = () => {
        const requireSeller = localStorage.getItem("pdv_require_seller") === "true";
        if (requireSeller && !selectedSeller) {
            toast.error("Por favor, selecione um vendedor para continuar.");
            setOpenSellerSearch(true);
            return;
        }
        if (items.length > 0) setCheckoutOpen(true);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F3') {
                e.preventDefault();
                handleOpenCheckout();
            }
            if (e.key === 'F7') {
                e.preventDefault();
                if (items.length > 0) setQuoteDialogOpen(true);
            }
            if (e.key === 'F8') {
                e.preventDefault();
                setProductModalOpen(true);
            }
            if (e.key === 'F9') {
                e.preventDefault();
                setCustomerModalOpen(true);
            }
            if (e.key === 'F10') {
                e.preventDefault();
                productSearchBtnRef.current?.focus();
                setOpenProductSearch(true);
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                navigate(-1);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items, selectedCustomer, selectedSeller, total, desconto, acrescimo, navigate]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f0f4f8] -m-6 font-sans text-sm">
            {/* Cabeçalho: Cliente / Vendedor */}
            <div className="bg-white m-2 border border-slate-300 rounded shadow-sm p-3 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="w-full sm:w-20 shrink-0">
                        <label className="text-xs text-slate-500 block mb-1">Número</label>
                        <Input readOnly value="AUTO" className="h-8 bg-slate-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <label className="text-xs text-slate-500 block mb-1">Cliente</label>
                        <Popover open={openCustomerSearch} onOpenChange={setOpenCustomerSearch}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-8 bg-white truncate">
                                    <span className="truncate">{selectedCustomer ? selectedCustomer.name : "Selecione o Cliente..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[min(500px,calc(100vw-1rem))] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {customersList.map((customer) => (
                                                <CommandItem key={customer.id} onSelect={() => handleSelectCustomer(customer)}>
                                                    <Check className={cn("mr-2 h-4 w-4 shrink-0", selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0")} />
                                                    {customer.name} - {customer.cpf_cnpj}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex flex-row sm:flex-row gap-2">
                        <div className="flex-1 sm:w-44">
                            <label className="text-xs text-slate-500 block mb-1">Vendedor</label>
                            <Popover open={openSellerSearch} onOpenChange={setOpenSellerSearch}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-8 bg-white">
                                        <span className="truncate">{selectedSeller ? selectedSeller.name : "Vendedor..."}</span>
                                        <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[min(250px,calc(100vw-1rem))] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar vendedor..." />
                                        <CommandList>
                                            <CommandEmpty>Nenhum vendedor encontrado.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem onSelect={() => { setSelectedSeller(null); setOpenSellerSearch(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", !selectedSeller ? "opacity-100" : "opacity-0")} />
                                                    Nenhum
                                                </CommandItem>
                                                {sellers.filter(s => s.active).map((seller) => (
                                                    <CommandItem key={seller.id} value={seller.name} onSelect={() => handleSelectSeller(seller)}>
                                                        <Check className={cn("mr-2 h-4 w-4", selectedSeller?.id === seller.id ? "opacity-100" : "opacity-0")} />
                                                        {seller.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="w-32 hidden sm:block">
                            <label className="text-xs text-slate-500 block mb-1">CPF/CNPJ</label>
                            <Input readOnly value={selectedCustomer?.cpf_cnpj || ""} className="h-8 bg-slate-100" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Dados do produto */}
            <div className="bg-[#eaf1f8] m-2 border border-[#cbd5e1] rounded p-2 pb-4 relative">
                <span className="text-[10px] uppercase font-bold text-slate-500 absolute -top-2 left-4 bg-[#f0f4f8] px-1">Produto</span>
                <div className="flex flex-col sm:flex-row gap-2 items-end mt-1">
                    <div className="flex-1 min-w-0">
                        <label className="text-[11px] text-slate-600 block mb-1">Código / Descrição</label>
                        <Popover open={openProductSearch} onOpenChange={setOpenProductSearch}>
                            <PopoverTrigger asChild>
                                <Button ref={productSearchBtnRef} variant="outline" className="w-full justify-between h-12 text-base text-left font-normal bg-white">
                                    <span className="truncate">{selectedProduct ? `${selectedProduct.product_code || selectedProduct.code || ''} - ${selectedProduct.name}` : "Localizar Produto..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[min(800px,calc(100vw-1rem))] p-0" align="start">
                                <Command shouldFilter={false}>
                                    <CommandInput placeholder="Localizar produto..." value={productSearchTerm} onValueChange={setProductSearchTerm} onKeyDown={handleProductSearchKeyDown} />
                                    <CommandList>
                                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredProducts.map((product) => (
                                                <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)} className="flex items-center px-3 py-2 cursor-pointer gap-2">
                                                    <span className="w-20 text-slate-500 font-mono text-xs truncate shrink-0">{product.product_code || product.code || '--'}</span>
                                                    <span className="flex-1 font-medium text-sm truncate">{product.name}</span>
                                                    <span className="text-xs bg-slate-100 rounded px-1 shrink-0">{product.stock_current ?? 0}</span>
                                                    <span className="text-[10px] font-semibold text-blue-600 shrink-0" onClick={(e) => { e.stopPropagation(); handleSelectProduct(product); setSelectedPriceType(1); setItemPrice(Number(product.sale_price) || 0); }}>
                                                        R$ {Number(product.sale_price).toFixed(2)}
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {selectedProduct && (
                        <div className="flex gap-1 shrink-0">
                            <button onClick={() => { setSelectedPriceType(1); setItemPrice(selectedProduct.sale_price); }}
                                className={`h-12 px-3 flex flex-col items-center justify-center text-xs font-bold rounded border transition-all ${selectedPriceType === 1 ? 'bg-blue-600 text-white border-blue-700' : 'bg-white border-slate-300 text-slate-700'}`}>
                                <span>P1</span>
                                <span className="text-[10px]">R$ {Number(selectedProduct.sale_price).toFixed(2)}</span>
                            </button>
                            <button onClick={() => { setSelectedPriceType(2); setItemPrice(Number(selectedProduct.sale_price2) || 0); }}
                                className={`h-12 px-3 flex flex-col items-center justify-center text-xs font-bold rounded border transition-all ${selectedPriceType === 2 ? 'bg-orange-500 text-white border-orange-600' : 'bg-white border-slate-300 text-slate-700'}`}>
                                <span>P2</span>
                                <span className="text-[10px]">R$ {Number(selectedProduct.sale_price2 || 0).toFixed(2)}</span>
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2 w-full sm:w-auto">
                        <div className="flex-1 sm:w-24">
                            <label className="text-[11px] text-slate-600 block mb-1">Qtd</label>
                            <Input ref={qtdRef} type="number" step="0.001" className="h-12 text-lg text-right" value={itemQtd} onChange={(e) => setItemQtd(Number(e.target.value))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Enter' && priceRef.current?.focus()} />
                        </div>
                        <div className="flex-1 sm:w-28">
                            <label className="text-[11px] text-slate-600 block mb-1">Preço R$</label>
                            <Input ref={priceRef} type="number" step="0.01"
                                className={cn("h-12 text-lg text-right", selectedProduct && !selectedProduct.can_change_price && "bg-slate-100 cursor-not-allowed")}
                                value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))}
                                onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                readOnly={selectedProduct && !selectedProduct.can_change_price} />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={handleAddItem} className="h-12 px-5 bg-blue-600 text-white font-bold">ADD</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabela de itens */}
            <div className="flex-1 bg-white m-2 border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#c2e0c6] border-b border-slate-400">
                            <tr>
                                <th className="p-2 text-left w-8 hidden sm:table-cell">#</th>
                                <th className="p-2 text-left">Descrição</th>
                                <th className="p-2 text-right w-14">Qtd</th>
                                <th className="p-2 text-right w-20 hidden sm:table-cell">Preço</th>
                                <th className="p-2 text-right w-20">Total</th>
                                <th className="p-2 text-center w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, idx) => (
                                <tr key={idx} className="border-b hover:bg-slate-50">
                                    <td className="p-2 hidden sm:table-cell">{idx + 1}</td>
                                    <td className="p-2">
                                        <span className="block">{it.name}</span>
                                        <span className="text-xs text-slate-400 sm:hidden">{it.unit_price.toFixed(2)} × {it.quantity.toFixed(3)}</span>
                                    </td>
                                    <td className="p-2 text-right">{it.quantity.toFixed(3)}</td>
                                    <td className="p-2 text-right hidden sm:table-cell">{it.unit_price.toFixed(2)}</td>
                                    <td className="p-2 text-right font-semibold">{(it.quantity * it.unit_price).toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-500 font-bold px-2">✕</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totais */}
            <div className="bg-[#f8fafc] mx-2 px-3 py-2 border-t text-sm space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1 items-center justify-between">
                    <span className="font-bold text-slate-700">SUBTOTAL: R$ {subtotal.toFixed(2)}</span>
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="font-bold text-slate-600 text-xs">DESC %</span>
                        <Input type="number" step="0.01" className="w-16 h-8 text-right font-bold text-red-600"
                            value={descontoPerc} onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                                const p = Number(e.target.value);
                                if (user?.max_discount !== undefined && p > user.max_discount) { toast.error(`Limite: ${user.max_discount}%`); return; }
                                setDescontoPerc(p);
                                if (subtotal > 0) setDesconto(Number((subtotal * (p / 100)).toFixed(2)));
                            }} />
                        <span className="font-bold text-slate-600 text-xs">R$</span>
                        <Input type="number" step="0.01" className="w-20 h-8 text-right font-bold text-red-600"
                            value={desconto} onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                                const v = Number(e.target.value);
                                const p = subtotal > 0 ? (v / subtotal) * 100 : 0;
                                if (user?.max_discount !== undefined && p > user.max_discount) { toast.error(`Limite: ${user.max_discount}%`); return; }
                                setDesconto(v);
                                if (subtotal > 0) setDescontoPerc(Number(((v / subtotal) * 100).toFixed(2)));
                            }} />
                        <span className="font-bold text-lg text-green-700">TOTAL: R$ {total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Botões de ação */}
            <div className="bg-[#475569] p-2 flex flex-wrap gap-2 justify-between items-center">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setProductModalOpen(true)} className="bg-[#3b82f6] text-white text-xs sm:text-sm h-9">
                        <Package className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">F8 |</span> Produtos
                    </Button>
                    <Button onClick={() => setCustomerModalOpen(true)} className="bg-[#3b82f6] text-white text-xs sm:text-sm h-9">
                        <Users className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">F9 |</span> Pessoas
                    </Button>
                    <Button onClick={() => { if (items.length === 0) { toast.error("Adicione itens."); return; } setQuoteDialogOpen(true); }}
                        className="bg-[#3b82f6] text-white text-xs sm:text-sm h-9">
                        <FileText className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Orçamento</span>
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleOpenCheckout} className="bg-green-600 text-white h-9 px-4 sm:px-8" disabled={items.length === 0}>
                        <CheckCircle className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Finalizar (F3)</span><span className="sm:hidden">OK</span>
                    </Button>
                    <Button onClick={() => navigate(-1)} className="bg-red-600 text-white hover:bg-red-700 h-9">
                        <XCircle className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Cancelar</span>
                    </Button>
                </div>
            </div>

            <CustomerFormDialog
                open={customerModalOpen}
                onOpenChange={setCustomerModalOpen}
                onSave={handleSaveCustomer}
            />
            <ProductFormDialog
                open={productModalOpen}
                onOpenChange={setProductModalOpen}
                title="Novo Produto"
                onSave={handleSaveProduct}
            />
            <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} total={total} onConfirm={handleConfirmCheckout} />
            <ReceiptOptionsDialog
                open={receiptOptionsOpen}
                onOpenChange={setReceiptOptionsOpen}
                onEmitNFCe={async () => {
                    if (lastSaleData?.saleId) {
                        const promise = emitFiscal.mutateAsync({ saleId: lastSaleData.saleId, model: '65' });
                        toast.promise(promise, {
                            loading: "Transmitindo NFC-e para a SEFAZ...",
                            success: "NFC-e autorizada com sucesso!",
                            error: (err) => err.message || "Erro ao emitir NFC-e"
                        });

                        try {
                            const res = await promise;
                            if (res && res.chave) {
                                printReceipt({
                                    ...lastSaleData,
                                    fiscal: {
                                        id: res.noteId,
                                        tipo: 'NFCE',
                                        numero: res.nNF,
                                        serie: res.serie,
                                        chave: res.chave,
                                        protocolo: res.protocol,
                                        status: 'generated',
                                        fiscal_date: new Date().toISOString(),
                                        qrCode: res.qrCode,
                                        urlConsulta: res.urlConsulta
                                    }
                                });
                            }
                        } catch (e) {
                            console.error("Erro na impressão automática:", e);
                        }
                    }
                    setReceiptOptionsOpen(false);
                }}
                onPrintReceipt={() => {
                    if (lastSaleData) {
                        printReceipt(lastSaleData);
                    }
                    setReceiptOptionsOpen(false);
                }}
                onPrintA4={() => {
                    if (lastSaleData) {
                        printReceiptA4(lastSaleData);
                    }
                    setReceiptOptionsOpen(false);
                }}
                onWhatsApp={async () => {
                    if (lastSaleData) {
                        const url = await getWhatsappUrl(lastSaleData);
                        window.open(url, '_blank');
                    }
                    setReceiptOptionsOpen(false);
                }}
            />

            <QuoteDialog
                open={quoteDialogOpen}
                onOpenChange={setQuoteDialogOpen}
                items={items}
                total={total}
                discount={desconto}
                customerName={selectedCustomer?.name || "CONSUMIDOR FINAL"}
                customerDocument={selectedCustomer?.cpf_cnpj || ""}
                customerId={selectedCustomer?.id}
                sellerId={selectedSeller?.id}
                quoteId={editingQuoteId}
            />

            {formatDialogProduct && (
                <SaleFormatDialog
                    open={!!formatDialogProduct}
                    onOpenChange={(open) => !open && setFormatDialogProduct(null)}
                    productName={formatDialogProduct.name}
                    unitPrice={formatDialogProduct.sale_price}
                    boxConfigs={formatDialogProduct.boxConfigs}
                    formatCurrency={(v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v)}
                    onSelect={(label, price) => { finalizeAddItem(formatDialogProduct, label, price, formatDialogPendingQty); setFormatDialogProduct(null); }}
                />
            )}
        </div>
    );
}
