import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, X, FileText } from "lucide-react";
import { BoxConfigSection } from "./BoxConfigSection";
import { useQuery } from "@tanstack/react-query";
import { BoxConfig } from "@/hooks/useProducts";
import { toast } from "sonner";

interface ProductFormData {
  name: string;
  code: string;
  category: string;
  unit: string;
  costPrice: number;
  margin: number;
  salePrice: number;
  stock: number;
  stockMin: number;
  imageUrl: string;
  ncm: string;
  cest: string;
  cfop_padrao: string;
  origem: number;
  cst: string;
  csosn: string;
  pis_cst_entrada: string;
  pis_cst_saida: string;
  pis_aliquota: number;
  cofins_aliquota: number;
  ipi_cst: string;
  ipi_aliquota: number;
  boxConfigs: BoxConfig[];
  productCode?: number;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: ProductFormData) => void;
  initialData?: ProductFormData | null;
  title: string;
}

const units = ["un", "kg", "g", "L", "ml", "cx", "pct", "par", "dz"];

const defaultData: ProductFormData = {
  name: "",
  code: "",
  category: "",
  unit: "un",
  costPrice: 0,
  margin: 0,
  salePrice: 0,
  stock: 0,
  stockMin: 0,
  imageUrl: "",
  ncm: "",
  cest: "",
  cfop_padrao: "5102",
  origem: 0,
  cst: "00",
  csosn: "102",
  pis_cst_entrada: "07",
  pis_cst_saida: "07",
  pis_aliquota: 0,
  cofins_aliquota: 0,
  ipi_cst: "53",
  ipi_aliquota: 0,
  boxConfigs: [],
  productCode: 0,
};

export function ProductFormDialog({ open, onOpenChange, onSave, initialData, title }: ProductFormDialogProps) {
  const [form, setForm] = useState<ProductFormData>(defaultData);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [ncmDescription, setNcmDescription] = useState<string>("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/categories`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Falha ao carregar categorias');
      return await response.json();
    },
  });

  useEffect(() => {
    if (open) {
      if (!initialData) {
        setForm(defaultData);
        setImagePreview("");
        // Busca o próximo código sequencial
        fetch(`${import.meta.env.VITE_API_URL}/products/next-code`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data.nextCode) {
              setForm(prev => ({ ...prev, productCode: data.nextCode }));
            }
          })
          .catch(err => console.error("Erro ao carregar próximo código", err));
      } else {
        setForm(initialData);
        setImagePreview(initialData.imageUrl || "");
      }
    }
  }, [open, initialData]);

  useEffect(() => {
    const fetchNcmDesc = async () => {
      if (form.ncm && form.ncm.length === 8) {
        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/fiscal/ncm/${form.ncm}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
          });
          if (response.ok) {
            const data = await response.json();
            setNcmDescription(data?.descricao || "NCM não encontrado");
          }
        } catch (error) {
          console.error("Erro ao carregar descrição NCM", error);
        }
      } else {
        setNcmDescription("");
      }
    };
    fetchNcmDesc();
  }, [form.ncm]);

  const handleSearchNcm = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && form.name.trim().length >= 3) {
      e.preventDefault(); // Evita submissão do formulário se houver
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/fiscal/ncm/search?query=${encodeURIComponent(form.name.trim())}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (response.ok) {
          const results = await response.json();
          if (results.length > 0) {
            updateField("ncm", results[0].codigo);
            toast.success(`NCM ${results[0].codigo} encontrado para "${form.name.trim()}"`);
          } else {
            toast.error(`Nenhum NCM encontrado para "${form.name.trim()}"`);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar NCM", error);
        toast.error("Erro ao buscar NCM. Tente novamente.");
      }
    }
  };

  const updateField = <K extends keyof ProductFormData>(key: K, value: ProductFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "costPrice" || key === "margin") {
        const cost = key === "costPrice" ? (value as number) : prev.costPrice;
        const margin = key === "margin" ? (value as number) : prev.margin;
        next.salePrice = parseFloat((cost * (1 + margin / 100)).toFixed(2));
      }
      if (key === "salePrice" && prev.costPrice > 0) {
        next.margin = parseFloat((((value as number) / prev.costPrice - 1) * 100).toFixed(2));
      }
      return next;
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setForm((prev) => ({ ...prev, imageUrl: result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview("");
    setForm((prev) => ({ ...prev, imageUrl: "" }));
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preencha os dados do produto abaixo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {/* Image */}
          <div className="space-y-2">
            <Label>Imagem <span className="text-xs text-muted-foreground">(PNG, JPG, GIF)</span></Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative h-24 w-24 rounded-lg border overflow-hidden">
                  <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                  <button onClick={removeImage} className="absolute top-1 right-1 rounded-full bg-background/80 p-0.5 hover:bg-destructive hover:text-white transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors">
                  <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Enviar</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                onKeyDown={handleSearchNcm}
              />
              <span className="text-[9px] font-normal text-muted-foreground uppercase tracking-tight block">Enter para buscar NCM</span>
            </div>
            <div className="space-y-2">
              <Label>Código do Produto</Label>
              <Input value={form.productCode || ""} disabled className="bg-muted cursor-not-allowed" />
            </div>
            <div className="space-y-2">
              <Label>Código de Barras</Label>
              <Input value={form.code} onChange={(e) => updateField("code", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={(v) => updateField("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Custo</Label>
              <Input type="number" step="0.01" value={form.costPrice || ""} onChange={(e) => updateField("costPrice", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Margem (%)</Label>
              <Input type="number" step="0.1" value={form.margin || ""} onChange={(e) => updateField("margin", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Venda</Label>
              <Input type="number" step="0.01" value={form.salePrice || ""} onChange={(e) => updateField("salePrice", Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estoque Atual</Label>
              <Input type="number" value={form.stock || ""} onChange={(e) => updateField("stock", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Estoque Mínimo</Label>
              <Input type="number" value={form.stockMin || ""} onChange={(e) => updateField("stockMin", Number(e.target.value))} />
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Informações Fiscais</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label>NCM</Label>
                <Input value={form.ncm} onChange={(e) => updateField("ncm", e.target.value)} maxLength={8} />
                {ncmDescription && (
                  <p className="text-[10px] text-muted-foreground leading-tight">{ncmDescription}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>CEST</Label>
                <Input value={form.cest} onChange={(e) => updateField("cest", e.target.value)} maxLength={7} />
              </div>
              <div className="space-y-2">
                <Label>CFOP</Label>
                <Input value={form.cfop_padrao} onChange={(e) => updateField("cfop_padrao", e.target.value)} maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={String(form.origem)} onValueChange={(v) => updateField("origem", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0 - Nacional</SelectItem>
                    <SelectItem value="1">1 - Estrangeira (Direta)</SelectItem>
                    <SelectItem value="2">2 - Estrangeira (Interno)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CST</Label>
                <Select value={form.cst} onValueChange={(v) => updateField("cst", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectGroup>
                      <SelectItem value="00">00 - Tributada Integralmente</SelectItem>
                      <SelectItem value="10">10 - Tributada e c/ ICMS ST</SelectItem>
                      <SelectItem value="20">20 - Com Redução de Base</SelectItem>
                      <SelectItem value="30">30 - Isenta/Não Tributada e c/ ICMS ST</SelectItem>
                      <SelectItem value="40">40 - Isenta</SelectItem>
                      <SelectItem value="41">41 - Não Tributada</SelectItem>
                      <SelectItem value="50">50 - Suspensão</SelectItem>
                      <SelectItem value="51">51 - Diferimento</SelectItem>
                      <SelectItem value="60">60 - ICMS Anterior por ST</SelectItem>
                      <SelectItem value="70">70 - Redução Base e c/ ICMS ST</SelectItem>
                      <SelectItem value="90">90 - Outras</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CSOSN</Label>
                <Select value={form.csosn} onValueChange={(v) => updateField("csosn", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectGroup>
                      <SelectItem value="101">101 - Tributada c/ Permissão de Crédito</SelectItem>
                      <SelectItem value="102">102 - Tributada s/ Permissão de Crédito</SelectItem>
                      <SelectItem value="103">103 - Isenção ICMS p/ Faixa de Receita</SelectItem>
                      <SelectItem value="201">201 - Trib. c/ P.Cred e ICMS ST</SelectItem>
                      <SelectItem value="202">202 - Trib. s/ P.Cred e ICMS ST</SelectItem>
                      <SelectItem value="203">203 - Isenção e c/ ICMS ST</SelectItem>
                      <SelectItem value="300">300 - Imune</SelectItem>
                      <SelectItem value="400">400 - Não Tributada</SelectItem>
                      <SelectItem value="500">500 - ICMS Anterior por ST</SelectItem>
                      <SelectItem value="900">900 - Outros (SN)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* PIS / COFINS */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-1">PIS / COFINS</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CST Entrada</Label>
                <Select value={form.pis_cst_entrada} onValueChange={(v) => updateField("pis_cst_entrada", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="01">01 - Op. Tributável (BC = Valor Op.)</SelectItem>
                    <SelectItem value="02">02 - Op. Tributável (BC = Valor Op. por Alíq. Dif.)</SelectItem>
                    <SelectItem value="03">03 - Op. Tributável (BC = Qtd. Vendida por Alíq.)</SelectItem>
                    <SelectItem value="04">04 - Op. Tributável (Tributação Monofásica)</SelectItem>
                    <SelectItem value="05">05 - Op. Tributável (Substituição Tributária)</SelectItem>
                    <SelectItem value="06">06 - Op. Tributável (Alíquota Zero)</SelectItem>
                    <SelectItem value="07">07 - Op. Isenta da Contribuição</SelectItem>
                    <SelectItem value="08">08 - Op. Sem Incidência da Contribuição</SelectItem>
                    <SelectItem value="09">09 - Op. com Suspensão da Contribuição</SelectItem>
                    <SelectItem value="49">49 - Outras Operações de Saída</SelectItem>
                    <SelectItem value="50">50 - Op. com Direito a Crédito</SelectItem>
                    <SelectItem value="70">70 - Op. de Aquisição a Alíquota Zero</SelectItem>
                    <SelectItem value="99">99 - Outras Operações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CST Saída</Label>
                <Select value={form.pis_cst_saida} onValueChange={(v) => updateField("pis_cst_saida", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="01">01 - Op. Tributável (BC = Valor Op.)</SelectItem>
                    <SelectItem value="02">02 - Op. Tributável (BC = Valor Op. por Alíq. Dif.)</SelectItem>
                    <SelectItem value="03">03 - Op. Tributável (BC = Qtd. Vendida por Alíq.)</SelectItem>
                    <SelectItem value="04">04 - Op. Tributável (Tributação Monofásica)</SelectItem>
                    <SelectItem value="05">05 - Op. Tributável (Substituição Tributária)</SelectItem>
                    <SelectItem value="06">06 - Op. Tributável (Alíquota Zero)</SelectItem>
                    <SelectItem value="07">07 - Op. Isenta da Contribuição</SelectItem>
                    <SelectItem value="08">08 - Op. Sem Incidência da Contribuição</SelectItem>
                    <SelectItem value="09">09 - Op. com Suspensão da Contribuição</SelectItem>
                    <SelectItem value="49">49 - Outras Operações de Saída</SelectItem>
                    <SelectItem value="99">99 - Outras Operações</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alíq. PIS %</Label>
                <Input
                  type="number" step="0.01" min="0" max="100"
                  value={form.pis_aliquota}
                  onChange={(e) => updateField("pis_aliquota", parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <Label>Alíq. COFINS %</Label>
                <Input
                  type="number" step="0.01" min="0" max="100"
                  value={form.cofins_aliquota}
                  onChange={(e) => updateField("cofins_aliquota", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* IPI */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider pt-1">I.P.I.</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CST</Label>
                <Select value={form.ipi_cst} onValueChange={(v) => updateField("ipi_cst", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="00">00 - Entrada com Recuperação de Crédito</SelectItem>
                    <SelectItem value="01">01 - Entrada Tributada com Alíquota Zero</SelectItem>
                    <SelectItem value="02">02 - Entrada Isenta</SelectItem>
                    <SelectItem value="03">03 - Entrada Não Tributada</SelectItem>
                    <SelectItem value="04">04 - Entrada Imune</SelectItem>
                    <SelectItem value="05">05 - Entrada com Suspensão</SelectItem>
                    <SelectItem value="49">49 - Outras Entradas</SelectItem>
                    <SelectItem value="50">50 - Saída Tributada</SelectItem>
                    <SelectItem value="51">51 - Saída Tributável com Alíquota Zero</SelectItem>
                    <SelectItem value="52">52 - Saída Isenta</SelectItem>
                    <SelectItem value="53">53 - Saída Não Tributada</SelectItem>
                    <SelectItem value="54">54 - Saída Imune</SelectItem>
                    <SelectItem value="55">55 - Saída com Suspensão</SelectItem>
                    <SelectItem value="99">99 - Outras Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Alíquota %</Label>
                <Input
                  type="number" step="0.01" min="0" max="100"
                  value={form.ipi_aliquota}
                  onChange={(e) => updateField("ipi_aliquota", parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <BoxConfigSection
            configs={form.boxConfigs}
            onChange={(configs) => setForm(prev => ({ ...prev, boxConfigs: configs }))}
            salePrice={form.salePrice}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(form)} disabled={!form.name.trim()}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  );
}
