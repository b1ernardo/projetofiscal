import { useState, useEffect } from "react";
import {
    Plus, Trash2, Search, Smartphone, Car, Wrench,
    ArrowLeft, Save, Loader2, Package, Info, UserPlus
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    useSaveServiceOrder,
    useServiceOrderDetail,
    ServiceOrder,
    SOItem,
    SOService
} from "@/hooks/useServiceOrders";
import { useCustomers, useAddCustomer } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { CustomerFormDialog } from "@/components/clientes/CustomerFormDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ServiceOrderForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;

    const { data: existingSO, isLoading: isLoadingSO } = useServiceOrderDetail(id || null);
    const { data: customers, refetch: refetchCustomers } = useCustomers();
    const { data: products } = useProducts();
    const saveSO = useSaveServiceOrder();
    const addCustomerMutation = useAddCustomer();

    const [formData, setFormData] = useState<Partial<ServiceOrder>>({
        status: 'pendente',
        priority: 'media',
        item_type: 'veiculo',
        labor_total: 0,
        parts_total: 0,
        discount: 0,
        total_amount: 0,
        items: [],
        services: []
    });

    const [itemSearch, setItemSearch] = useState("");
    const [showProductSearch, setShowProductSearch] = useState(false);
    const [customerSearch, setCustomerSearch] = useState("");
    const [showCustomerSearch, setShowCustomerSearch] = useState(false);
    const [showCustomerDialog, setShowCustomerDialog] = useState(false);

    useEffect(() => {
        if (existingSO) {
            setFormData(existingSO);
        }
    }, [existingSO]);

    const handleSave = () => {
        if (!formData.customer_id) {
            toast.error("Por favor, selecione um cliente");
            return;
        }
        if (!formData.problem_reported) {
            toast.error("Por favor, preencha o problema relatado");
            return;
        }

        saveSO.mutate(formData, {
            onSuccess: () => navigate("/ordens-servico")
        });
    };

    const calculateTotals = (currentData: Partial<ServiceOrder>) => {
        const partsTotal = (currentData.items || []).reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
        const laborTotal = (currentData.services || []).reduce((acc, service) => acc + Number(service.price), 0);
        const totalAmount = partsTotal + laborTotal - (currentData.discount || 0);

        setFormData({
            ...currentData,
            parts_total: partsTotal,
            labor_total: laborTotal,
            total_amount: totalAmount
        });
    };

    const addItem = (product: any) => {
        const newItem: SOItem = {
            product_id: product.id,
            description: product.name,
            quantity: 1,
            unit_price: Number(product.sale_price),
            total_price: Number(product.sale_price)
        };
        const newItems = [...(formData.items || []), newItem];
        calculateTotals({ ...formData, items: newItems });
        setShowProductSearch(false);
        setItemSearch("");
    };

    const addManualItem = () => {
        const newItem: SOItem = {
            description: "Nova Peça",
            quantity: 1,
            unit_price: 0,
            total_price: 0
        };
        calculateTotals({ ...formData, items: [...(formData.items || []), newItem] });
    };

    const removeItem = (index: number) => {
        const newItems = [...(formData.items || [])];
        newItems.splice(index, 1);
        calculateTotals({ ...formData, items: newItems });
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...(formData.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        calculateTotals({ ...formData, items: newItems });
    };

    const addService = () => {
        const newService: SOService = {
            description: "Mão de Obra / Serviço",
            price: 0
        };
        calculateTotals({ ...formData, services: [...(formData.services || []), newService] });
    };

    const removeService = (index: number) => {
        const newServices = [...(formData.services || [])];
        newServices.splice(index, 1);
        calculateTotals({ ...formData, services: newServices });
    };

    const updateService = (index: number, field: string, value: any) => {
        const newServices = [...(formData.services || [])];
        newServices[index] = { ...newServices[index], [field]: value };
        calculateTotals({ ...formData, services: newServices });
    };

    const handleSaveCustomer = (data: any) => {
        addCustomerMutation.mutate(data, {
            onSuccess: (newCustomer) => {
                toast.success("Cliente cadastrado com sucesso!");
                setShowCustomerDialog(false);
                refetchCustomers().then(() => {
                    setFormData(prev => ({ ...prev, customer_id: newCustomer.id }));
                });
            },
            onError: (error: any) => {
                toast.error(error.message || "Erro ao cadastrar cliente");
            }
        });
    };

    if (isEditing && isLoadingSO) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-[#f8fbff] min-h-screen pb-24">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border max-w-5xl mx-auto">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/ordens-servico")}>
                        <ArrowLeft size={20} />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">
                            {isEditing ? `Editar OS #${existingSO?.so_number || id?.slice(0, 8)}` : "Nova Ordem de Serviço"}
                        </h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate("/ordens-servico")}>Cancelar</Button>
                    <Button
                        onClick={handleSave}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        disabled={saveSO.isPending}
                    >
                        {saveSO.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {isEditing ? "Salvar Alterações" : "Criar OS"}
                    </Button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Lado Esquerdo: Dados Principais */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Card Cliente e Item */}
                    <Card>
                        <CardHeader className="bg-gray-50/50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Info size={16} className="text-primary" /> Identificação do Serviço
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2 relative">
                                    <Label>Cliente</Label>
                                    <div className="relative">
                                        <div 
                                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                            onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                                        >
                                            <span className={formData.customer_id ? "text-foreground" : "text-muted-foreground"}>
                                                {formData.customer_id 
                                                    ? customers?.find(c => c.id === formData.customer_id)?.name 
                                                    : "Selecione um cliente..."}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowCustomerDialog(true);
                                                    }}
                                                >
                                                    <UserPlus size={16} />
                                                </Button>
                                                <Search className="h-4 w-4 opacity-50" />
                                            </div>
                                        </div>

                                        {showCustomerSearch && (
                                            <Card className="absolute top-full left-0 mt-1 w-full z-50 shadow-lg border">
                                                <div className="p-2 border-b">
                                                    <Input
                                                        placeholder="Pesquisar cliente..."
                                                        value={customerSearch}
                                                        onChange={e => setCustomerSearch(e.target.value)}
                                                        autoFocus
                                                        className="h-8"
                                                    />
                                                </div>
                                                <div className="max-h-60 overflow-y-auto p-1">
                                                    {customers?.filter(c => 
                                                        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                        c.document?.includes(customerSearch)
                                                    ).map(c => (
                                                        <button
                                                            key={c.id}
                                                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground rounded-sm transition-colors"
                                                            onClick={() => {
                                                                setFormData({ ...formData, customer_id: c.id });
                                                                setShowCustomerSearch(false);
                                                                setCustomerSearch("");
                                                            }}
                                                        >
                                                            <div className="font-medium">{c.name}</div>
                                                            {c.document && <div className="text-[10px] text-muted-foreground">{c.document}</div>}
                                                        </button>
                                                    ))}
                                                    {customers?.filter(c => 
                                                        c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                                        c.document?.includes(customerSearch)
                                                    ).length === 0 && (
                                                        <div className="p-4 text-center space-y-2">
                                                            <div className="text-xs text-muted-foreground">Nenhum cliente encontrado</div>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="w-full gap-2 border-dashed"
                                                                onClick={() => {
                                                                    setShowCustomerSearch(false);
                                                                    setShowCustomerDialog(true);
                                                                }}
                                                            >
                                                                <UserPlus size={14} /> Cadastrar "{customerSearch}"
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card>
                                        )}
                                    </div>
                                    {showCustomerSearch && (
                                        <div 
                                            className="fixed inset-0 z-40" 
                                            onClick={() => {
                                                setShowCustomerSearch(false);
                                                setCustomerSearch("");
                                            }} 
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Item</Label>
                                    <Select
                                        value={formData.item_type}
                                        onValueChange={(val) => setFormData({ ...formData, item_type: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="veiculo">🏢 Veículo (Oficina)</SelectItem>
                                            <SelectItem value="celular">📱 Celular (Assistência)</SelectItem>
                                            <SelectItem value="equipamento">⚙️ Equipamento / Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-primary/5 p-4 rounded-lg border border-primary/10">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-gray-500">Marca/Fabricante</Label>
                                    <Input
                                        placeholder="Ex: Toyota, Samsung"
                                        value={formData.item_make || ""}
                                        onChange={e => setFormData({ ...formData, item_make: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-gray-500">Modelo</Label>
                                    <Input
                                        placeholder="Ex: Corolla, S23 Ultra"
                                        value={formData.item_model || ""}
                                        onChange={e => setFormData({ ...formData, item_model: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-gray-500">
                                        {formData.item_type === 'veiculo' ? 'Placa' : 'IMEI / Serial'}
                                    </Label>
                                    <Input
                                        placeholder={formData.item_type === 'veiculo' ? 'ABC-1234' : '000.000...'}
                                        value={formData.item_identifier || ""}
                                        onChange={e => setFormData({ ...formData, item_identifier: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-gray-500">Cor</Label>
                                    <Input
                                        placeholder="Cor predominante"
                                        value={formData.item_color || ""}
                                        onChange={e => setFormData({ ...formData, item_color: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label className="text-xs uppercase font-bold text-gray-500">Acessórios / Observações de Entrada</Label>
                                    <Input
                                        placeholder="Carregador, Capa, Chave Reserva, Tanque Cheio..."
                                        value={formData.accessories || ""}
                                        onChange={e => setFormData({ ...formData, accessories: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card Diagnóstico */}
                    <Card>
                        <CardHeader className="bg-gray-50/50">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Search size={16} className="text-primary" /> Diagnóstico e Execução
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <Label>Problema Relatado pelo Cliente</Label>
                                <Textarea
                                    placeholder="Descreva o que o cliente reclamou..."
                                    value={formData.problem_reported || ""}
                                    onChange={e => setFormData({ ...formData, problem_reported: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Diagnóstico Técnico (Problema Encontrado)</Label>
                                <Textarea
                                    placeholder="Relatório do técnico sobre o que foi encontrado..."
                                    className="border-yellow-200 focus:ring-yellow-500"
                                    value={formData.problem_found || ""}
                                    onChange={e => setFormData({ ...formData, problem_found: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Serviço Executado</Label>
                                <Textarea
                                    placeholder="Relate o que foi feito para resolver o problema..."
                                    className="border-green-200 focus:ring-green-500"
                                    value={formData.service_performed || ""}
                                    onChange={e => setFormData({ ...formData, service_performed: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lado Direito: Status e Financeiro */}
                <div className="space-y-6">
                    <Card className="sticky top-6">
                        <CardHeader className="bg-primary text-white">
                            <CardTitle className="text-sm font-bold">Gestão & Totais</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Status Atual</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(val: any) => setFormData({ ...formData, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pendente">Pendente</SelectItem>
                                            <SelectItem value="em_analise">Em Análise</SelectItem>
                                            <SelectItem value="orcamento_aprovado">Orçamento Aprovado</SelectItem>
                                            <SelectItem value="orcamento_reprovado">Orçamento Reprovado</SelectItem>
                                            <SelectItem value="em_execucao">Em Execução</SelectItem>
                                            <SelectItem value="aguardando_pecas">Aguardando Peças</SelectItem>
                                            <SelectItem value="pronto">Pronto</SelectItem>
                                            <SelectItem value="entregue">Entregue</SelectItem>
                                            <SelectItem value="cancelado">Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Prioridade</Label>
                                    <Select
                                        value={formData.priority}
                                        onValueChange={(val: any) => setFormData({ ...formData, priority: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="baixa">Baixa</SelectItem>
                                            <SelectItem value="media">Média</SelectItem>
                                            <SelectItem value="alta">Alta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Previsão de Entrega</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.expected_delivery ? formData.expected_delivery.slice(0, 16) : ""}
                                        onChange={e => setFormData({ ...formData, expected_delivery: e.target.value })}
                                    />
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3 font-medium">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Total de Peças:</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.parts_total || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Mão de Obra:</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.labor_total || 0)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center gap-2">
                                    <span className="text-gray-500">Desconto:</span>
                                    <Input
                                        type="number"
                                        className="w-24 h-8 text-right p-1"
                                        value={formData.discount || 0}
                                        onChange={e => calculateTotals({ ...formData, discount: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="flex justify-between text-lg font-black border-t pt-3 text-primary">
                                    <span>TOTAL:</span>
                                    <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(formData.total_amount || 0)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Peças e Serviços (Full Width Bottom Tabs) */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue="parts" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="parts" className="gap-2"><Package size={16} /> Peças / Produtos</TabsTrigger>
                            <TabsTrigger value="labor" className="gap-2"><Wrench size={16} /> Mão de Obra / Serviços</TabsTrigger>
                        </TabsList>

                        <TabsContent value="parts" className="bg-white p-6 rounded-b-xl border shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold">Listagem de Peças</h3>
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <Button variant="outline" size="sm" onClick={() => setShowProductSearch(!showProductSearch)}>
                                            <Search size={14} className="mr-2" /> Buscar no Estoque
                                        </Button>
                                        {showProductSearch && (
                                            <Card className="absolute top-full right-0 mt-2 w-80 z-50 shadow-2xl border-2">
                                                <CardContent className="p-4">
                                                    <Input
                                                        autoFocus
                                                        placeholder="Pesquisar produto..."
                                                        value={itemSearch}
                                                        onChange={e => setItemSearch(e.target.value)}
                                                        className="mb-2"
                                                    />
                                                    <div className="max-h-60 overflow-y-auto space-y-1">
                                                        {products?.filter(p => p.name?.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 10).map(p => (
                                                            <button
                                                                key={p.id}
                                                                onClick={() => addItem(p)}
                                                                className="w-full text-left p-2 hover:bg-gray-100 rounded text-xs flex justify-between"
                                                            >
                                                                <span>{p.name || 'Sem nome'}</span>
                                                                <span className="font-bold">R$ {Number(p.sale_price).toFixed(2)}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}
                                    </div>
                                    <Button size="sm" onClick={addManualItem}>+ Item Manual</Button>
                                </div>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 uppercase text-[10px] font-bold">
                                            <TableHead>Descrição</TableHead>
                                            <TableHead className="w-24">Qtd</TableHead>
                                            <TableHead className="w-32">Unitário</TableHead>
                                            <TableHead className="w-32">Total</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(formData.items || []).map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Input
                                                        value={item.description}
                                                        onChange={e => updateItem(idx, 'description', e.target.value)}
                                                        className="h-8 border-transparent focus:border-gray-300"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={item.unit_price}
                                                        onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                                                        className="h-8"
                                                    />
                                                </TableCell>
                                                <TableCell className="font-bold text-gray-700">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.quantity * item.unit_price)}
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-red-500">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {formData.items?.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-4 text-gray-400">Nenhuma peça adicionada.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>

                        <TabsContent value="labor" className="bg-white p-6 rounded-b-xl border shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold">Serviços / Mão de Obra</h3>
                                <Button size="sm" onClick={addService}>+ Adicionar Serviço</Button>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50 uppercase text-[10px] font-bold">
                                            <TableHead>Descrição do Serviço</TableHead>
                                            <TableHead className="w-32">Valor</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(formData.services || []).map((service, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Input
                                                        value={service.description}
                                                        onChange={e => updateService(idx, 'description', e.target.value)}
                                                        className="h-8 border-transparent focus:border-gray-300"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        value={service.price}
                                                        onChange={e => updateService(idx, 'price', Number(e.target.value))}
                                                        className="h-8 font-bold"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => removeService(idx)} className="text-red-500">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {formData.services?.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-4 text-gray-400">Nenhum serviço adicionado.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <CustomerFormDialog
                open={showCustomerDialog}
                onOpenChange={setShowCustomerDialog}
                onSave={handleSaveCustomer}
            />
        </div>
    );
}
