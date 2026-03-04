import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import { toast } from "sonner";

export interface CustomerFormData {
    name: string;
    cpf_cnpj: string;
    phone: string;
    email: string;
    ie?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    municipio?: string;
    codigo_municipio?: string;
    uf?: string;
    address?: string; // legível ou simplificado
    status?: string;
}

interface CustomerFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: CustomerFormData) => void;
    initialData?: Partial<CustomerFormData>;
}

export function CustomerFormDialog({ open, onOpenChange, onSave, initialData }: CustomerFormDialogProps) {
    const [form, setForm] = useState<CustomerFormData>({
        name: "",
        cpf_cnpj: "",
        phone: "",
        email: "",
        ie: "",
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        municipio: "",
        codigo_municipio: "",
        uf: "",
        address: "",
        status: "active"
    });
    const [activeTab, setActiveTab] = useState("dados");

    useEffect(() => {
        if (open) {
            if (initialData) {
                setForm({
                    name: initialData.name || "",
                    cpf_cnpj: initialData.cpf_cnpj || "",
                    phone: initialData.phone || "",
                    email: initialData.email || "",
                    ie: initialData.ie || "",
                    cep: initialData.cep || "",
                    logradouro: initialData.logradouro || "",
                    numero: initialData.numero || "",
                    bairro: initialData.bairro || "",
                    municipio: initialData.municipio || "",
                    codigo_municipio: initialData.codigo_municipio || "",
                    uf: initialData.uf || "",
                    address: initialData.address || "",
                    status: initialData.status || "active"
                });
            } else {
                setForm({ name: "", cpf_cnpj: "", phone: "", email: "", address: "", ie: "", cep: "", logradouro: "", numero: "", bairro: "", municipio: "", codigo_municipio: "", uf: "", status: "active" });
            }
            setActiveTab("dados");
        }
    }, [open, initialData]);

    const handleCNPJ = async () => {
        const cnpj = form.cpf_cnpj.replace(/\D/g, "");
        if (cnpj.length !== 14) {
            toast.error("Geralmente busca por CNPJ exige 14 números.");
        }
        if (cnpj.length < 14) return;

        try {
            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
            if (!res.ok) throw new Error("CNPJ não encontrado ou erro na API");

            const data = await res.json();

            const cepRaw = data.cep ? data.cep.toString().padStart(8, '0') : "";

            setForm(prev => ({
                ...prev,
                name: data.razao_social || data.nome_fantasia || prev.name,
                email: data.email || prev.email,
                cep: cepRaw,
                logradouro: data.logradouro || prev.logradouro,
                numero: data.numero || prev.numero,
                bairro: data.bairro || prev.bairro,
                municipio: data.municipio || prev.municipio,
                codigo_municipio: data.codigo_municipio?.toString() || prev.codigo_municipio,
                uf: data.uf || prev.uf,
                phone: data.ddd_telefone_1 || data.ddd_telefone_2 || prev.phone,
            }));

            toast.success("Dados da empresa carregados com sucesso!");
        } catch (e: any) {
            toast.error(e.message || "Erro ao buscar dados do CNPJ");
        }
    };

    const handleCEP = async () => {
        const cepStr = (form.cep || "").replace(/\D/g, "");
        if (cepStr.length !== 8) return;

        try {
            const res = await fetch(`https://viacep.com.br/ws/${cepStr}/json/`);
            const data = await res.json();
            if (!data.erro) {
                setForm(prev => ({
                    ...prev,
                    logradouro: data.logradouro,
                    bairro: data.bairro,
                    municipio: data.localidade,
                    codigo_municipio: data.ibge,
                    uf: data.uf
                }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
                    <DialogDescription>Preencha os dados (fiscais ou genéricos).</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="dados">1. Dados Básicos</TabsTrigger>
                            <TabsTrigger value="endereco">2. Endereço</TabsTrigger>
                        </TabsList>

                        <TabsContent value="dados" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label htmlFor="cpf_cnpj" className="flex justify-between">
                                        CPF / CNPJ
                                        <button type="button" onClick={handleCNPJ} className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <Search className="h-3 w-3" /> Buscar CNPJ
                                        </button>
                                    </Label>
                                    <Input id="cpf_cnpj" value={form.cpf_cnpj} onChange={e => setForm({ ...form, cpf_cnpj: e.target.value })} placeholder="000.000.000-00" />
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <Label htmlFor="ie">Inscrição Estadual (IE)</Label>
                                    <Input id="ie" value={form.ie} onChange={e => setForm({ ...form, ie: e.target.value })} placeholder="Isento ou números" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome / Razão Social *</Label>
                                <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Nome do cliente" />
                            </div>
                            {initialData && (
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <select
                                        id="status"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        value={form.status}
                                        onChange={e => setForm({ ...form, status: e.target.value })}
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telefone</Label>
                                    <Input id="phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <Button type="button" onClick={() => setActiveTab("endereco")}>Avançar</Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="endereco" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 border p-4 rounded-md bg-slate-50 dark:bg-slate-900/50">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="cep" className="flex justify-between">
                                        CEP
                                        <button type="button" onClick={handleCEP} className="text-xs text-primary hover:underline flex items-center gap-1">
                                            <Search className="h-3 w-3" /> Buscar
                                        </button>
                                    </Label>
                                    <Input id="cep" value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" />
                                </div>
                                <div className="space-y-2 col-span-2 lg:col-span-4">
                                    <Label htmlFor="logradouro">Logradouro / Rua</Label>
                                    <Input id="logradouro" value={form.logradouro} onChange={e => setForm({ ...form, logradouro: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <Label htmlFor="numero">Número</Label>
                                    <Input id="numero" value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2 lg:col-span-3">
                                    <Label htmlFor="bairro">Bairro</Label>
                                    <Input id="bairro" value={form.bairro} onChange={e => setForm({ ...form, bairro: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2 lg:col-span-3">
                                    <Label htmlFor="municipio">Município</Label>
                                    <Input id="municipio" value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <Label htmlFor="uf">UF</Label>
                                    <Input id="uf" maxLength={2} className="uppercase" value={form.uf} onChange={e => setForm({ ...form, uf: e.target.value })} />
                                </div>
                                <div className="space-y-2 col-span-2 lg:col-span-2">
                                    <Label htmlFor="codigo_municipio" className="flex items-center gap-2">
                                        Cód. IBGE do Município
                                        <span className="text-xs text-muted-foreground font-normal">(preenchido pelo CEP)</span>
                                    </Label>
                                    <Input
                                        id="codigo_municipio"
                                        value={form.codigo_municipio}
                                        onChange={e => setForm({ ...form, codigo_municipio: e.target.value })}
                                        placeholder="Ex: 2105500"
                                        maxLength={7}
                                    />
                                </div>
                                {/* Opcional para salvar o formato unificado antigo */}
                                <div className="space-y-2 col-span-2 lg:col-span-4 hidden">
                                    <Label htmlFor="address">Referência (Antigo)</Label>
                                    <Input id="address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex justify-between pt-2">
                                <Button type="button" variant="outline" onClick={() => setActiveTab("dados")}>Voltar</Button>
                                <Button type="submit" disabled={!form.name.trim()}>Salvar Cliente</Button>
                            </div>
                        </TabsContent>
                    </Tabs>
                </form>
            </DialogContent>
        </Dialog>
    );
}
