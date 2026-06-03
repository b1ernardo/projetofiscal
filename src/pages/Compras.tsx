import { useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, FileUp, Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface XmlItem {
  name: string;
  ean: string;
  ncm: string;
  unit: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  origem: number;
  // CFOP
  cfop_entrada: string;
  cfop_saida: string;
  // ICMS
  cst_icms_entrada: string;
  csosn_entrada: string;
  cst_saida: string;
  csosn_saida: string;
  aliq_icms: number;
  // PIS
  pis_cst_entrada: string;
  pis_cst_saida: string;
  pis_aliquota: number;
  // COFINS
  cofins_cst_entrada: string;
  cofins_cst_saida: string;
  cofins_aliquota: number;
  // IPI
  ipi_cst_entrada: string;
  ipi_cst_saida: string;
  ipi_aliquota: number;
  // Status no cadastro
  is_new: boolean;
  product_id: string | null;
  product_name: string | null;
  current_sale_price: number;
  current_cost_price: number;
  sale_price: number;
  margin_percent: number;
  // Campos editáveis pelo usuário
  _sale_price_edit: number;
  _margin_edit: number;
  _skip: boolean;
  _conv_factor: number;
}

interface XmlParseResult {
  supplier: {
    cnpj: string;
    name: string;
    razao_social: string;
    ie: string;
    id?: string;
    exists: boolean;
  } | null;
  items: XmlItem[];
  total: number;
}

export default function Compras() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const xmlInputRef = useRef<HTMLInputElement>(null);

  const [xmlLoading, setXmlLoading] = useState(false);
  const [xmlResult, setXmlResult] = useState<XmlParseResult | null>(null);
  const [showXmlDialog, setShowXmlDialog] = useState(false);
  const [globalMargin, setGlobalMargin] = useState<number>(30);
  const [saveSupplier, setSaveSupplier] = useState(false);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/purchases`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}` }
      });
      if (!response.ok) throw new Error("Falha ao carregar compras");
      const data = await response.json();
      return data.map((p: any) => ({
        ...p,
        supplierName: p.supplier_name ?? "—",
        itemCount: p.item_count ?? 0,
      }));
    },
  });

  const savePurchase = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Erro ao salvar compra");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  // ── XML Import ────────────────────────────────────────────────────

  const handleXmlFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xml")) {
      toast.error("Selecione um arquivo XML de NF-e.");
      return;
    }
    setXmlLoading(true);
    try {
      const formData = new FormData();
      formData.append("xml", file);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/purchases/parse-xml`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${localStorage.getItem("auth_token")}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) { toast.error(data.message || "Erro ao processar XML"); return; }

      const enriched: XmlItem[] = (data.items || []).map((it: any) => ({
        ...it,
        _sale_price_edit: it.sale_price ?? it.unit_price * 1.3,
        _margin_edit: it.margin_percent ?? 30,
        _skip: false,
        _conv_factor: 1,
      }));
      setXmlResult({ ...data, items: enriched });
      setShowXmlDialog(true);
    } catch (err: any) {
      toast.error("Erro ao ler o XML: " + err.message);
    } finally {
      setXmlLoading(false);
      if (xmlInputRef.current) xmlInputRef.current.value = "";
    }
  };

  const handleXmlItemSalePriceChange = useCallback((idx: number, value: number) => {
    setXmlResult(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      const cost = items[idx].unit_price;
      items[idx] = {
        ...items[idx],
        _sale_price_edit: value,
        _margin_edit: cost > 0 ? parseFloat(((value - cost) / cost * 100).toFixed(2)) : 0,
      };
      return { ...prev, items };
    });
  }, []);

  const handleXmlItemMarginChange = useCallback((idx: number, margin: number) => {
    setXmlResult(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      const cost = items[idx].unit_price;
      items[idx] = {
        ...items[idx],
        _margin_edit: margin,
        _sale_price_edit: parseFloat((cost * (1 + margin / 100)).toFixed(2)),
      };
      return { ...prev, items };
    });
  }, []);

  const handleXmlItemFactorChange = useCallback((idx: number, factor: number) => {
    setXmlResult(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      const it = items[idx];
      const f = factor > 0 ? factor : 1;
      const costPerUnit = it.unit_price / f;
      
      items[idx] = {
        ...it,
        _conv_factor: f,
        _sale_price_edit: parseFloat((costPerUnit * (1 + it._margin_edit / 100)).toFixed(2)),
      };
      return { ...prev, items };
    });
  }, []);

  const handleXmlItemSkipToggle = useCallback((idx: number) => {
    setXmlResult(prev => {
      if (!prev) return prev;
      const items = [...prev.items];
      items[idx] = { ...items[idx], _skip: !items[idx]._skip };
      return { ...prev, items };
    });
  }, []);

  const applyGlobalMargin = () => {
    setXmlResult(prev => {
      if (!prev) return prev;
      const items = prev.items.map(it => ({
        ...it,
        _margin_edit: globalMargin,
        _sale_price_edit: parseFloat((it.unit_price * (1 + globalMargin / 100)).toFixed(2)),
      }));
      return { ...prev, items };
    });
  };

  const handleConfirmXmlImport = async () => {
    if (!xmlResult) return;
    const activeItems = xmlResult.items.filter(it => !it._skip);
    if (activeItems.length === 0) { toast.error("Nenhum item selecionado."); return; }

    const existingItems = activeItems
      .filter(it => !it.is_new && it.product_id)
      .map(it => ({
        product_id: it.product_id,
        quantity: it.quantity * it._conv_factor,
        unit_price: it.unit_price / it._conv_factor,
        sale_price: it._sale_price_edit
      }));

    const newProducts = activeItems
      .filter(it => it.is_new)
      .map(it => ({
        // Dados do produto
        name:               it.name,
        ean:                it.ean,
        ncm:                it.ncm,
        unit:               it._conv_factor > 1 ? 'UN' : it.unit,
        quantity:           it.quantity * it._conv_factor,
        unit_price:         it.unit_price / it._conv_factor,
        sale_price:         it._sale_price_edit,
        origem:             it.origem,
        // CFOP convertido
        cfop_saida:         it.cfop_saida,
        // ICMS
        cst_saida:          it.cst_saida,
        csosn_saida:        it.csosn_saida,
        // PIS
        pis_cst_entrada:    it.pis_cst_entrada,
        pis_cst_saida:      it.pis_cst_saida,
        pis_aliquota:       it.pis_aliquota,
        // COFINS
        cofins_cst_entrada: it.cofins_cst_entrada,
        cofins_cst_saida:   it.cofins_cst_saida,
        cofins_aliquota:    it.cofins_aliquota,
        // IPI
        ipi_cst_saida:      it.ipi_cst_saida,
        ipi_aliquota:       it.ipi_aliquota,
      }));

    const payload: any = {
      supplier_id: xmlResult.supplier?.id ?? null,
      items: existingItems,
      new_products: newProducts,
      total_amount: activeItems.reduce((s, it) => s + it.total_price, 0),
    };

    // Se o fornecedor não existe e o usuário quer salvar nos cadastros
    if (!xmlResult.supplier?.exists && saveSupplier && xmlResult.supplier) {
      payload.save_supplier = true;
      payload.supplier_data = {
        name: xmlResult.supplier.name || xmlResult.supplier.razao_social,
        razao_social: xmlResult.supplier.razao_social,
        cnpj: xmlResult.supplier.cnpj,
        ie: xmlResult.supplier.ie,
      };
    }

    try {
      await savePurchase.mutateAsync(payload);
      toast.success("Compra importada via XML com sucesso!");
      setShowXmlDialog(false);
      setSaveSupplier(false);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Compras</h1>
            <p className="text-muted-foreground">Registre compras de fornecedores</p>
          </div>
          <div className="flex gap-2">
            {/* Botão XML */}
            <input
              ref={xmlInputRef}
              type="file"
              accept=".xml"
              className="hidden"
              id="xml-upload-compras"
              onChange={handleXmlFileSelect}
            />
            <Button
              variant="outline"
              className="border-blue-500 text-blue-700 hover:bg-blue-50 gap-2"
              onClick={() => xmlInputRef.current?.click()}
              disabled={xmlLoading}
            >
              {xmlLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <FileUp className="h-4 w-4" />}
              {xmlLoading ? "Lendo XML..." : "Importar XML (NF-e)"}
            </Button>
            <Button onClick={() => navigate("/nova-compra")}>
              <Plus className="mr-2 h-4 w-4" /> Nova Compra
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Histórico de Compras</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : purchases.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhuma compra registrada.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium">{p.supplierName}</TableCell>
                      <TableCell className="text-right">{p.itemCount}</TableCell>
                      <TableCell className="text-right font-bold">{fmt(p.total_amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modal de Importação XML ── */}
      <Dialog open={showXmlDialog} onOpenChange={(open) => { setShowXmlDialog(open); if (!open) setSaveSupplier(false); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileUp className="h-5 w-5 text-blue-600" />
              Importação de NF-e via XML
            </DialogTitle>
            <DialogDescription>
              Revise os itens da nota fiscal. Produtos marcados como{" "}
              <Badge variant="destructive" className="text-[10px] py-0 px-1">NOVO</Badge>{" "}
              serão cadastrados automaticamente. Defina o preço de venda ou aplique uma margem de lucro.
            </DialogDescription>
          </DialogHeader>

          {xmlResult && (
            <>
              {/* Dados do fornecedor */}
              <div className="px-6 py-3 bg-blue-50 border-b flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Emitente (Fornecedor)</span>
                  <span className="font-semibold">{xmlResult.supplier?.name || xmlResult.supplier?.razao_social || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">CNPJ</span>
                  <span className="font-mono">{xmlResult.supplier?.cnpj || "—"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Fornecedor cadastrado</span>
                  {xmlResult.supplier?.exists
                    ? <span className="flex items-center gap-1 text-green-700"><CheckCircle2 className="h-3 w-3" /> Sim (vinculado)</span>
                    : (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-orange-600">
                          <AlertCircle className="h-3 w-3" /> Não encontrado
                        </span>
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 bg-white border border-slate-300 rounded px-2 py-0.5 text-xs hover:bg-slate-50">
                          <input
                            type="checkbox"
                            checked={saveSupplier}
                            onChange={(e) => setSaveSupplier(e.target.checked)}
                            className="accent-blue-600 w-3.5 h-3.5"
                          />
                          Salvar nos cadastros
                        </label>
                      </div>
                    )
                  }
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Total NF-e</span>
                  <span className="font-bold text-green-700">{fmt(xmlResult.total)}</span>
                </div>
              </div>

              {/* Margem global */}
              <div className="px-6 py-2 border-b bg-slate-50 flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Margem global:</span>
                <Input
                  type="number" step="0.5" min="0" max="1000"
                  value={globalMargin}
                  onChange={(e) => setGlobalMargin(Number(e.target.value))}
                  className="w-20 h-8 text-right"
                />
                <span className="text-sm text-slate-600">%</span>
                <Button size="sm" variant="outline" onClick={applyGlobalMargin} className="h-8 gap-1">
                  <RefreshCw className="h-3 w-3" /> Aplicar a todos
                </Button>
              </div>

              {/* Tabela de itens */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 border-b sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left w-8">#</th>
                      <th className="px-3 py-2 text-left">Produto (XML)</th>
                      <th className="px-3 py-2 text-center w-16">Status</th>
                      <th className="px-3 py-2 text-right w-16">Qtd</th>
                      <th className="px-3 py-2 text-right w-16">Fator/Cx</th>
                      <th className="px-3 py-2 text-right w-24">Custo {xmlResult.items.some(it => it._conv_factor > 1) ? "Final" : "(R$)"}</th>
                      <th className="px-3 py-2 text-right w-24">Margem (%)</th>
                      <th className="px-3 py-2 text-right w-28">Venda (R$)</th>
                      <th className="px-3 py-2 text-center w-16">Incluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {xmlResult.items.map((it, idx) => (
                      <tr key={idx} className={cn(
                        "border-b transition-colors",
                        it._skip ? "opacity-40 bg-slate-50" : it.is_new ? "bg-amber-50/60" : "hover:bg-slate-50"
                      )}>
                        <td className="px-3 py-2 text-center text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{it.name}</div>
                          <div className="text-[10px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {it.ean && <span><strong>EAN:</strong> {it.ean}</span>}
                            {it.ncm && <span><strong>NCM:</strong> {it.ncm}</span>}
                            {it.unit && <span><strong>UN:</strong> {it.unit}</span>}
                            {it.cfop_saida && <span className="text-blue-600 font-medium"><strong>CFOP:</strong> {it.cfop_saida}</span>}
                            {(it.cst_saida || it.csosn_saida) && (
                              <span className="text-green-600 font-medium">
                                <strong>CST/CSOSN:</strong> {it.csosn_saida || it.cst_saida}
                              </span>
                            )}
                            {!it.is_new && it.product_name && <span className="text-slate-500 italic">→ {it.product_name}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {it.is_new
                            ? <Badge variant="destructive" className="text-[9px] py-0 px-1">NOVO</Badge>
                            : <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-green-100 text-green-700">EXISTE</Badge>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {it.quantity.toFixed(3)}
                          {it._conv_factor > 1 && (
                            <div className="text-[10px] text-green-600 font-bold">
                              → {(it.quantity * it._conv_factor).toFixed(0)} un
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" step="1" min="1"
                            value={it._conv_factor}
                            onChange={(e) => handleXmlItemFactorChange(idx, Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="h-7 text-right text-xs w-16 ml-auto font-bold border-blue-400 bg-blue-50"
                            disabled={it._skip}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {(it.unit_price / it._conv_factor).toFixed(2)}
                          {it._conv_factor > 1 && (
                            <div className="text-[10px] text-slate-400 font-normal line-through">
                              orig: {it.unit_price.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" step="0.5" min="0"
                            value={it._margin_edit}
                            onChange={(e) => handleXmlItemMarginChange(idx, Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="h-7 text-right text-xs w-20 ml-auto"
                            disabled={it._skip}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number" step="0.01" min="0"
                            value={it._sale_price_edit}
                            onChange={(e) => handleXmlItemSalePriceChange(idx, Number(e.target.value))}
                            onFocus={(e) => e.target.select()}
                            className="h-7 text-right text-xs w-24 ml-auto font-semibold"
                            disabled={it._skip}
                          />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={!it._skip}
                            onChange={() => handleXmlItemSkipToggle(idx)}
                            className="w-4 h-4 accent-blue-600 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumo */}
              <div className="px-6 py-2 border-t bg-slate-50 text-xs text-slate-600 flex gap-6 flex-wrap">
                <span><strong className="text-amber-600">{xmlResult.items.filter(i => i.is_new && !i._skip).length}</strong> novo(s) a cadastrar</span>
                <span><strong className="text-green-600">{xmlResult.items.filter(i => !i.is_new && !i._skip).length}</strong> já existente(s)</span>
                <span><strong className="text-slate-500">{xmlResult.items.filter(i => i._skip).length}</strong> ignorado(s)</span>
                <span className="ml-auto font-bold text-blue-700">
                  Total: {fmt(xmlResult.items.filter(i => !i._skip).reduce((s, i) => s + i.total_price, 0))}
                </span>
              </div>
            </>
          )}

          <DialogFooter className="px-6 py-3 border-t gap-2">
            <Button variant="outline" onClick={() => setShowXmlDialog(false)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
              onClick={handleConfirmXmlImport}
              disabled={savePurchase.isPending}
            >
              {savePurchase.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
                : <><Save className="h-4 w-4" /> Confirmar Importação</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
