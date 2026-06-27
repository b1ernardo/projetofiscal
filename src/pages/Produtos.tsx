import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, MoreHorizontal, Package, Loader2, Tags, Copy, FileSpreadsheet, Upload, Download } from "lucide-react";
import { useState, useRef } from "react";
import { CategoryManager } from "@/components/config/CategoryManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProductFormDialog } from "@/components/produtos/ProductFormDialog";
import { toast } from "sonner";
import { useProducts, useSaveProduct, useDeleteProduct, type ProductWithBoxConfigs, type BoxConfig } from "@/hooks/useProducts";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Produtos() {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithBoxConfigs | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useProducts();
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code ?? "").includes(search) ||
    (p.product_code?.toString() ?? "").includes(search)
  );


  const handleNew = () => {
    setEditProduct(null);
    setFormOpen(true);
  };

  const handleExportExcel = () => {
    const headers = [
      "Código",
      "Produto",
      "Categoria",
      "Unidade",
      "Custo",
      "Preço Venda",
      "Preço 2",
      "Estoque Atual",
      "Estoque Mínimo",
      "NCM",
      "CEST",
      "Código Barras",
      "CFOP Padrão",
      "Origem",
      "CST",
      "CSOSN",
      "CST PIS Ent.",
      "CST PIS Saída",
      "Aliq. PIS",
      "Aliq. COFINS",
      "CST IPI",
      "Aliq. IPI"
    ];

    const data = filtered.map((p) => [
      p.product_code || "",
      (p.name || "").replace(/"/g, '""'),
      (p.category_name || "—").replace(/"/g, '""'),
      p.unit || "",
      (p.cost_price || 0).toString().replace(".", ","),
      (p.sale_price || 0).toString().replace(".", ","),
      (p.sale_price2 || 0).toString().replace(".", ","),
      p.stock_current || 0,
      p.stock_min || 0,
      p.ncm || "",
      p.cest || "",
      p.code || "",
      p.cfop_padrao || "",
      p.origem !== null && p.origem !== undefined ? p.origem.toString() : "0",
      p.cst || "",
      p.csosn || "",
      p.pis_cst_entrada || "",
      p.pis_cst_saida || "",
      p.pis_aliquota ? p.pis_aliquota.toString().replace(".", ",") : "0",
      p.cofins_aliquota ? p.cofins_aliquota.toString().replace(".", ",") : "0",
      p.ipi_cst || "",
      p.ipi_aliquota ? p.ipi_aliquota.toString().replace(".", ",") : "0"
    ]);

    const csvContent = [
      headers.join(";"),
      ...data.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `produtos_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Planilha de Excel gerada com sucesso!");
  };

  const handleDownloadModelCSV = () => {
    const headers = [
      "Código",
      "Produto",
      "Categoria",
      "Unidade",
      "Custo",
      "Preço Venda",
      "Preço 2",
      "Estoque Atual",
      "Estoque Mínimo",
      "NCM",
      "CEST",
      "Código Barras",
      "CFOP Padrão",
      "Origem",
      "CST",
      "CSOSN",
      "CST PIS Ent.",
      "CST PIS Saída",
      "Aliq. PIS",
      "Aliq. COFINS",
      "CST IPI",
      "Aliq. IPI"
    ];

    const data = [
      ["1001", "Produto Exemplo 1", "Categoria A", "UN", "10,50", "20,00", "18,00", "50", "10", "12345678", "1234567", "7891234567890", "5102", "0", "00", "102", "07", "07", "0", "0", "53", "0"],
      ["1002", "Produto Exemplo 2", "Categoria B", "CX", "25,00", "50,00", "45,00", "20", "5", "", "", "", "5102", "0", "00", "102", "07", "07", "0", "0", "53", "0"]
    ];

    const csvContent = [
      headers.join(";"),
      ...data.map((row) => row.map((cell) => `"${cell}"`).join(";")),
    ].join("\r\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "planilha_modelo_produtos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Planilha modelo baixada com sucesso!");
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) return;

        // Prevent users from uploading .xlsx files that are binary ZIPs
        if (text.startsWith("PK") || text.includes("xl/workbook.xml")) {
          toast.error("Por favor, selecione um arquivo CSV separador por vírgulas válido e não um .xlsx (Excel).");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) {
          toast.error("Arquivo inválido ou vazio.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const parsedProducts = [];

        const parseCurrency = (val: string | undefined): number => {
          if (!val) return 0;
          let clean = val.replace(/R\$\s?/g, '').trim();
          if (clean.includes(',') && clean.includes('.')) {
            clean = clean.replace(/\./g, '').replace(',', '.');
          } else if (clean.includes(',')) {
            clean = clean.replace(',', '.');
          }
          const num = parseFloat(clean);
          return isNaN(num) ? 0 : num;
        };

        for (let i = 1; i < lines.length; i++) {
          let row: string[] = [];
          let inQuotes = false;
          let currentCell = '';
          for (const char of lines[i]) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ';' && !inQuotes) {
              row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
              currentCell = '';
            } else {
              currentCell += char;
            }
          }
          row.push(currentCell.replace(/^"|"$/g, '').replace(/""/g, '"').trim());

          const product_code = parseInt(row[0]) || undefined;
          const name = row[1] || `Produto ${i}`;
          const category = row[2] === "—" ? "" : (row[2] || "");
          const unit = row[3] || "UN";
          const costPrice = parseCurrency(row[4]);
          const salePrice = parseCurrency(row[5]);
          const salePrice2 = parseCurrency(row[6]);
          const stock = parseCurrency(row[7]);
          const stockMin = parseCurrency(row[8]);
          const ncm = row[9] || "";
          const cest = row[10] || "";
          const code = row[11] || "";
          
          // Fiscal columns
          const cfop_padrao = row[12] || "";
          const origem = row[13] ? parseInt(row[13]) : undefined;
          const cst = row[14] || "";
          const csosn = row[15] || "";
          const pis_cst_entrada = row[16] || "";
          const pis_cst_saida = row[17] || "";
          const pis_aliquota = parseCurrency(row[18]);
          const cofins_aliquota = parseCurrency(row[19]);
          const ipi_cst = row[20] || "";
          const ipi_aliquota = parseCurrency(row[21]);

          const existingProduct = products.find(p => 
            (product_code && p.product_code === product_code) || 
            (code && p.code === code)
          );

          parsedProducts.push({
            id: existingProduct?.id, // Will trigger PUT instead of POST
            data: {
              name, code, category, unit, costPrice, salePrice, salePrice2, stock, stockMin, ncm, cest,
              productCode: product_code,
              margin: costPrice > 0 ? parseFloat(((salePrice / costPrice - 1) * 100).toFixed(2)) : 0,
              imageUrl: existingProduct?.photo_url || "", 
              cfop_padrao: cfop_padrao || existingProduct?.cfop_padrao || "5102", 
              origem: origem !== undefined ? origem : (existingProduct?.origem || 0), 
              cst: cst || existingProduct?.cst || "00", 
              csosn: csosn || existingProduct?.csosn || "102", 
              pis_cst_entrada: pis_cst_entrada || existingProduct?.pis_cst_entrada || "07", 
              pis_cst_saida: pis_cst_saida || existingProduct?.pis_cst_saida || "07", 
              pis_aliquota: pis_aliquota || existingProduct?.pis_aliquota || 0, 
              cofins_aliquota: cofins_aliquota || existingProduct?.cofins_aliquota || 0, 
              ipi_cst: ipi_cst || existingProduct?.ipi_cst || "53", 
              ipi_aliquota: ipi_aliquota || existingProduct?.ipi_aliquota || 0, 
              boxConfigs: existingProduct?.boxConfigs || [], 
              venda_delivery: existingProduct?.venda_delivery || false
            }
          });
        }

        toast.loading(`Importando ${parsedProducts.length} produtos...`, { id: "import-toast" });
        
        let successCount = 0;
        let errorCount = 0;
        
        for (const p of parsedProducts) {
          try {
            await saveProduct.mutateAsync(p);
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }

        if (errorCount === 0) {
          toast.success(`Importação concluída: ${successCount} produtos salvos.`, { id: "import-toast" });
        } else {
          toast.warning(`Importação: ${successCount} salvos, ${errorCount} erros.`, { id: "import-toast" });
        }

      } catch (error) {
        toast.error("Erro ao processar o arquivo.", { id: "import-toast" });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const handleEdit = (product: ProductWithBoxConfigs) => {
    setIsCloning(false);
    setEditProduct(product);
    setFormOpen(true);
  };

  const handleClone = (product: ProductWithBoxConfigs) => {
    setIsCloning(true);
    setEditProduct(product);
    setFormOpen(true);
  };

  const handleSave = (data: {
    name: string; code: string; category: string; unit: string; costPrice: number; margin: number;
    salePrice: number; salePrice2: number; stock: number; stockMin: number; imageUrl: string;
    ncm: string; cest: string; cfop_padrao: string; origem: number; cst: string; csosn: string;
    pis_cst_entrada: string; pis_cst_saida: string; pis_aliquota: number; cofins_aliquota: number;
    ipi_cst: string; ipi_aliquota: number;
    productCode?: number;
    boxConfigs: BoxConfig[];
    venda_delivery: boolean;
    subGroup?: string;
  }) => {
    saveProduct.mutate(
      { id: isCloning ? undefined : editProduct?.id, data },
      {
        onSuccess: () => {
          toast.success(isCloning ? "Novo produto clonado!" : editProduct ? "Produto atualizado!" : "Produto cadastrado!");
          setFormOpen(false);
          setEditProduct(null);
          setIsCloning(false);
        },
        onError: () => toast.error("Erro ao salvar produto."),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteProduct.mutate(deleteId, {
      onSuccess: () => {
        setDeleteId(null);
        toast.success("Produto excluído!");
      },
      onError: () => toast.error("Erro ao excluir produto."),
    });
  };

  const mapToFormData = (p: ProductWithBoxConfigs) => ({
    name: p.name,
    code: p.code ?? "",
    category: p.category_name ?? "",
    unit: p.unit,
    costPrice: p.cost_price,
    margin: p.cost_price > 0 ? parseFloat(((p.sale_price / p.cost_price - 1) * 100).toFixed(2)) : 0,
    salePrice: p.sale_price,
    salePrice2: p.sale_price2 ?? 0,
    stock: p.stock_current,
    stockMin: p.stock_min,
    imageUrl: p.photo_url ?? "",
    ncm: p.ncm ?? "",
    cest: p.cest ?? "",
    cfop_padrao: p.cfop_padrao ?? "5102",
    origem: p.origem ?? 0,
    cst: p.cst ?? "00",
    csosn: p.csosn ?? "102",
    pis_cst_entrada: p.pis_cst_entrada ?? "07",
    pis_cst_saida: p.pis_cst_saida ?? "07",
    pis_aliquota: p.pis_aliquota ?? 0,
    cofins_aliquota: p.cofins_aliquota ?? 0,
    ipi_cst: p.ipi_cst ?? "53",
    ipi_aliquota: p.ipi_aliquota ?? 0,
    icms_aliquota: p.icms_aliquota ?? 0,
    gross_weight: p.gross_weight ?? 0,
    productCode: p.product_code ?? 0,
    boxConfigs: p.boxConfigs,
    venda_delivery: p.venda_delivery ?? false,
    subGroup: p.sub_group ?? "",
    cbs_regime: p.cbs_regime ?? "padrao",
    is_incide: Boolean(p.is_incide),
    is_aliquota: p.is_aliquota ?? 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie o catálogo de produtos</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleDownloadModelCSV}
            className="bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
          >
            <Download className="mr-2 h-4 w-4" /> Baixar Modelo
          </Button>
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 hover:text-blue-700 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900"
          >
            <Upload className="mr-2 h-4 w-4" /> Importar Planilha
          </Button>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleImportCSV} 
          />
          <Button 
            variant="outline" 
            onClick={handleExportExcel} 
            disabled={isLoading || filtered.length === 0}
            className="bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" /> Exportar Planilha
          </Button>
          <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
            <Tags className="mr-2 h-4 w-4" /> Categorias
          </Button>
          <Button onClick={handleNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-20">Cód.</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Un.</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Preço 2</TableHead>
                  <TableHead className="text-right">Estoque</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {p.photo_url ? (
                        <img src={p.photo_url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {p.name.charAt(0)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{p.product_code}</TableCell>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1.5">
                        {p.name}
                        {p.boxConfigs.length > 0 && (
                          <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell><Badge variant="outline">{p.category_name ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{p.unit}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.cost_price)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.sale_price)}</TableCell>
                    <TableCell className="text-right font-medium">{p.sale_price2 > 0 ? formatCurrency(p.sale_price2) : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock_current <= p.stock_min ? "destructive" : "secondary"}>
                        {p.stock_current}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(p)}>
                            <Pencil className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleClone(p)}>
                            <Copy className="mr-2 h-4 w-4" /> Clonar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditProduct(null);
            setIsCloning(false);
          }
        }}
        onSave={handleSave}
        initialData={editProduct ? (isCloning ? { ...mapToFormData(editProduct), code: "", productCode: 0 } : mapToFormData(editProduct)) : null}
        title={isCloning ? `Clonar: ${editProduct?.name}` : editProduct ? "Editar Produto" : "Novo Produto"}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O produto será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryManager open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen} />
    </div>
  );
}
