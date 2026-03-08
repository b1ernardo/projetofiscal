import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Loader2, Target } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function RelatorioLucratividade() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [searchTerm, setSearchTerm] = useState("");

    const { data: profitabilityData = [], isLoading } = useQuery({
        queryKey: ["report-profitability", startDate, endDate],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/profitability?start=${startDate}&end=${endDate}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (!response.ok) throw new Error('Falha ao carregar relatório');
            const data = await response.json();
            return data.map((p: any) => ({
                id: p.id,
                code: p.code,
                name: p.name,
                category: p.category ?? "—",
                qty: parseFloat(p.total_qty) || 0,
                revenue: parseFloat(p.total_revenue) || 0,
                cost: parseFloat(p.total_cost) || 0,
                profit: parseFloat(p.total_profit) || 0,
            }));
        },
    });

    const filteredData = profitabilityData.filter((item: any) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const globalRevenue = filteredData.reduce((acc: number, item: any) => acc + item.revenue, 0);
    const globalProfit = filteredData.reduce((acc: number, item: any) => acc + item.profit, 0);
    const globalMargin = globalRevenue > 0 ? (globalProfit / globalRevenue) * 100 : 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 pb-4">
                <h3 className="text-xl font-bold">Relatório de Lucratividade</h3>
                <p className="text-sm text-muted-foreground">Analise o lucro real dos produtos baseado na diferença entre custo e venda</p>
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
                    <div className="space-y-1 flex-1 min-w-[200px]">
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

            <div className="grid gap-4 sm:md:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><DollarSign className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Faturamento (Vendas)</p>
                            <p className="text-lg font-bold">{formatCurrency(globalRevenue)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Target className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Lucro Bruto Calculado</p>
                            <p className={`text-lg font-bold ${globalProfit >= 0 ? "text-success" : "text-destructive"}`}>
                                {formatCurrency(globalProfit)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><Target className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Margem Média</p>
                            <p className="text-lg font-bold">{globalMargin.toFixed(2)}%</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Não há dados suficientes ou nenhum produto encontrado.</p>
            ) : (
                <Card>
                    <CardHeader><CardTitle className="text-base">Detalhamento por Produto</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Produto</TableHead>
                                    <TableHead className="text-right">Qtd Vendida</TableHead>
                                    <TableHead className="text-right">Custo Somado</TableHead>
                                    <TableHead className="text-right">Valor Venda</TableHead>
                                    <TableHead className="text-right">Lucro Bruto</TableHead>
                                    <TableHead className="text-right">Margem %</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((p: any, i: number) => {
                                    const margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
                                    return (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">
                                                <div>{p.name}</div>
                                                <div className="text-xs text-muted-foreground">{p.code}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{p.qty}</TableCell>
                                            <TableCell className="text-right text-muted-foreground">{formatCurrency(p.cost)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                                            <TableCell className={`text-right font-bold ${p.profit >= 0 ? "text-success" : "text-destructive"}`}>
                                                {formatCurrency(p.profit)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={margin > 20 ? "default" : margin > 0 ? "secondary" : "destructive"}>
                                                    {margin.toFixed(1)}%
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
