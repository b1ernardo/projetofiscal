import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Save, XCircle } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useSavePurchase } from "@/hooks/useSavePurchase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function NovaCompra() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: products = [] } = useProducts();
    const { data: suppliers = [] } = useSuppliers();
    const savePurchase = useSavePurchase();

    const [openSupplierSearch, setOpenSupplierSearch] = useState(false);
    const [openProductSearch, setOpenProductSearch] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState("");

    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [itemQtd, setItemQtd] = useState<number>(1);
    const [itemPrice, setItemPrice] = useState<number>(0);
    const [items, setItems] = useState<any[]>([]);

    const filteredProducts = useMemo(() => {
        const term = productSearchTerm.toLowerCase();
        if (!term) return products.slice(0, 10);
        return products.filter((p) =>
            p.name.toLowerCase().includes(term) ||
            (p.code || "").toLowerCase().includes(term) ||
            String(p.product_code || "").includes(term)
        ).slice(0, 50);
    }, [products, productSearchTerm]);

    const qtdRef = useRef<HTMLInputElement>(null);
    const priceRef = useRef<HTMLInputElement>(null);
    const productSearchBtnRef = useRef<HTMLButtonElement>(null);

    const total = items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);

    const handleSelectProduct = (product: any) => {
        setSelectedProduct(product);
        setItemPrice(Number(product.cost_price) || 0);
        setItemQtd(1);
        setOpenProductSearch(false);
        setProductSearchTerm("");
        setTimeout(() => qtdRef.current?.focus(), 100);
    };

    const handleAddItem = () => {
        if (!selectedProduct) { toast.error("Selecione um produto."); return; }
        if (itemQtd <= 0) { toast.error("Quantidade deve ser maior que 0."); return; }
        const newItem = {
            product_id: selectedProduct.id,
            name: selectedProduct.name,
            code: selectedProduct.product_code || selectedProduct.code || "",
            quantity: Number(itemQtd),
            unit_price: Number(itemPrice),
        };
        setItems([...items, newItem]);
        setSelectedProduct(null);
        setItemQtd(1);
        setItemPrice(0);
        setTimeout(() => { productSearchBtnRef.current?.focus(); setOpenProductSearch(true); }, 100);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleSave = async () => {
        if (!selectedSupplier) { toast.error("Selecione um fornecedor."); return; }
        if (items.length === 0) { toast.error("Adicione pelo menos um item."); return; }
        const payload = {
            supplier_id: selectedSupplier.id,
            items: items.map(it => ({ product_id: it.product_id, quantity: it.quantity, unit_price: it.unit_price })),
            total_amount: total,
        };
        try {
            await savePurchase.mutateAsync(payload);
            toast.success("Compra registrada com sucesso!");
            navigate("/compras");
        } catch (error: any) {
            toast.error(`Erro ao salvar compra: ${error.message}`);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-[#f0f4f8] -m-6 font-sans text-sm">

            {/* Fornecedor */}
            <div className="bg-white m-2 border border-slate-300 rounded shadow-sm p-4 space-y-3">
                <div className="flex gap-4">
                    <div className="flex-[2]">
                        <label className="text-xs text-slate-500 block mb-1">Fornecedor</label>
                        <Popover open={openSupplierSearch} onOpenChange={setOpenSupplierSearch}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-8 bg-white">
                                    {selectedSupplier ? selectedSupplier.name : "Selecione o Fornecedor..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar fornecedor..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {suppliers.map((s: any) => (
                                                <CommandItem key={s.id} onSelect={() => { setSelectedSupplier(s); setOpenSupplierSearch(false); }}>
                                                    <Check className={cn("mr-2 h-4 w-4", selectedSupplier?.id === s.id ? "opacity-100" : "opacity-0")} />
                                                    {s.name} - {s.cnpj}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="w-40">
                        <label className="text-xs text-slate-500 block mb-1">CNPJ</label>
                        <Input readOnly value={selectedSupplier?.cnpj || ""} className="h-8 bg-slate-100" />
                    </div>
                </div>
            </div>

            {/* Produto */}
            <div className="bg-[#eaf1f8] m-2 border border-[#cbd5e1] rounded p-2 pb-5 relative">
                <span className="text-[10px] uppercase font-bold text-slate-500 absolute -top-2 left-4 bg-[#f0f4f8] px-1">Dados do produto</span>
                <div className="flex gap-2 items-end mt-1">
                    <div className="flex-1">
                        <label className="text-[11px] text-slate-600 block mb-1">Produto (Nome ou Código)</label>
                        <Popover open={openProductSearch} onOpenChange={setOpenProductSearch}>
                            <PopoverTrigger asChild>
                                <Button ref={productSearchBtnRef} variant="outline" className="w-full justify-between h-10 text-left font-normal bg-white">
                                    {selectedProduct
                                        ? `${selectedProduct.product_code || selectedProduct.code || ""} - ${selectedProduct.name}`
                                        : "Localizar Produto..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[600px] p-0" align="start">
                                <Command shouldFilter={false}>
                                    <CommandInput placeholder="Localizar produto..." value={productSearchTerm} onValueChange={setProductSearchTerm} />
                                    <CommandList>
                                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {filteredProducts.map((product) => (
                                                <CommandItem key={product.id} onSelect={() => handleSelectProduct(product)} className="flex items-center px-4 py-2 cursor-pointer">
                                                    <span className="w-24 text-slate-500 font-mono text-xs truncate mr-2">{product.product_code || product.code || "--"}</span>
                                                    <span className="flex-1 font-medium text-sm truncate mr-2">{product.name}</span>
                                                    <span className="w-20 text-right text-xs bg-slate-100 rounded px-1">R$ {Number(product.cost_price || 0).toFixed(2)}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="w-24">
                        <label className="text-[11px] text-center text-slate-600 block mb-1">Quantidade</label>
                        <Input ref={qtdRef} type="number" step="0.001" className="h-10 text-right" value={itemQtd} onChange={(e) => setItemQtd(Number(e.target.value))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === "Enter" && priceRef.current?.focus()} />
                    </div>
                    <div className="w-28">
                        <label className="text-[11px] text-center text-slate-600 block mb-1">Preço Custo R$</label>
                        <Input ref={priceRef} type="number" step="0.01" className="h-10 text-right" value={itemPrice} onChange={(e) => setItemPrice(Number(e.target.value))} onFocus={(e) => e.target.select()} onKeyDown={(e) => e.key === "Enter" && handleAddItem()} />
                    </div>
                    <Button onClick={handleAddItem} className="h-10 px-6 bg-blue-600 text-white font-bold">ADD</Button>
                </div>
            </div>

            {/* Tabela */}
            <div className="flex-1 bg-white m-2 border border-slate-300 rounded shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#cbd5e1] border-b border-slate-400">
                            <tr>
                                <th className="p-2 text-left w-12">Item</th>
                                <th className="p-2 text-left">Descrição</th>
                                <th className="p-2 text-right">Qtd</th>
                                <th className="p-2 text-right">Custo R$</th>
                                <th className="p-2 text-right">Total R$</th>
                                <th className="p-2 text-center w-12">Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center text-slate-400 py-8">Nenhum item adicionado.</td>
                                </tr>
                            ) : items.map((it, idx) => (
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

            {/* Total */}
            <div className="bg-[#f8fafc] mx-2 px-4 py-3 flex justify-between items-center text-sm border-t">
                <span className="font-bold">TOTAL COMPRA | <span className="text-xl">{fmt(total)}</span></span>
            </div>

            {/* Ações */}
            <div className="bg-[#475569] p-3 flex justify-end gap-2">
                <Button onClick={handleSave} className="bg-green-600 text-white px-8" disabled={items.length === 0 || !selectedSupplier}>
                    <Save className="mr-2 h-4 w-4" /> Finalizar Compra
                </Button>
                <Button onClick={() => navigate("/compras")} variant="destructive">
                    <XCircle className="mr-2 h-4 w-4" /> Cancelar
                </Button>
            </div>
        </div>
    );
}
