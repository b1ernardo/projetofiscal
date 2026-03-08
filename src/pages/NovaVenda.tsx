import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { printReceipt, getWhatsappUrl } from "@/utils/printReceipt";
import { ProductFormDialog } from "@/components/produtos/ProductFormDialog";
import { CheckoutDialog } from "@/components/pdv/CheckoutDialog";
import { ReceiptOptionsDialog } from "@/components/pdv/ReceiptOptionsDialog";
import { SaleFormatDialog } from "@/components/pdv/SaleFormatDialog";
import { useFiscal } from "@/hooks/useFiscal";
import { cn } from "@/lib/utils";

export default function NovaVenda() {
    const navigate = useNavigate();
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
    const [acrescimo, setAcrescimo] = useState<number>(0);

    const [formatDialogProduct, setFormatDialogProduct] = useState<any>(null);
    const [formatDialogPendingQty, setFormatDialogPendingQty] = useState<number>(1);

    const filteredProducts = useMemo(() => {
        let term = productSearchTerm.toLowerCase();
        const starMatch = productSearchTerm.match(/^([\d.,]+)\s*\*\s*(.*)$/);
        if (starMatch) {
            term = starMatch[2].toLowerCase().trim();
        }

        if (!term) return [];

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
        } else if (Number(product.sale_price2) > 0) {
            setSelectedProduct(product);
            setSelectedPriceType(1);
            setItemPrice(Number(product.sale_price) || 0);
            setItemQtd(1);
            setOpenProductSearch(false);
            setProductSearchTerm("");
            setTimeout(() => qtdRef.current?.focus(), 100);
        } else {
            finalizeAddItem(product, "Unidade", Number(product.sale_price) || 0, 1);
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
            } else if (Number(candidate.sale_price2) > 0) {
                setSelectedProduct(candidate);
                setSelectedPriceType(1);
                setItemPrice(Number(candidate.sale_price) || 0);
                setItemQtd(qty);
                setProductSearchTerm("");
                setOpenProductSearch(false);
                e.preventDefault();
                setTimeout(() => qtdRef.current?.focus(), 100);
            } else {
                finalizeAddItem(candidate, "Unidade", Number(candidate.sale_price) || 0, qty);
                e.preventDefault();
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
            sellerId: selectedSeller?.id
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
                date: new Date()
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
            <div className="bg-white m-2 border border-slate-300 rounded shadow-sm p-4 space-y-3">
                <div className="flex gap-4">
                    <div className="w-24">
                        <label className="text-xs text-slate-500 block mb-1">Número</label>
                        <Input readOnly value="AUTO" className="h-8 bg-slate-100" />
                    </div>
                    <div className="flex-[2]">
                        <label className="text-xs text-slate-500 block mb-1">Razão Social ou CNPJ/CPF</label>
                        <Popover open={openCustomerSearch} onOpenChange={setOpenCustomerSearch}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-8 bg-white">
                                    {selectedCustomer ? selectedCustomer.name : "Selecione o Cliente..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar cliente..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {customersList.map((customer) => (
                                                <CommandItem key={customer.id} onSelect={() => handleSelectCustomer(customer)}>
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
                    <div className="flex-1 max-w-[250px]">
                        <label className="text-xs text-slate-500 block mb-1">Vendedor</label>
                        <Popover open={openSellerSearch} onOpenChange={setOpenSellerSearch}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-8 bg-white">
                                    {selectedSeller ? selectedSeller.name : "Selecione o Vendedor..."}
                                    <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[250px] p-0" align="start">
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
                                                <CommandItem
                                                    key={seller.id}
                                                    value={seller.name}
                                                    onSelect={() => handleSelectSeller(seller)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedSeller?.id === seller.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {seller.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="w-40">
                        <label className="text-xs text-slate-500 block mb-1">CPF/CNPJ</label>
                        <Input readOnly value={selectedCustomer?.cpf_cnpj || ""} className="h-8 bg-slate-100" />
                    </div>
                </div>
            </div>

            <div className="bg-[#eaf1f8] m-2 border border-[#cbd5e1] rounded p-2 pb-5 relative">
                <span className="text-[10px] uppercase font-bold text-slate-500 absolute -top-2 left-4 bg-[#f0f4f8] px-1">Dados do produto</span>
                <div className="flex gap-2 items-end mt-1">
                    <div className="flex-1 border-r border-slate-300 pr-2">
                        <label className="text-[11px] text-slate-600 block mb-1">F10 Código | Código de Barras | Descrição | Referência</label>
                        <Popover open={openProductSearch} onOpenChange={setOpenProductSearch}>
                            <PopoverTrigger asChild>
                                <Button ref={productSearchBtnRef} variant="outline" className="w-full justify-between h-12 text-lg text-left font-normal bg-white">
                                    {selectedProduct ? `${selectedProduct.product_code || selectedProduct.code || ''} - ${selectedProduct.name}` : "Localizar Produto..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[800px] p-0" align="start">
                                <Command shouldFilter={false}>
                                    <CommandInput placeholder="Localizar produto..." value={productSearchTerm} onValueChange={setProductSearchTerm} onKeyDown={handleProductSearchKeyDown} />
                                    <CommandList>
                                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredProducts.map((product) => (
                                                <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)} className="flex items-center px-4 py-2 cursor-pointer">
                                                    <span className="w-24 text-slate-500 font-mono text-xs truncate mr-2">{product.product_code || product.code || '--'}</span>
                                                    <span className="flex-1 font-medium text-sm truncate mr-2">{product.name}</span>
                                                    <span className="w-16 text-right text-xs bg-slate-100 rounded px-1">{product.stock_current ?? 0}</span>
                                                    <span className="w-24 text-right text-xs font-semibold text-slate-700">R$ {product.sale_price.toFixed(2)}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {selectedProduct && (
                        <div className="flex flex-col">
                            <label className="text-[11px] text-slate-600 block mb-1">Tabela</label>
                            <div className="flex gap-1 h-12">
                                <button onClick={() => { setSelectedPriceType(1); setItemPrice(selectedProduct.sale_price); }} className={`h-12 px-3 text-sm font-bold rounded border ${selectedPriceType === 1 ? 'bg-blue-600 text-white' : 'bg-white'}`}>P1</button>
                                <button onClick={() => { setSelectedPriceType(2); setItemPrice(selectedProduct.sale_price2); }} disabled={!selectedProduct.sale_price2} className={`h-12 px-3 text-sm font-bold rounded border ${selectedPriceType === 2 ? 'bg-orange-500 text-white' : 'bg-white'}`}>P2</button>
                            </div>
                        </div>
                    )}

                    <div className="w-24">
                        <label className="text-[11px] text-center text-slate-600 block mb-1">Quantidade</label>
                        <Input ref={qtdRef} type="number" step="0.001" className="h-12 text-lg text-right" value={itemQtd} onChange={(e) => setItemQtd(Number(e.target.value))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Enter' && priceRef.current?.focus()} />
                    </div>
                    <div className="w-28">
                        <label className="text-[11px] text-center text-slate-600 block mb-1">Preço R$</label>
                        <Input ref={priceRef} type="number" step="0.01" className="h-12 text-lg text-right" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === 'Enter' && handleAddItem()} />
                    </div>
                    <Button onClick={handleAddItem} className="h-12 px-6 bg-blue-600 text-white font-bold">ADD</Button>
                </div>
            </div>

            <div className="flex-1 bg-white m-2 border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#c2e0c6] border-b border-slate-400">
                            <tr>
                                <th className="p-2 text-left w-12">Item</th>
                                <th className="p-2 text-left">Descrição</th>
                                <th className="p-2 text-right">Qtd</th>
                                <th className="p-2 text-right">Preço R$</th>
                                <th className="p-2 text-right">Total R$</th>
                                <th className="p-2 text-center w-12">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, idx) => (
                                <tr key={idx} className="border-b hover:bg-slate-50">
                                    <td className="p-2">{idx + 1}</td>
                                    <td className="p-2">{it.name}</td>
                                    <td className="p-2 text-right">{it.quantity.toFixed(3)}</td>
                                    <td className="p-2 text-right">{it.unit_price.toFixed(2)}</td>
                                    <td className="p-2 text-right font-semibold">{(it.quantity * it.unit_price).toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-500 font-bold px-2">X</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-[#f8fafc] mx-2 px-4 py-3 flex justify-between items-center text-sm border-t">
                <div className="font-bold">SUBTOTAL | {subtotal.toFixed(2)}</div>
                <div className="flex gap-4 items-center font-bold">
                    <span>TOTAL | <span className="text-xl">{total.toFixed(2)}</span></span>
                </div>
            </div>

            <div className="bg-[#475569] p-3 flex justify-between items-center">
                <div className="flex gap-2">
                    <Button onClick={() => setProductModalOpen(true)} className="bg-[#52525b] text-white">F8 | Produtos</Button>
                    <Button onClick={() => setCustomerModalOpen(true)} className="bg-[#52525b] text-white">F9 | Pessoas</Button>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleOpenCheckout} className="bg-green-600 text-white px-8" disabled={items.length === 0}>Finalizar (F3)</Button>
                    <Button onClick={() => navigate(-1)} variant="outline" className="text-white border-white hover:bg-white/20">Cancelar (ESC)</Button>
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
