import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, FileJson, Search, Check, ChevronsUpDown, Eye, Users, Save, AlertTriangle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useProducts } from "@/hooks/useProducts";
import { useCustomers } from "@/hooks/useCustomers";
import { useNaturezas } from "@/hooks/useNaturezas";
import { useFiscalConfig } from "@/hooks/useFiscalConfig";
import { useSaleDetail } from "@/hooks/useSales";
import { cn } from "@/lib/utils";

export default function NovaNFe() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isSavingContingency, setIsSavingContingency] = useState(false);
    const [rejectionError, setRejectionError] = useState<{ message: string; lastData: any } | null>(null);
    const [activeTab, setActiveTab] = useState("dados");
    const [openProductSearch, setOpenProductSearch] = useState(false);
    const [openCustomerSearch, setOpenCustomerSearch] = useState(false);
    const [openNatOpSearch, setOpenNatOpSearch] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const vendaId = searchParams.get('vendaId');
    const rascunhoId = searchParams.get('rascunhoId');
    const { data: saleDetail } = useSaleDetail(vendaId);

    const { data: products = [] } = useProducts();
    const { data: customersList = [] } = useCustomers();
    const { data: naturezas = [] } = useNaturezas();
    const { data: emitenteConfig } = useFiscalConfig();

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        defaultValues: {
            ide: {
                tpNF: "1", // 1-Saída, 0-Entrada
                serie: "1",
                numero: "", // opcional, backend define nativo se nao vier
                natOp: "VENDA DE MERCADORIA",
                finNFe: "1", // 1-NF-e normal
                indPres: "1", // 1-Operação presencial
                idDest: "1", // 1-Dentro do Estado
                refNFe: ""
            },
            customer: {
                documento: "",
                nome: "",
                ie: "",
                email: "",
                cep: "",
                logradouro: "",
                numero: "",
                bairro: "",
                municipio: "",
                codigo_municipio: "",
                uf: "",
                telefone: ""
            },
            items: [
                { code: "", name: "", ncm: "", cest: "", cfop_padrao: "5102", unit: "UN", quantity: 1, unit_price: 0, cst: "00", csosn: "102", origem: "0" }
            ],
            payments: [
                { methodName: "DINHEIRO", amount: 0 }
            ],
            discount: 0,
            informacoesComplementares: ""
        }
    });

    // Populate form from existing sale if vendaId is present
    useEffect(() => {
        if (saleDetail && vendaId) {
            // Customer: the API returns customer data joined if customer_id exists
            const cust = (saleDetail as any).customer;
            setValue("customer.nome", cust?.name || (saleDetail as any).customer_name || "Consumidor Final");
            setValue("customer.documento", cust?.cpf_cnpj || (saleDetail as any).customer_doc || "");
            setValue("customer.email", cust?.email || "");
            setValue("customer.cep", cust?.cep || "");
            setValue("customer.logradouro", cust?.logradouro || cust?.address || "");
            setValue("customer.numero", cust?.numero || "");
            setValue("customer.bairro", cust?.bairro || "");
            setValue("customer.municipio", cust?.municipio || "");
            setValue("customer.codigo_municipio", cust?.codigo_municipio || "");
            setValue("customer.uf", cust?.uf || "");
            setValue("discount", Number((saleDetail as any).discount) || 0);

            if ((saleDetail as any).items && (saleDetail as any).items.length > 0) {
                setValue("items", (saleDetail as any).items.map((item: any) => ({
                    // API retorna campos flat: product_name, product_ncm, etc.
                    code: item.product_code || item.product?.code || "",
                    name: item.product_name || item.product?.name || item.name || "",
                    ncm: item.product_ncm || item.product?.ncm || "",
                    cest: item.product_cest || item.product?.cest || "",
                    cfop_padrao: item.product_cfop || item.product?.cfop_padrao || "5102",
                    unit: item.product_unit || item.product?.unit || "UN",
                    quantity: Number(item.quantity) || 1,
                    unit_price: Number(item.unit_price) || 0,
                    cst: item.product_cst || item.product?.cst || "00",
                    csosn: item.product_csosn || item.product?.csosn || "102",
                    origem: (item.product_origem ?? item.product?.origem ?? 0).toString()
                })));
            }

            if ((saleDetail as any).payments && (saleDetail as any).payments.length > 0) {
                const payMethod = (saleDetail as any).payments[0].method_name?.toUpperCase() || "DINHEIRO";
                setValue("payments.0.methodName", payMethod);
            }
        }
    }, [saleDetail, vendaId, setValue]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const items = watch("items");
    const discount = watch("discount");
    const ide = watch("ide");
    const customer = watch("customer");
    const payments = watch("payments");
    const informacoesComplementares = watch("informacoesComplementares");

    const totalAmount = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0) - discount;

    // ─── Carregar Rascunho ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!rascunhoId) return;
        const token = localStorage.getItem("auth_token");
        fetch(`${import.meta.env.VITE_API_URL}/fiscal/rascunho/${rascunhoId}`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(d => {
                if (d?.dados) {
                    const dados = typeof d.dados === 'string' ? JSON.parse(d.dados) : d.dados;
                    Object.entries(dados).forEach(([key, val]) => setValue(key as any, val));
                    toast.info("Rascunho carregado. Verifique os dados antes de transmitir.");
                }
            })
            .catch(() => toast.error("Erro ao carregar rascunho."));
    }, [rascunhoId, setValue]);

    // ─── Natureza da Operação Padrão ─────────────────────────────────────────────
    useEffect(() => {
        if (!rascunhoId && !vendaId && naturezas && naturezas.length > 0) {
            const padrao = (naturezas as any[]).find(n => n.padrao);
            if (padrao) {
                setValue("ide.natOp", padrao.descricao);
            }
        }
    }, [naturezas, rascunhoId, vendaId, setValue]);

    // ─── Salvar Rascunho ──────────────────────────────────────────────────────────
    const handleSaveDraft = async (data: any) => {
        try {
            setIsSavingDraft(true);
            const token = localStorage.getItem("auth_token");
            const currentRascunhoId = new URLSearchParams(window.location.search).get('rascunhoId');
            const payload = { dados: data, tipo: 'NFE', rascunhoId: currentRascunhoId || undefined };
            const res = await fetch(`${import.meta.env.VITE_API_URL}/fiscal/rascunho`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            toast.success("Rascunho salvo! A nota aparece em NF-e como 'Em Digitação'.");
            if (json.id && !currentRascunhoId) {
                window.history.replaceState({}, '', `/nfe-avulsa?rascunhoId=${json.id}`);
            }
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar rascunho.");
        } finally {
            setIsSavingDraft(false);
        }
    };

    const emitente = emitenteConfig || {
        razao_social: "EMITENTE NÃO CONFIGURADO",
        logradouro: "",
        numero: "",
        bairro: "",
        municipio: "",
        uf: "",
        cep: "",
        cnpj: "",
        ie: ""
    };

    const onSubmit = async (data: any) => {
        try {
            if (data.items.length === 0) {
                toast.error("Adicione ao menos um produto.");
                return;
            }
            if (totalAmount <= 0) {
                toast.error("O valor total da nota deve ser maior que zero.");
                return;
            }

            setIsSubmitting(true);

            // Update payment amount to match total
            data.payments[0].amount = totalAmount;
            data.total_amount = totalAmount;
            if (vendaId) {
                data.saleId = vendaId;
            }

            const token = localStorage.getItem("auth_token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/fiscal/emit-avulsa`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const rawText = await response.text();
            let result;
            try {
                result = JSON.parse(rawText);
            } catch (e) {
                throw new Error(!response.ok ? `Erro Servidor: ${rawText.substring(0, 150)}...` : 'Falha ao analisar a resposta');
            }

            if (!response.ok) throw new Error(result.message || "Erro ao emitir NF-e");

            toast.success(result.message);

            // Apagar rascunho se existia
            if (rascunhoId) {
                const token2 = localStorage.getItem("auth_token");
                fetch(`${import.meta.env.VITE_API_URL}/fiscal/rascunho/${rascunhoId}`, {
                    method: 'DELETE', headers: { Authorization: `Bearer ${token2}` }
                }).catch(() => { });
            }

            setTimeout(() => navigate('/nfe'), 1500);

        } catch (error: any) {
            const msg = error.message || "Erro desconhecido ao comunicar com a Sefaz.";
            toast.error(msg, { duration: 8000 });
            // Guarda o erro e os dados para oferecer contingência
            setRejectionError({ message: msg, lastData: data });
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Salvar em Contingência ────────────────────────────────────────────────────
    const handleSaveContingency = async (lastData?: any) => {
        try {
            setIsSavingContingency(true);
            const formData = lastData || handleSubmit((d) => d);
            const token = localStorage.getItem("auth_token");
            const currentRascunhoId = new URLSearchParams(window.location.search).get('rascunhoId');
            const payload = {
                dados: rejectionError?.lastData || lastData,
                tipo: 'NFE',
                contingencia: true,
                rascunhoId: currentRascunhoId || undefined
            };
            const res = await fetch(`${import.meta.env.VITE_API_URL}/fiscal/rascunho`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message);
            toast.success("Nota salva em contingência! Vá em NF-e → Em Digitação para transmitir quando a SEFAZ estiver disponível.", { duration: 8000 });
            setTimeout(() => navigate('/nfe?tab=rascunhos'), 2000);
        } catch (e: any) {
            toast.error(e.message || "Erro ao salvar contingência.");
        } finally {
            setIsSavingContingency(false);
        }
    };

    const handleCEP = async () => {
        const cep = watch("customer.cep").replace(/\D/g, "");
        if (cep.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setValue("customer.logradouro", data.logradouro);
                setValue("customer.bairro", data.bairro);
                setValue("customer.municipio", data.localidade);
                setValue("customer.codigo_municipio", data.ibge);
                setValue("customer.uf", data.uf);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCNPJ = async () => {
        const cnpj = watch("customer.documento").replace(/\D/g, "");
        if (cnpj.length !== 14) {
            toast.error("CNPJ inválido. Digite 14 números para buscar.");
            return;
        }

        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (!res.ok) throw new Error("CNPJ não encontrado ou erro na API");

            const data = await res.json();

            setValue("customer.nome", data.razao_social);
            setValue("customer.email", data.email || "");

            const cepRaw = data.cep ? data.cep.toString().padStart(8, '0') : "";
            setValue("customer.cep", cepRaw);

            setValue("customer.logradouro", data.logradouro || "");
            setValue("customer.numero", data.numero || "");
            setValue("customer.bairro", data.bairro || "");
            setValue("customer.municipio", data.municipio || "");
            setValue("customer.codigo_municipio", data.codigo_municipio?.toString() || "");
            setValue("customer.uf", data.uf || "");
            setValue("customer.telefone", data.ddd_telefone_1 || data.ddd_telefone_2 || "");

            toast.success("Dados da empresa carregados com sucesso!");
        } catch (e: any) {
            toast.error(e.message || "Erro ao buscar dados do CNPJ");
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Emissão de NF-e Avulsa (Mod. 55)</h1>
                    <p className="text-muted-foreground mt-1">Preencha os dados abaixo para gerar uma nota fiscal avulsa no sistema.</p>
                </div>
            </div>

            {/* Banner de Rejeição com opção de Contingência */}
            {rejectionError && (
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/30">
                    <ShieldAlert className="h-5 w-5 text-orange-600" />
                    <AlertTitle className="text-orange-700 dark:text-orange-400 font-bold flex items-center gap-2">
                        Nota Rejeitada pela SEFAZ
                    </AlertTitle>
                    <AlertDescription className="space-y-3">
                        <p className="text-orange-700 dark:text-orange-300 text-sm font-mono bg-orange-100 dark:bg-orange-900/50 rounded p-2 mt-1">
                            {rejectionError.message}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Corrija os dados da nota acima e tente emitir novamente, ou salve em <strong>contingência</strong> para
                            transmitir quando o problema for resolvido.
                        </p>
                        <div className="flex gap-3 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setRejectionError(null)}
                                className="text-sm underline text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Corrigir e tentar novamente
                            </button>
                            <button
                                type="button"
                                disabled={isSavingContingency}
                                onClick={() => handleSaveContingency()}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                            >
                                <ShieldAlert className="h-4 w-4" />
                                {isSavingContingency ? "Salvando..." : "Salvar em Contingência"}
                            </button>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="dados">1. Dados da Nota</TabsTrigger>
                        <TabsTrigger value="destinatario">2. Destinatário</TabsTrigger>
                        <TabsTrigger value="produtos">3. Produtos</TabsTrigger>
                        <TabsTrigger value="pagamento">4. Fechamento</TabsTrigger>
                    </TabsList>

                    <TabsContent value="dados" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dados da Nota (Ide)</CardTitle>
                                <CardDescription>Identificação básica e natureza da operação.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo da Nota</Label>
                                    <Select onValueChange={(v) => setValue("ide.tpNF", v)} defaultValue="1">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 - Saída</SelectItem>
                                            <SelectItem value="0">0 - Entrada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Série</Label>
                                    <Input {...register("ide.serie")} placeholder="Ex: 1" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Número <span className="text-xs text-muted-foreground">(Automático se vazio)</span></Label>
                                    <Input {...register("ide.numero")} placeholder="Opcional" />
                                </div>
                                <div className="space-y-2 lg:col-span-full">
                                    <Label>Natureza da Operação (CFOP ou Descrição)</Label>
                                    <Popover open={openNatOpSearch} onOpenChange={setOpenNatOpSearch}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openNatOpSearch}
                                                className="w-full justify-between font-normal text-left h-auto py-2"
                                            >
                                                {watch("ide.natOp") ? watch("ide.natOp") : "Selecione ou busque a Natureza/CFOP..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Digite CFOP ou descrição..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhuma natureza encontrada.</CommandEmpty>
                                                    <CommandGroup>
                                                        {naturezas.length === 0 && (
                                                            <CommandItem
                                                                value="5102 - VENDA DE MERCADORIA"
                                                                onSelect={(currentValue) => {
                                                                    setValue("ide.natOp", "5102 - VENDA DE MERCADORIA");
                                                                    setOpenNatOpSearch(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", watch("ide.natOp") === "5102 - VENDA DE MERCADORIA" ? "opacity-100" : "opacity-0")} />
                                                                5102 - VENDA DE MERCADORIA
                                                            </CommandItem>
                                                        )}
                                                        {naturezas.map((nat: any) => (
                                                            <CommandItem
                                                                key={nat.id}
                                                                value={`${nat.cfop || ""} ${nat.descricao}`}
                                                                onSelect={() => {
                                                                    setValue("ide.natOp", nat.descricao);
                                                                    // Se tiver CFOP na natureza, tenta atualizar o CFOP dos itens se eles estiverem com o padrão?
                                                                    // O usuário não pediu isso explicitamente, mas é uma boa ideia. 
                                                                    // Por enquanto vamos manter simples conforme o pedido.
                                                                    setOpenNatOpSearch(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4", watch("ide.natOp") === nat.descricao ? "opacity-100" : "opacity-0")} />
                                                                {nat.cfop ? <span className="font-mono font-bold mr-2 text-primary">{nat.cfop}</span> : null}
                                                                {nat.descricao}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Finalidade</Label>
                                    <Select onValueChange={(v) => setValue("ide.finNFe", v)} defaultValue="1">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 - NF-e Normal</SelectItem>
                                            <SelectItem value="2">2 - NF-e Complementar</SelectItem>
                                            <SelectItem value="3">3 - NF-e de Ajuste</SelectItem>
                                            <SelectItem value="4">4 - Devolução de Mercadoria</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Indicador de Presença</Label>
                                    <Select onValueChange={(v) => setValue("ide.indPres", v)} defaultValue="1">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">0 - Não se aplica</SelectItem>
                                            <SelectItem value="1">1 - Operação Presencial</SelectItem>
                                            <SelectItem value="2">2 - Operação não presencial (Internet)</SelectItem>
                                            <SelectItem value="3">3 - Operação não presencial (Teleatendimento)</SelectItem>
                                            <SelectItem value="4">4 - NFC-e com entrega a domicílio</SelectItem>
                                            <SelectItem value="9">9 - Operação não presencial (Outros)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Destino da Operação</Label>
                                    <Select onValueChange={(v) => setValue("ide.idDest", v)} defaultValue="1">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">1 - Operação Interna</SelectItem>
                                            <SelectItem value="2">2 - Operação Interestadual</SelectItem>
                                            <SelectItem value="3">3 - Operação com Exterior</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Chave NF-e Referenciada (Opcional)</Label>
                                    <Input {...register("ide.refNFe")} placeholder="Apenas números (Devoluções/Ajustes)" maxLength={44} />
                                </div>
                            </CardContent>
                        </Card>
                        <div className="flex justify-end mt-4">
                            <Button type="button" onClick={() => setActiveTab("destinatario")}>Próxima Etapa</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="destinatario" className="mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Dados do Destinatário</CardTitle>
                                    <CardDescription>Informações do cliente exigidas pela SEFAZ.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Popover open={openCustomerSearch} onOpenChange={setOpenCustomerSearch}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openCustomerSearch}
                                                className="w-[280px] justify-between"
                                            >
                                                Puxar Cliente Cadastrado...
                                                <Users className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[350px] p-0" align="end">
                                            <Command>
                                                <CommandInput placeholder="Pesquisar cliente..." />
                                                <CommandList>
                                                    <CommandEmpty>Cliente não encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {customersList.map((c: any) => (
                                                            <CommandItem
                                                                key={c.id}
                                                                value={c.name}
                                                                onSelect={(val) => {
                                                                    const selectedList = customersList.filter((cust: any) => cust.name.toLowerCase() === val.toLowerCase());
                                                                    if (selectedList.length > 0) {
                                                                        const customer = selectedList[0];
                                                                        setValue("customer.documento", customer.cpf_cnpj || "");
                                                                        setValue("customer.nome", customer.name || "");
                                                                        setValue("customer.ie", customer.ie || "");
                                                                        setValue("customer.email", customer.email || "");
                                                                        setValue("customer.cep", customer.cep || "");
                                                                        setValue("customer.logradouro", customer.logradouro || "");
                                                                        setValue("customer.numero", customer.numero || "");
                                                                        setValue("customer.bairro", customer.bairro || "");
                                                                        setValue("customer.municipio", customer.municipio || "");
                                                                        setValue("customer.codigo_municipio", customer.codigo_municipio || "");
                                                                        setValue("customer.uf", customer.uf || "");
                                                                        setValue("customer.telefone", customer.phone || "");
                                                                        toast.success("Dados do cliente preenchidos!");
                                                                    }
                                                                    setOpenCustomerSearch(false);
                                                                }}
                                                            >
                                                                <Check className={cn("mr-2 h-4 w-4 opacity-0")} />
                                                                <div className="flex flex-col">
                                                                    <span>{c.name}</span>
                                                                    <span className="text-xs text-muted-foreground">{c.cpf_cnpj || 'Sem Doc'}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t pt-4">
                                <div className="space-y-2">
                                    <Label className="flex justify-between">
                                        CPF / CNPJ
                                        <button type="button" onClick={handleCNPJ} className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <Search className="h-3 w-3" /> Buscar CNPJ
                                        </button>
                                    </Label>
                                    <Input {...register("customer.documento")} placeholder="Apenas números..." required />
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Nome / Razão Social</Label>
                                    <Input {...register("customer.nome")} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Inscrição Estadual (IE)</Label>
                                    <Input {...register("customer.ie")} placeholder="Deixe em branco ou digite ISENTO se não houver" />
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>E-mail (Opcional)</Label>
                                    <Input type="email" {...register("customer.email")} />
                                </div>

                                <div className="col-span-full border-t my-2 pt-4"><h3 className="font-semibold text-sm">Endereço</h3></div>

                                <div className="space-y-2">
                                    <Label className="flex justify-between">
                                        CEP
                                        <button type="button" onClick={handleCEP} className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <Search className="h-3 w-3" /> Buscar CEP
                                        </button>
                                    </Label>
                                    <Input {...register("customer.cep")} placeholder="00000000" required />
                                </div>
                                <div className="space-y-2 lg:col-span-2">
                                    <Label>Logradouro</Label>
                                    <Input {...register("customer.logradouro")} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Número</Label>
                                    <Input {...register("customer.numero")} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Bairro</Label>
                                    <Input {...register("customer.bairro")} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Município</Label>
                                    <Input {...register("customer.municipio")} required />
                                </div>
                                <div className="space-y-2 hidden">
                                    <Label>Cód IBGE</Label>
                                    <Input {...register("customer.codigo_municipio")} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>UF</Label>
                                    <Input {...register("customer.uf")} required maxLength={2} className="uppercase" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input {...register("customer.telefone")} />
                                </div>

                            </CardContent>
                        </Card>
                        <div className="flex justify-between mt-4">
                            <Button type="button" variant="outline" onClick={() => setActiveTab("dados")}>Voltar</Button>
                            <Button type="button" onClick={() => setActiveTab("produtos")}>Próxima Etapa</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="produtos" className="mt-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Itens da NF-e</CardTitle>
                                    <CardDescription>Adicione os produtos, tributação básica e valores.</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Popover open={openProductSearch} onOpenChange={setOpenProductSearch}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={openProductSearch}
                                                className="w-[280px] justify-between"
                                            >
                                                Buscar Produto Cadastrado...
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[350px] p-0" align="end">
                                            <Command>
                                                <CommandInput placeholder="Pesquisar produto..." />
                                                <CommandList>
                                                    <CommandEmpty>Produto não encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {products.map((p) => (
                                                            <CommandItem
                                                                key={p.id}
                                                                value={`${p.product_code || ''} ${p.code || ''} ${p.name}`}
                                                                keywords={[String(p.product_code || ''), p.code || '', p.name]}
                                                                onSelect={() => {
                                                                    append({
                                                                        code: p.code || "",
                                                                        name: p.name,
                                                                        ncm: p.ncm || "",
                                                                        cest: p.cest || "",
                                                                        cfop_padrao: p.cfop_padrao || "5102",
                                                                        unit: p.unit || "UN",
                                                                        quantity: 1,
                                                                        unit_price: p.sale_price || 0,
                                                                        cst: p.cst || "00",
                                                                        csosn: p.csosn || "102",
                                                                        origem: (p.origem ?? 0).toString() || "0"
                                                                    });
                                                                    setOpenProductSearch(false);
                                                                }}
                                                            >
                                                                {(p.product_code || p.code) && <span className="mr-2 text-muted-foreground text-xs">[{p.product_code || p.code}]</span>}
                                                                {p.name} - R$ {p.sale_price?.toFixed(2)}
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => append({ code: "", name: "", ncm: "", cest: "", cfop_padrao: "5102", unit: "UN", quantity: 1, unit_price: 0, cst: "00", csosn: "102", origem: "0" })}
                                        className="h-8"
                                    >    <Plus className="h-4 w-4" /> Item Avulso
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table className="min-w-[800px]">
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[200px]">Descrição do Produto</TableHead>
                                                <TableHead className="w-[100px]">NCM</TableHead>
                                                <TableHead className="w-[100px]">CST</TableHead>
                                                <TableHead className="w-[100px]">CSOSN</TableHead>
                                                <TableHead className="w-[80px]">CFOP</TableHead>
                                                <TableHead className="w-[80px]">UND</TableHead>
                                                <TableHead className="w-[80px]">Qtd</TableHead>
                                                <TableHead className="w-[100px]">V. Unit.</TableHead>
                                                <TableHead className="w-[100px]">Subtotal</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {fields.map((field, index) => {
                                                const q = items[index]?.quantity || 0;
                                                const p = items[index]?.unit_price || 0;
                                                const sub = q * p;
                                                return (
                                                    <TableRow key={field.id} className="group">
                                                        <TableCell className="p-1">
                                                            <Input {...register(`items.${index}.name`)} required className="h-8 text-sm" placeholder="Nome do item..." />
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Input {...register(`items.${index}.ncm`)} required className="h-8 text-sm" placeholder="8 digitos" maxLength={8} />
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <select
                                                                {...register(`items.${index}.cst`)}
                                                                required
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <optgroup label="CST">
                                                                    <option value="00">00 - Tributada Integral</option>
                                                                    <option value="10">10 - Trib. c/ ST</option>
                                                                    <option value="20">20 - Com Redução Base</option>
                                                                    <option value="30">30 - Isenta/Não Trib. ST</option>
                                                                    <option value="40">40 - Isenta</option>
                                                                    <option value="41">41 - Não Tributada</option>
                                                                    <option value="50">50 - Suspensão</option>
                                                                    <option value="51">51 - Diferimento</option>
                                                                    <option value="60">60 - ICMS Ant. ST</option>
                                                                    <option value="70">70 - Red. Base c/ ST</option>
                                                                    <option value="90">90 - Outras</option>
                                                                </optgroup>
                                                            </select>
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <select
                                                                {...register(`items.${index}.csosn`)}
                                                                required
                                                                className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                                            >
                                                                <optgroup label="CSOSN">
                                                                    <option value="101">101 - Trib. c/ Cred.</option>
                                                                    <option value="102">102 - Trib. s/ Cred.</option>
                                                                    <option value="103">103 - Isen. Rec. Bruta</option>
                                                                    <option value="201">201 - Trib. c/ Cred. ST</option>
                                                                    <option value="202">202 - Trib. s/ Cred. ST</option>
                                                                    <option value="203">203 - Isenção e ST</option>
                                                                    <option value="300">300 - Imune</option>
                                                                    <option value="400">400 - Não Tributada</option>
                                                                    <option value="500">500 - ICMS Ant. ST</option>
                                                                    <option value="900">900 - Outros (SN)</option>
                                                                </optgroup>
                                                            </select>
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Input {...register(`items.${index}.cfop_padrao`)} required className="h-8 text-sm" placeholder="5102" maxLength={4} />
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Input {...register(`items.${index}.unit`)} required className="h-8 text-sm uppercase" maxLength={3} />
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Input type="number" step="0.0001" min="0.0001" {...register(`items.${index}.quantity`, { valueAsNumber: true })} required className="h-8 text-sm" />
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Input type="number" step="0.01" min="0" {...register(`items.${index}.unit_price`, { valueAsNumber: true })} required className="h-8 text-sm" />
                                                        </TableCell>
                                                        <TableCell className="p-1 text-right text-sm font-medium">
                                                            R$ {sub.toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="p-1">
                                                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => remove(index)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto adicionado. Clique em &quot;Novo Item&quot;.</p>}
                            </CardContent>
                        </Card>
                        <div className="flex justify-between mt-4">
                            <Button type="button" variant="outline" onClick={() => setActiveTab("destinatario")}>Voltar</Button>
                            <Button type="button" onClick={() => setActiveTab("pagamento")}>Próxima Etapa</Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="pagamento" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Fechamento da NF-e</CardTitle>
                                <CardDescription>Confirme os valores totais e a forma de pagamento.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                <div className="space-y-4">
                                    <div>
                                        <Label>Forma de Pagamento Principal</Label>
                                        <Select onValueChange={(v) => setValue("payments.0.methodName", v)} defaultValue="DINHEIRO">
                                            <SelectTrigger className="mt-1">
                                                <SelectValue placeholder="Selecione o método" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                                                <SelectItem value="PIX">PIX</SelectItem>
                                                <SelectItem value="CARTAO_CREDITO">Cartão de Crédito</SelectItem>
                                                <SelectItem value="CARTAO_DEBITO">Cartão de Débito</SelectItem>
                                                <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                                                <SelectItem value="OUTROS">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground mt-2">A NF-e será registrada com pagamento à vista neste método.</p>
                                    </div>

                                    <div className="pt-4 border-t">
                                        <Label className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Desconto R$</Label>
                                        <Input type="number" step="0.01" min="0" {...register("discount", { valueAsNumber: true })} className="mt-1 text-lg font-medium h-12" />
                                    </div>

                                    <div className="pt-4 border-t">
                                        <Label>Informações Complementares (DANFE)</Label>
                                        <textarea
                                            {...register("informacoesComplementares")}
                                            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mt-1"
                                            placeholder="Observações adicionais que sairão impressas no DANFE..."
                                        />
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 border flex flex-col justify-center space-y-4">
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Subtotal Tabela:</span>
                                        <span>R$ {(totalAmount + (discount || 0)).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Desconto Aplicado:</span>
                                        <span className="text-destructive">- R$ {(discount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-800">
                                        <span className="text-2xl font-bold">TOTAL DA NOTA:</span>
                                        <span className="text-3xl font-black text-primary">R$ {Math.max(0, totalAmount).toFixed(2)}</span>
                                    </div>
                                </div>

                            </CardContent>
                        </Card>

                        <div className="flex justify-between mt-4">
                            <Button type="button" variant="outline" onClick={() => setActiveTab("produtos")}>Voltar</Button>
                            <div className="flex gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 border-blue-500 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                                    disabled={isSavingDraft}
                                    onClick={handleSubmit(handleSaveDraft)}
                                >
                                    <Save className="h-4 w-4" />
                                    {isSavingDraft ? "Salvando..." : "Salvar Rascunho"}
                                </Button>
                                <Button type="button" variant="secondary" className="gap-2" onClick={() => setPreviewOpen(true)}>
                                    <Eye className="h-4 w-4" />
                                    Visualizar Nota
                                </Button>
                                <Button type="submit" size="lg" className="gap-2 font-bold px-8 bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
                                    <FileJson className="h-5 w-5" />
                                    {isSubmitting ? "Transmitindo à Sefaz..." : "EMITIR NF-E AGORA"}
                                </Button>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </form>

            {/* Modal de Preview (Resumo da NF-e no Formato DANFE - Mod. 55) */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-y-auto p-4 bg-white text-black">
                    <DialogHeader className="mb-2 hidden">
                        <DialogTitle>Pré-visualização DANFE</DialogTitle>
                    </DialogHeader>

                    {/* Layout DANFE - Borda Principal Externa */}
                    <div className="border border-black p-1 space-y-2 font-sans text-[10px] leading-tight">

                        {/* Canhoto */}
                        <div className="flex border border-black">
                            <div className="w-4/5 flex flex-col border-r border-black">
                                <div className="border-b border-black p-1 text-center font-serif text-[9px]">
                                    <p className="uppercase">RECEBEMOS DE {emitente.razao_social || 'EMITENTE NÃO CONFIGURADO'} OS PRODUTOS / SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO</p>
                                    <p className="uppercase mt-1">EMISSÃO: {new Date().toLocaleDateString('pt-BR')}  -  DEST. / REM.: {customer?.name || "CONSUMIDOR FINAL"}  -  VALOR TOTAL: R$ {Math.max(0, totalAmount).toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="flex flex-1 min-h-[24px]">
                                    <div className="w-1/4 border-r border-black p-1">
                                        <span className="text-[7px] uppercase block">DATA DE RECEBIMENTO</span>
                                    </div>
                                    <div className="w-3/4 p-1">
                                        <span className="text-[7px] uppercase block">IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
                                    </div>
                                </div>
                            </div>
                            <div className="w-1/5 flex flex-col justify-center items-center text-center p-1">
                                <p className="font-bold text-base leading-tight">NF-e</p>
                                <p className="font-bold text-sm leading-tight">Nº 000.000.000</p>
                                <p className="text-xs leading-tight mt-1">SÉRIE 001</p>
                            </div>
                        </div>

                        <div className="border-b border-dashed border-black py-1"></div>

                        {/* Header do DANFE */}
                        <div className="flex border border-black h-32">
                            {/* Bloco Emitente */}
                            <div className="w-1/2 p-2 border-r border-black flex flex-col justify-center items-center text-center">
                                <h2 className="font-bold text-lg uppercase truncate w-full">{emitente.razao_social || 'EMITENTE NÃO CONFIGURADO'}</h2>
                                <p className="truncate w-full">{emitente.logradouro}, {emitente.numero} - {emitente.bairro}</p>
                                <p className="truncate w-full">{emitente.municipio} - {emitente.uf} - CEP: {emitente.cep}</p>
                                <p className="mt-1 font-bold">CNPJ: {emitente.cnpj}</p>
                                <p>IE: {emitente.ie}</p>
                            </div>
                            {/* Bloco DANFE Texto Central */}
                            <div className="w-1/6 p-2 border-r border-black flex flex-col justify-center items-center text-center">
                                <h3 className="font-black text-xl">DANFE</h3>
                                <p className="text-[8px] uppercase">Documento Auxiliar da Nota Fiscal Eletrônica</p>
                                <p className="mt-2 font-bold text-sm">0 - ENTRADA</p>
                                <p className="font-bold text-sm">1 - SAÍDA</p>
                                <div className="border border-black px-2 py-1 mt-1 font-black text-lg">
                                    {ide.tpNF === "1" ? "1" : "0"}
                                </div>
                            </div>
                            {/* Bloco Chave de Acesso Simulação */}
                            <div className="w-2/6 p-2 flex flex-col">
                                <div className="border border-black p-1 text-center h-12 flex mb-1 items-center justify-center">
                                    <p className="font-bold text-xs uppercase text-muted-foreground/40 italic">Código de Barras Sefaz</p>
                                </div>
                                <div className="mt-1">
                                    <span className="text-[8px] uppercase block">CHAVE DE ACESSO (Simulação)</span>
                                    <p className="font-bold text-xs flex justify-between tracking-tighter">
                                        <span>0000</span> <span>0000</span> <span>0000</span> <span>0000</span> <span>0000</span>
                                        <span>0000</span> <span>0000</span> <span>0000</span> <span>0000</span> <span>0000</span> <span>0000</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Natureza da Operação / Protocolo */}
                        <div className="flex border border-black">
                            <div className="w-2/3 border-r border-black p-1">
                                <span className="text-[8px] uppercase block">NATUREZA DA OPERAÇÃO</span>
                                <p className="font-bold truncate">{ide.natOp}</p>
                            </div>
                            <div className="w-1/3 p-1">
                                <span className="text-[8px] uppercase block">PROTOCOLO DE AUTORIZAÇÃO DE USO</span>
                                <p className="font-bold">-</p>
                            </div>
                        </div>

                        {/* Destinatário / Remetente */}
                        <div className="font-bold text-xs uppercase mb-1">Destinatário/Remetente</div>
                        <div className="border border-black">
                            <div className="flex border-b border-black">
                                <div className="w-[60%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">NOME / RAZÃO SOCIAL</span>
                                    <p className="font-bold truncate">{customer.nome || "-"}</p>
                                </div>
                                <div className="w-[20%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">CNPJ / CPF</span>
                                    <p className="font-bold">{customer.documento || "-"}</p>
                                </div>
                                <div className="w-[20%] p-1">
                                    <span className="text-[8px] uppercase block">DATA DA EMISSÃO</span>
                                    <p className="font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="flex border-b border-black">
                                <div className="w-[45%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">ENDEREÇO</span>
                                    <p className="font-bold truncate">{customer.logradouro}, {customer.numero}</p>
                                </div>
                                <div className="w-[25%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">BAIRRO / DISTRITO</span>
                                    <p className="font-bold truncate">{customer.bairro || "-"}</p>
                                </div>
                                <div className="w-[15%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">CEP</span>
                                    <p className="font-bold">{customer.cep || "-"}</p>
                                </div>
                                <div className="w-[15%] p-1">
                                    <span className="text-[8px] uppercase block">DATA DE SAÍDA</span>
                                    <p className="font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
                                </div>
                            </div>
                            <div className="flex">
                                <div className="w-[45%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">MUNICÍPIO</span>
                                    <p className="font-bold truncate">{customer.municipio || "-"}</p>
                                </div>
                                <div className="w-[10%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">UF</span>
                                    <p className="font-bold">{customer.uf || "-"}</p>
                                </div>
                                <div className="w-[25%] border-r border-black p-1">
                                    <span className="text-[8px] uppercase block">INSCRIÇÃO ESTADUAL</span>
                                    <p className="font-bold">{customer.ie || "-"}</p>
                                </div>
                                <div className="w-[20%] p-1">
                                    <span className="text-[8px] uppercase block">HORA DA SAÍDA</span>
                                    <p className="font-bold">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        </div>

                        {/* Cálculo do Imposto */}
                        <div className="font-bold text-xs uppercase mb-1 mt-2">Cálculo do Imposto</div>
                        <div className="border border-black z-10 relative bg-white">
                            <div className="flex border-b border-black">
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">BASE DE CÁLCULO DE ICMS</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR DO ICMS</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">BASE DE CÁLCULO ICMS ST</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR DO ICMS SUBSTITUIÇÃO</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR APROX. DOS TRIBUTOS</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR TOTAL DOS PRODUTOS</span>
                                    <p className="font-bold">{(Math.max(0, totalAmount + (discount || 0))).toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 rotate-[-45deg] pointer-events-none z-0">
                                <span className="text-[60px] font-bold text-red-500 tracking-widest whitespace-nowrap drop-shadow-md">SEM VALOR FISCAL</span>
                            </div>

                            {/* Watermark Topo */}
                            <div className="absolute top-12 right-20 opacity-80 pointer-events-none z-10 w-80 text-center flex items-center justify-center">
                                <span className="text-[20px] font-bold text-red-500 font-serif" style={{ transform: 'scaleY(1.5)' }}>NF-e NÃO ENVIADA PARA SEFAZ</span>
                            </div>

                            <div className="flex z-10 relative bg-white">
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR DO FRETE</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR DO SEGURO</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">DESCONTO</span>
                                    <p className="font-bold">{(discount || 0).toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">OUTRAS DESPESAS</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 border-r border-black p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR DO IPI</span>
                                    <p className="font-bold">0,00</p>
                                </div>
                                <div className="w-1/6 p-1 text-right">
                                    <span className="text-[8px] uppercase block text-left">VALOR TOTAL DA NOTA</span>
                                    <p className="font-bold">{Math.max(0, totalAmount).toFixed(2).replace('.', ',')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Transportador */}
                        <div className="font-bold text-xs uppercase mb-1 mt-2">Transportador / Volumes Transportados</div>
                        <div className="border border-black flex">
                            <div className="w-full p-2 text-center text-muted-foreground/50 font-bold">O FRETE SERÁ INFORMADO POSTERIORMENTE (Mod. Simplificado)</div>
                        </div>

                        {/* Dados dos Produtos */}
                        <div className="font-bold text-xs uppercase mb-1 mt-2">Dados do Produto/Serviço</div>
                        <div className="border border-black overflow-hidden relative">
                            <table className="w-full text-left text-[8px] border-collapse">
                                <thead>
                                    <tr className="uppercase border-b border-black bg-slate-100 text-[6px]">
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>CÓDIGO DO<br />PROD. / SERV.</th>
                                        <th className="border-r border-black p-1 font-semibold" rowSpan={2}>DESCRIÇÃO DO PRODUTO / SERVIÇO</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>NCM / SH</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>CSOSN<br />/ CST</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>CFOP</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>UNID.</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>QUANT.</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>VALOR<br />UNITÁRIO</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>VALOR<br />TOTAL</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>DESCONTO</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>BASE<br />CÁLC. ICMS</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>VALOR<br />I.C.M.S.</th>
                                        <th className="border-r border-black p-1 font-semibold text-center" rowSpan={2}>VALOR<br />I.P.I.</th>
                                        <th className="p-1 font-semibold text-center border-b-0" colSpan={2}>ALÍQUOTAS</th>
                                    </tr>
                                    <tr className="uppercase border-b border-black bg-slate-100 text-[6px]">
                                        <th className="border-l border-r border-black p-1 font-semibold text-center w-[3%]">ICMS</th>
                                        <th className="p-1 font-semibold text-center w-[3%]">IPI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((it, idx) => (
                                        <tr key={idx} className="border-b border-dotted border-black text-[7px]">
                                            <td className="border-r border-black p-1 text-left align-top truncate max-w-[40px]">{it.code || "-"}</td>
                                            <td className="border-r border-black p-1 text-left align-top max-w-[200px]">
                                                {it.name}<br />
                                                <span className="text-[6px] text-muted-foreground">CSOSN:{it.csosn} CST:{it.cst} CFOP:{it.cfop_padrao}</span>
                                            </td>
                                            <td className="border-r border-black p-1 text-center align-top">{it.ncm}</td>
                                            <td className="border-r border-black p-1 text-center align-top">{it.csosn || it.cst}</td>
                                            <td className="border-r border-black p-1 text-center align-top">{it.cfop_padrao}</td>
                                            <td className="border-r border-black p-1 text-center align-top">{it.unit}</td>
                                            <td className="border-r border-black p-1 text-right align-top">{it.quantity.toFixed(4).replace('.', ',')}</td>
                                            <td className="border-r border-black p-1 text-right align-top">{it.unit_price.toFixed(4).replace('.', ',')}</td>
                                            <td className="border-r border-black p-1 text-right align-top">{(it.quantity * it.unit_price).toFixed(2).replace('.', ',')}</td>
                                            <td className="border-r border-black p-1 text-right align-top">0,00</td>
                                            <td className="border-r border-black p-1 text-right align-top">0,00</td>
                                            <td className="border-r border-black p-1 text-right align-top">0,00</td>
                                            <td className="border-r border-black p-1 text-right align-top">0,00</td>
                                            <td className="border-r border-black p-1 text-right align-top">0,00</td>
                                            <td className="p-1 text-right align-top">0,00</td>
                                        </tr>
                                    ))}
                                    {/* Placeholder para esticar tabela caso existam poucos itens */}
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={`filler-${i}`}>
                                            <td className="border-r border-black p-3" colSpan={9}></td>
                                            <td className="border-r border-black p-3" colSpan={6}></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Dados Adicionais */}
                        <div className="font-bold text-xs uppercase mb-1 mt-2">Dados Adicionais</div>
                        <div className="flex border border-black min-h-[80px]">
                            <div className="w-1/2 border-r border-black p-1">
                                <span className="text-[8px] uppercase block mb-1">INFORMAÇÕES COMPLEMENTARES</span>
                                <p className="font-mono text-[9px] whitespace-pre-wrap">
                                    {ide.indPres === "1" ? "Operação Presencial.\n" : ""}
                                    Valor Aprox. Tributos Federais R$ 0,00.
                                    Forma de Pagto: {payments.length > 0 ? payments[0].methodName : "A Combinar"}
                                    {informacoesComplementares ? `\n\n${informacoesComplementares}` : ""}
                                </p>
                            </div>
                            <div className="w-1/2 p-1">
                                <span className="text-[8px] uppercase block">RESERVADO AO FISCO</span>
                            </div>
                        </div>

                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)}>Editar Formulário</Button>
                        <Button onClick={handleSubmit(onSubmit)} className="gap-2 bg-green-600 hover:bg-green-700 text-white font-bold" disabled={isSubmitting}>
                            <FileJson className="h-4 w-4" />
                            {isSubmitting ? "Transmitindo à Sefaz..." : "Confirmar e Emitir NF-e"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
