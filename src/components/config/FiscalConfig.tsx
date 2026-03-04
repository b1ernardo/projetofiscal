import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2, Upload, CheckCircle2, Trash2, Plus,
  Search, Star, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { useNaturezas, useAddNatureza, useDeleteNatureza, useSetNaturezaPadrao } from "@/hooks/useNaturezas";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────
const fiscalSchema = z.object({
  cnpj: z.string().min(14).max(14),
  ie: z.string().min(1),
  razao_social: z.string().min(1),
  nome_fantasia: z.string().optional(),
  logradouro: z.string().min(1),
  numero: z.string().min(1),
  bairro: z.string().min(1),
  municipio: z.string().min(1),
  cod_municipio: z.string().length(7),
  uf: z.string().length(2),
  cep: z.string().length(8),
  fone: z.string().optional(),
  ambiente: z.string(),
  ultimo_numero_nfe: z.coerce.number(),
  serie_nfe: z.coerce.number(),
  ultimo_numero_nfce: z.coerce.number(),
  serie_nfce: z.coerce.number(),
  csc_id: z.string().optional(),
  csc_token: z.string().optional(),
  certificado_senha: z.string().optional(),
  percentual_tributos: z.coerce.number().min(0).max(100).optional(),
});

type FiscalFormValues = z.infer<typeof fiscalSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function FiscalConfig() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [certificadoBase64, setCertificadoBase64] = useState<string | null>(null);

  // Naturezas
  const [novaNatureza, setNovaNatureza] = useState("");
  const [novaCFOP, setNovaCFOP] = useState("");
  const [searchNat, setSearchNat] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [listExpanded, setListExpanded] = useState(false);

  const { data: naturezas = [], isLoading: loadingNaturezas } = useNaturezas(searchNat || undefined);
  const addNatureza = useAddNatureza();
  const deleteNatureza = useDeleteNatureza();
  const setNaturezaPadrao = useSetNaturezaPadrao();

  const hasSearch = searchNat.trim().length > 0;
  const showList = listExpanded || hasSearch;
  const padraoNat = naturezas.find(n => n.padrao);

  const apiUrl = import.meta.env.VITE_API_URL || "/api";

  const form = useForm<FiscalFormValues>({
    resolver: zodResolver(fiscalSchema),
    defaultValues: {
      cnpj: "", ie: "", razao_social: "", nome_fantasia: "",
      logradouro: "", numero: "", bairro: "", municipio: "",
      cod_municipio: "", uf: "", cep: "", fone: "",
      ambiente: "2",
      ultimo_numero_nfe: 0, serie_nfe: 1,
      ultimo_numero_nfce: 0, serie_nfce: 1,
      csc_id: "", csc_token: "", certificado_senha: "",
      percentual_tributos: 0,
    },
  });

  useEffect(() => { fetchConfig(); }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${apiUrl}/fiscal/config`);
      const data = await res.json();
      if (data) {
        form.reset({
          ...data,
          ambiente: String(data.ambiente || "2"),
          csc_id: data.csc_id || "",
          csc_token: data.csc_token || "",
          nome_fantasia: data.nome_fantasia || "",
          fone: data.fone || "",
          certificado_senha: "",
          percentual_tributos: Number(data.percentual_tributos) || 0,
        });
      }
    } catch { toast.error("Erro ao carregar configurações fiscais"); }
    finally { setFetching(false); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCertificadoBase64(reader.result as string);
      toast.success("Certificado selecionado com sucesso");
    };
    reader.readAsDataURL(file);
  };

  async function onSubmit(values: FiscalFormValues) {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/fiscal/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, certificado_pfx: certificadoBase64 }),
      });
      if (res.ok) toast.success("Configurações fiscais salvas com sucesso!");
      else throw new Error("Falha ao salvar");
    } catch { toast.error("Erro ao salvar configurações"); }
    finally { setLoading(false); }
  }

  const handleAddNatureza = () => {
    if (!novaNatureza.trim()) return;
    addNatureza.mutate({ descricao: novaNatureza, cfop: novaCFOP.trim() || undefined });
    setNovaNatureza("");
    setNovaCFOP("");
  };

  if (fetching) return (
    <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  );

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

          {/* ── Dados do Emitente + Certificado ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Emitente</CardTitle>
                <CardDescription>Informações da sua empresa para a SEFAZ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="cnpj" render={({ field }) => (
                  <FormItem><FormLabel>CNPJ (Apenas números)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ie" render={({ field }) => (
                  <FormItem><FormLabel>Inscrição Estadual</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="razao_social" render={({ field }) => (
                  <FormItem><FormLabel>Razão Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-[1fr_2fr] gap-4">
                  <FormField control={form.control} name="cep" render={({ field }) => (
                    <FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} maxLength={8} placeholder="Apenas números" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bairro" render={({ field }) => (
                    <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-[3fr_1fr] gap-4">
                  <FormField control={form.control} name="logradouro" render={({ field }) => (
                    <FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="numero" render={({ field }) => (
                    <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-[1fr_2fr_2fr] gap-4">
                  <FormField control={form.control} name="uf" render={({ field }) => (
                    <FormItem><FormLabel>UF</FormLabel><FormControl><Input {...field} maxLength={2} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="municipio" render={({ field }) => (
                    <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cod_municipio" render={({ field }) => (
                    <FormItem><FormLabel>Cód. Município (IBGE)</FormLabel><FormControl><Input {...field} maxLength={7} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Certificado &amp; Ambiente</CardTitle>
                <CardDescription>Configurações de transmissão</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="ambiente" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ambiente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o ambiente" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="2">Homologação (Testes)</SelectItem>
                        <SelectItem value="1">Produção (Real)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="space-y-2">
                  <FormLabel>Certificado Digital (A1 .pfx)</FormLabel>
                  <div className="flex items-center gap-4">
                    <Button type="button" variant="outline" onClick={() => document.getElementById('cert-upload')?.click()}>
                      <Upload className="mr-2 h-4 w-4" /> Selecionar Arquivo
                    </Button>
                    {certificadoBase64 && <CheckCircle2 className="text-green-500 h-5 w-5" />}
                    <input id="cert-upload" type="file" className="hidden" accept=".pfx,.p12" onChange={handleFileUpload} />
                  </div>
                  <FormDescription>Selecione um novo certificado para atualizar.</FormDescription>
                </div>
                <FormField control={form.control} name="certificado_senha" render={({ field }) => (
                  <FormItem><FormLabel>Senha do Certificado</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          {/* ── NFC-e ── */}
          <Card>
            <CardHeader>
              <CardTitle>NFC-e (Consumidor)</CardTitle>
              <CardDescription>Dados para emissão de cupom fiscal</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="csc_id" render={({ field }) => (
                <FormItem><FormLabel>CSC ID (Identificador)</FormLabel><FormControl><Input {...field} placeholder="Ex: 000001" /></FormControl><FormDescription>Fornecido pela SEFAZ</FormDescription><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="csc_token" render={({ field }) => (
                <FormItem><FormLabel>CSC Token (Código)</FormLabel><FormControl><Input {...field} placeholder="Ex: AAAA-BBBB-CCCC-DDDD" /></FormControl><FormDescription>Código de Segurança do Contribuinte</FormDescription><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Tributação ── */}
          <Card>
            <CardHeader>
              <CardTitle>Tributação (Lei da Transparência)</CardTitle>
              <CardDescription>Cálculo automático de impostos na nota (Lei 12.741/2012)</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="percentual_tributos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Carga Tributária Média (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} placeholder="Ex: 31.42" /></FormControl>
                  <FormDescription>Usado para calcular a tag vTotTrib e mensagem do IBPT.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* ── Numeração ── */}
          <Card>
            <CardHeader><CardTitle>Numeração de Notas</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FormField control={form.control} name="serie_nfe" render={({ field }) => (
                <FormItem><FormLabel>Série NF-e</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ultimo_numero_nfe" render={({ field }) => (
                <FormItem><FormLabel>Última NF-e</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="serie_nfce" render={({ field }) => (
                <FormItem><FormLabel>Série NFC-e</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="ultimo_numero_nfce" render={({ field }) => (
                <FormItem><FormLabel>Última NFC-e</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Configurações Fiscais
          </Button>
        </form>
      </Form>

      {/* ─── Naturezas da Operação ─────────────────────────────────────────── */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Naturezas da Operação Pré-Cadastradas</CardTitle>
          <CardDescription>
            Cadastre e organize naturezas para uso nas NF-e. Defina uma como <strong>padrão</strong> (⭐) para ser pré-selecionada automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">

          {/* Natureza padrão em destaque */}
          {padraoNat && (
            <div className="flex items-center gap-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-3">
              <Star className="h-5 w-5 text-yellow-500 fill-yellow-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wide">Natureza Padrão para NF-e</p>
                <p className="font-medium text-sm truncate">{padraoNat.descricao}</p>
              </div>
              {padraoNat.cfop && (
                <Badge variant="outline" className="text-xs border-yellow-400 text-yellow-700 dark:text-yellow-300 shrink-0">
                  CFOP {padraoNat.cfop}
                </Badge>
              )}
            </div>
          )}

          {/* Formulário de adição */}
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Descrição (max 60 chars)</label>
              <Input
                placeholder="Ex: VENDA DE MERCADORIA"
                value={novaNatureza}
                className="uppercase text-sm"
                maxLength={60}
                onChange={(e) => setNovaNatureza(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNatureza(); } }}
              />
            </div>
            <div className="w-[110px] space-y-1">
              <label className="text-xs font-medium text-muted-foreground">CFOP (opcional)</label>
              <Input
                placeholder="Ex: 5102"
                value={novaCFOP}
                maxLength={5}
                onChange={(e) => setNovaCFOP(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNatureza(); } }}
              />
            </div>
            <Button
              type="button" variant="secondary" className="gap-1"
              disabled={!novaNatureza.trim() || addNatureza.isPending}
              onClick={handleAddNatureza}
            >
              {addNatureza.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Adicionar
            </Button>
          </div>

          {/* Barra de busca */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou CFOP..."
                value={searchInput}
                className="pl-9 h-9"
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSearchNat(searchInput); }}
              />
            </div>
            <Button size="sm" className="h-9 gap-1" onClick={() => setSearchNat(searchInput)}>
              <Search className="h-4 w-4" />
            </Button>
            {searchNat && (
              <Button size="sm" variant="ghost" className="h-9 gap-1" onClick={() => { setSearchNat(""); setSearchInput(""); }}>
                <X className="h-4 w-4" /> Limpar
              </Button>
            )}
            {!hasSearch && (
              <Button size="sm" variant="ghost" className="h-9 gap-1 ml-auto" onClick={() => setListExpanded(v => !v)}>
                {listExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {listExpanded ? "Recolher" : `Ver todas (${naturezas.length})`}
              </Button>
            )}
          </div>

          {/* Lista */}
          {loadingNaturezas ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : !showList ? (
            <p className="text-sm text-muted-foreground italic">
              {naturezas.length === 0
                ? "Nenhuma natureza cadastrada ainda."
                : `${naturezas.length} natureza(s) cadastrada(s). Use a busca ou clique em "Ver todas" para exibir a lista.`}
            </p>
          ) : naturezas.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nenhuma natureza encontrada para "{searchNat}".</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {naturezas.map((nat) => (
                <div
                  key={nat.id}
                  className={`flex items-center gap-2 rounded-lg border p-3 shadow-sm transition-colors ${nat.padrao
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700"
                      : "bg-background"
                    }`}
                >
                  {/* Botão estrela — define padrão */}
                  <button
                    type="button"
                    title={nat.padrao ? "Natureza padrão" : "Definir como padrão para NF-e"}
                    className={`shrink-0 transition-colors ${nat.padrao ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-400"}`}
                    onClick={() => { if (!nat.padrao) setNaturezaPadrao.mutate(nat.id); }}
                  >
                    <Star className={`h-4 w-4 ${nat.padrao ? "fill-yellow-400" : ""}`} />
                  </button>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{nat.descricao}</p>
                    {nat.cfop && (
                      <span className="text-xs text-muted-foreground font-mono">CFOP {nat.cfop}</span>
                    )}
                  </div>

                  {/* Excluir */}
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={deleteNatureza.isPending}
                    onClick={() => { if (confirm(`Excluir '${nat.descricao}'?`)) deleteNatureza.mutate(nat.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
