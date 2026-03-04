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
import { Check, ChevronsUpDown, Package, Users, Save, CheckCircle, XCircle } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useSaveSale } from "@/hooks/useSaveSale";
import { useAuth } from "@/hooks/useAuth";
import { CustomerFormDialog } from "@/components/clientes/CustomerFormDialog";
import { printReceipt, getWhatsappUrl } from "@/utils/printReceipt";
import { ProductFormDialog } from "@/components/produtos/ProductFormDialog";
import { CheckoutDialog } from "@/components/pdv/CheckoutDialog";
import { ReceiptOptionsDialog } from "@/components/pdv/ReceiptOptionsDialog";
import { useFiscal } from "@/hooks/useFiscal";
import { cn } from "@/lib/utils";

export default function NovaVenda() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: products = [] } = useProducts();
    const { data: customersList = [] } = useCustomers();
    const saveSale = useSaveSale();
    const emitFiscal = useFiscal();

    const [openCustomerSearch, setOpenCustomerSearch] = useState(false);
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

    const [items, setItems] = useState<any[]>([]);
    const [desconto, setDesconto] = useState<number>(0);
    const [acrescimo, setAcrescimo] = useState<number>(0);

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

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        setItemPrice(Number(product.sale_price) || 0);
        setItemQtd(1);
        setOpenProductSearch(false);
        setProductSearchTerm("");
        setTimeout(() => qtdRef.current?.focus(), 100);
    };

    // Barcode scan: when Enter pressed in product search, supports "QTY*CODE" format (e.g. 10*7891234)
    const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return;
        // Read directly from DOM to avoid stale state
        const raw = ((e.target as HTMLInputElement).value || productSearchTerm).trim();
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

        const filtered = products.filter(
            (p) =>
                p.name.toLowerCase().includes(term.toLowerCase()) ||
                (p.code || '').toLowerCase().includes(term.toLowerCase()) ||
                String(p.product_code || '').includes(term)
        );
        const candidate = exact || (filtered.length === 1 ? filtered[0] : null);

        if (candidate) {
            const newItem = {
                product_id: candidate.id,
                name: candidate.name,
                code: candidate.product_code || candidate.code || '',
                unit: candidate.unit || 'UN',
                quantity: qty,
                unit_price: Number(candidate.sale_price)
            };
            setItems(prev => [...prev, newItem]);
            setSelectedProduct(null);
            setItemQtd(1);
            setItemPrice(0);
            setProductSearchTerm("");
            setOpenProductSearch(false);
            toast.success(`${qty}x ${candidate.name} adicionado!`);
            e.preventDefault();
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

        // Reset product input
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
            customerId: finalCustomerId
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
        } catch (error: any) {
            toast.error(`Erro ao salvar venda: ${error.message || "Tente novamente"}`);
        }
    };

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Disabled F2 
            if (e.key === 'F3') {
                e.preventDefault();
                if (items.length > 0) {
                    setCheckoutOpen(true);
                }
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
    }, [items, selectedCustomer, total, desconto, acrescimo]);

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f0f4f8] -m-6 font-sans text-sm">
            {/* Cabecalho Cliente */}
            <div className="bg-white m-2 border border-slate-300 rounded shadow-sm p-4 space-y-3">
                <div className="flex gap-4">
                    <div className="w-24">
                        <label className="text-xs text-slate-500 block mb-1">Número</label>
                        <Input readOnly value="AUTO" className="h-8 bg-slate-100" />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-slate-500 block mb-1">Razão Social ou CNPJ/CPF</label>
                        <Popover open={openCustomerSearch} onOpenChange={setOpenCustomerSearch}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openCustomerSearch}
                                    className="w-full justify-between h-8 text-left font-normal bg-white"
                                >
                                    {selectedCustomer ? selectedCustomer.name : "Selecione o Cliente..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar cliente por nome ou doc..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {customersList.map((customer) => (
                                                <CommandItem
                                                    key={customer.id}
                                                    value={`${customer.name} ${customer.cpf_cnpj}`}
                                                    keywords={[customer.name, customer.cpf_cnpj || '']}
                                                    onSelect={() => handleSelectCustomer(customer)}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {customer.name} - {customer.cpf_cnpj}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="w-48">
                        <label className="text-xs text-slate-500 block mb-1">CPF/CNPJ</label>
                        <Input readOnly value={selectedCustomer?.cpf_cnpj || ""} className="h-8 bg-slate-100" />
                    </div>
                </div>

            </div>

            {/* Painel de Produto */}
            <div className="bg-[#eaf1f8] m-2 border border-[#cbd5e1] rounded p-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 absolute -mt-4 bg-[#f0f4f8] px-1">Dados do produto</span>
                <div className="flex gap-2 items-end mt-1">
                    <div className="flex-1 border-r border-slate-300 pr-2">
                        <label className="text-[11px] text-slate-600 block mb-1">F10 Código | Código de Barras | Descrição | Referência</label>
                        <Popover open={openProductSearch} onOpenChange={setOpenProductSearch}>
                            <PopoverTrigger asChild>
                                <Button
                                    ref={productSearchBtnRef}
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={openProductSearch}
                                    className="w-full justify-between h-9 text-left font-normal bg-white"
                                >
                                    {selectedProduct ? `${selectedProduct.product_code || selectedProduct.code || ''} - ${selectedProduct.name}` : "Localizar Produto..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[600px] p-0" align="start">
                                <Command shouldFilter={false}>
                                    <CommandInput
                                        placeholder="Código de barras, código ou nome do produto..."
                                        value={productSearchTerm}
                                        onValueChange={setProductSearchTerm}
                                        onKeyDown={handleProductSearchKeyDown}
                                    />
                                    <CommandList>
                                        {filteredProducts.length > 0 && (
                                            <>
                                                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                                <CommandGroup>
                                                    {filteredProducts.map((product) => (
                                                        <CommandItem
                                                            key={product.id}
                                                            value={`${product.product_code || product.code || ''} ${product.name}`}
                                                            keywords={[String(product.product_code || ''), product.code || '', product.name]}
                                                            onSelect={() => handleSelectProduct(product)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    selectedProduct?.id === product.id ? "opacity-100" : "opacity-0"
                                                                )}
                                                            />
                                                            {(product.product_code || product.code) && <span className="mr-2 text-slate-400">[{product.product_code || product.code}]</span>}
                                                            {product.name} - R$ {Number(product.sale_price).toFixed(2)}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </>
                                        )}
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="w-24">
                        <label className="text-[11px] text-center text-slate-600 block mb-1">Quantidade</label>
                        <Input
                            ref={qtdRef}
                            type="number"
                            min="0.001"
                            step="0.001"
                            className="h-9 text-right"
                            value={itemQtd}
                            onChange={(e) => setItemQtd(Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    priceRef.current?.focus();
                                }
                            }}
                        />
                    </div>
                    <div className="w-28">
                        <label className="text-[11px] text-center text-slate-600 block mb-1">Preço R$</label>
                        <Input
                            ref={priceRef}
                            type="number"
                            step="0.01"
                            className="h-9 text-right"
                            value={itemPrice}
                            onChange={(e) => setItemPrice(Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addBtnRef.current?.focus();
                                }
                            }}
                        />
                    </div>
                    <div className="w-32">
                        <label className="text-[11px] text-center text-slate-600 block mb-1">Total</label>
                        <div className="h-9 flex items-center justify-end px-3 bg-white border rounded shadow-inner text-lg font-mono">
                            {(itemQtd * itemPrice).toFixed(2).replace('.', ',')}
                        </div>
                    </div>
                    <Button
                        ref={addBtnRef}
                        onClick={handleAddItem}
                        className="h-9 px-6 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // Add is automatically triggered by onClick when Enter is pressed on a focused button, 
                                // but we can make sure the search button gets focus after.
                            }
                        }}
                    >
                        ADD
                    </Button>
                </div>
            </div>

            {/* Listagem de itens */}
            <div className="flex-1 bg-white m-2 border border-slate-300 rounded shadow-sm flex flex-col overflow-hidden">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[#c2e0c6] border-y border-slate-400">
                            <tr>
                                <th className="p-1 px-4 text-left border-r border-slate-400/30 w-16">Item</th>
                                <th className="p-1 px-4 text-left border-r border-slate-400/30 w-32">Código</th>
                                <th className="p-1 px-4 text-left border-r border-slate-400/30">Descrição</th>
                                <th className="p-1 px-4 text-right border-r border-slate-400/30 w-24">Qtd</th>
                                <th className="p-1 px-4 text-center border-r border-slate-400/30 w-16">Und.</th>
                                <th className="p-1 px-4 text-right border-r border-slate-400/30 w-32">Preço R$</th>
                                <th className="p-1 px-4 text-right w-32">Total R$</th>
                                <th className="p-1 w-12">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((it, idx) => (
                                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-1 px-4 border-r border-slate-200">{idx + 1}</td>
                                    <td className="p-1 px-4 border-r border-slate-200">{it.code}</td>
                                    <td className="p-1 px-4 border-r border-slate-200">{it.name}</td>
                                    <td className="p-1 px-4 border-r border-slate-200 text-right">{it.quantity.toFixed(3)}</td>
                                    <td className="p-1 px-4 border-r border-slate-200 text-center">{it.unit}</td>
                                    <td className="p-1 px-4 border-r border-slate-200 text-right">{it.unit_price.toFixed(2).replace('.', ',')}</td>
                                    <td className="p-1 px-4 text-right font-semibold">{(it.quantity * it.unit_price).toFixed(2).replace('.', ',')}</td>
                                    <td className="p-1 text-center">
                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">X</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totais de Revisor */}
            <div className="bg-[#f8fafc] mx-2 px-4 py-3 flex justify-between items-center text-sm border-t border-slate-300">
                <div className="flex gap-4 items-center">
                    <div className="font-bold text-slate-600">
                        SUBTOTAL | <span className="text-black ml-2 font-mono text-lg">{subtotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
                <div className="flex gap-8 items-center">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600 text-xs">DESCONTO %</span>
                        <Input className="w-16 h-7 text-right bg-white" placeholder="0,00" />
                        <span className="font-bold text-slate-600 text-xs">R$</span>
                        <Input
                            className="w-20 h-7 text-right bg-white"
                            type="number"
                            value={desconto}
                            onChange={(e) => setDesconto(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-600 text-xs">ACRÉSCIMO %</span>
                        <Input className="w-16 h-7 text-right bg-white" placeholder="0,00" />
                        <span className="font-bold text-slate-600 text-xs">R$</span>
                        <Input
                            className="w-20 h-7 text-right bg-white"
                            type="number"
                            value={acrescimo}
                            onChange={(e) => setAcrescimo(Number(e.target.value))}
                        />
                    </div>
                    <div className="flex items-center gap-2 font-bold text-xl">
                        TOTAL | <span className="font-mono text-2xl">{total.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            </div>

            {/* Footer Botoes ERP */}
            <div className="bg-[#475569] p-3 shadow-inner flex justify-between items-center">
                <div className="flex gap-4">
                    <Button onClick={() => setProductModalOpen(true)} variant="secondary" className="bg-[#52525b] hover:bg-[#3f3f46] text-white border-none gap-2 px-6 h-12 text-lg">
                        <Package className="text-yellow-500 h-5 w-5" /> F8 | Produtos
                    </Button>
                    <Button onClick={() => setCustomerModalOpen(true)} variant="secondary" className="bg-[#52525b] hover:bg-[#3f3f46] text-white border-none gap-2 px-6 h-12 text-lg">
                        <Users className="text-purple-400 h-5 w-5" /> F9 | Pessoas
                    </Button>
                </div>

                <div className="flex gap-4">
                    <Button
                        onClick={() => setCheckoutOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold h-12 px-12 text-lg rounded shadow uppercase tracking-wider"
                        disabled={items.length === 0}
                    >
                        <Save className="mr-2 h-6 w-6" /> Finalizar Venda (F3)
                    </Button>
                    <Button
                        onClick={() => navigate(-1)}
                        variant="outline"
                        className="h-12 px-8 text-lg bg-black/20 text-white border-none hover:bg-black/40 hover:text-red-400"
                    >
                        <XCircle className="mr-2 h-5 w-5" /> Cancelar (ESC)
                    </Button>
                </div>
            </div>

            {/* Modals para Cadastros Rápidos */}
            <CustomerFormDialog
                open={customerModalOpen}
                onOpenChange={setCustomerModalOpen}
                onSave={() => setCustomerModalOpen(false)}
            />

            <ProductFormDialog
                open={productModalOpen}
                onOpenChange={setProductModalOpen}
                onSave={() => setProductModalOpen(false)}
                title={""} />

            <CheckoutDialog
                open={checkoutOpen}
                onOpenChange={setCheckoutOpen}
                total={total}
                onConfirm={handleConfirmCheckout}
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
        </div>
    );
}
