import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Pencil, Trash2, MoreHorizontal, Package, Loader2, Tags, Copy } from "lucide-react";
import { useState } from "react";
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
    boxConfigs: BoxConfig[]
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
    productCode: p.product_code ?? 0,
    boxConfigs: p.boxConfigs,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produtos</h1>
          <p className="text-muted-foreground">Gerencie o catálogo de produtos</p>
        </div>
        <div className="flex gap-2">
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
        initialData={editProduct ? mapToFormData(editProduct) : null}
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
