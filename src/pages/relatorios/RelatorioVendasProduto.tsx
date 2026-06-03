import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { useCategories } from "@/hooks/useCategories";
import { useSubCategories } from "@/hooks/useSubCategories";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function RelatorioVendasProduto() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("__all__");
    const [subCategoryFilter, setSubCategoryFilter] = useState("__all__");

    const { data: categories = [] } = useCategories();
    const { data: allSubCategories = [] } = useSubCategories();

    const selectedCategory = categories.find((c) => c.name === categoryFilter);
    const filteredSubCats = selectedCategory
        ? allSubCategories.filter((s) => s.category_id === selectedCategory.id)
        : [];

    const { data: salesData = [], isLoading } = useQuery({
        queryKey: ["report-sales-product", startDate, endDate],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/sales-product?start=${startDate}&end=${endDate}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            if (!response.ok) throw new Error('Falha ao carregar relatório');
            const data = await response.json();
            return data.map((p: any) => ({
                code: p.code,
                name: p.name,
                category: p.category ?? "—",
                subGroup: p.sub_group ?? "",
                qty: parseFloat(p.total_qty) || 0,
                revenue: parseFloat(p.total_amount) || 0,
                orders: parseInt(p.total_orders) || 0,
            }));
        },
    });

    const filteredData = salesData.filter((item: any) => {
        if (categoryFilter !== "__all__" && item.category !== categoryFilter) return false;
        if (subCategoryFilter !== "__all__" && item.subGroup !== subCategoryFilter) return false;
        if (searchTerm) {
            const q = searchTerm.toLowerCase().trim();
            if (!String(item.name || "").toLowerCase().includes(q) &&
                !String(item.code || "").toLowerCase().includes(q)) return false;
        }
        return true;
    });

    const totalRevenue = filteredData.reduce((acc: number, item: any) => acc + item.revenue, 0);
    const totalQty = filteredData.reduce((acc: number, item: any) => acc + item.qty, 0);

    const handleCategoryChange = (val: string) => {
        setCategoryFilter(val);
        setSubCategoryFilter("__all__");
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 pb-4">
                <h3 className="text-xl font-bold">Vendas por Produto</h3>
                <p className="text-sm text-muted-foreground">Analise o desempenho de vendas detalhado por produto</p>
            </div>

            <Card>
                <CardContent className="flex flex-wrap items-end gap-4 p-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Data Início</Label>
                        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Data Fim</Label>
                        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1 w-44">
                        <Label className="text-xs">Categoria</Label>
                        <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                            <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todas as categorias</SelectItem>
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 w-44">
                        <Label className="text-xs">Sub-categoria</Label>
                        <Select
                            value={subCategoryFilter}
                            onValueChange={setSubCategoryFilter}
                            disabled={filteredSubCats.length === 0}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={filteredSubCats.length === 0 ? "—" : "Todas"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todas</SelectItem>
                                {filteredSubCats.map((s) => (
                                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1 flex-1 min-w-[180px]">
                        <Label className="text-xs">Buscar Produto</Label>
                        <Input
                            type="text"
                            placeholder="Nome ou código..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Receita Total Filtrada</p>
                            <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Package className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Volume Vendido Filtrado</p>
                            <p className="text-lg font-bold">{totalQty.toFixed(3)} unid.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum produto encontrado para o período ou filtro selecionado.</p>
            ) : (
                <Card>
                    <CardHeader><CardTitle className="text-base">Listagem de Vendas por Produto</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Produto</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead>Sub-categoria</TableHead>
                                    <TableHead className="text-right">Qtd Vendida</TableHead>
                                    <TableHead className="text-right">Nº Vendas</TableHead>
                                    <TableHead className="text-right">Receita Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((p: any, i: number) => (
                                    <TableRow key={i}>
                                        <TableCell className="text-xs text-muted-foreground">{p.code || "—"}</TableCell>
                                        <TableCell className="font-medium">{p.name}</TableCell>
                                        <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                                        <TableCell>
                                            {p.subGroup
                                                ? <Badge variant="secondary">{p.subGroup}</Badge>
                                                : <span className="text-xs text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{p.qty}</TableCell>
                                        <TableCell className="text-right">{p.orders}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
