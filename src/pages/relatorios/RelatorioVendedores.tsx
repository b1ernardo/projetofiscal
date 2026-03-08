import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2, TrendingUp, Award, Coins } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function RelatorioVendedores() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [searchTerm, setSearchTerm] = useState("");

    const { data: reportData = [], isLoading } = useQuery({
        queryKey: ["report-sellers-commission", startDate, endDate],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/sellers-commission?start=${startDate}&end=${endDate}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (!response.ok) throw new Error('Falha ao carregar relatório');
            const data = await response.json();
            return data.map((s: any) => ({
                name: s.seller_name || "VENDEDOR NÃO IDENTIFICADO",
                commission_percentage: parseFloat(s.commission_percentage) || 0,
                total_sales: parseInt(s.total_sales) || 0,
                total_revenue: parseFloat(s.total_revenue) || 0,
                total_commission: parseFloat(s.total_commission) || 0
            }));
        },
    });

    const filteredData = reportData.filter((item: any) => {
        if (!searchTerm) return true;
        const safeName = String(item.name || "").toLowerCase();
        return safeName.includes(searchTerm.toLowerCase().trim());
    });

    const totalSold = filteredData.reduce((acc: number, item: any) => acc + item.total_revenue, 0);
    const totalCommission = filteredData.reduce((acc: number, item: any) => acc + item.total_commission, 0);
    const totalSales = filteredData.reduce((acc: number, item: any) => acc + item.total_sales, 0);
    const bestSeller = filteredData.length > 0 ? filteredData.reduce((prev: any, current: any) => (prev.total_revenue > current.total_revenue) ? prev : current) : null;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 pb-4">
                <h3 className="text-xl font-bold">Comissões por Vendedor</h3>
                <p className="text-sm text-muted-foreground">Relatório detalhado de vendas e comissões no período selecionado</p>
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
                        <Label className="text-xs">Buscar Vendedor</Label>
                        <Input
                            type="text"
                            placeholder="Nome do vendedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Vendido</p>
                            <p className="text-lg font-bold">{formatCurrency(totalSold)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-emerald-500/5 border-emerald-500/20">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500"><Coins className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Comissão</p>
                            <p className="text-lg font-bold">{formatCurrency(totalCommission)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500"><Users className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Qtd. de Vendas</p>
                            <p className="text-lg font-bold">{totalSales}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500"><Award className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Destaque do Período</p>
                            <p className="text-lg font-bold truncate max-w-[150px]">{bestSeller ? bestSeller.name : "—"}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda encontrada para os filtros selecionados.</p>
            ) : (
                <Card>
                    <CardHeader><CardTitle className="text-base">Detalhamento de Comissões</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Vendedor</TableHead>
                                    <TableHead className="text-center">Comissão %</TableHead>
                                    <TableHead className="text-right">Número de Vendas</TableHead>
                                    <TableHead className="text-right">Ticket Médio</TableHead>
                                    <TableHead className="text-right">Total Vendido</TableHead>
                                    <TableHead className="text-right">Comissão Devida</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((s: any, i: number) => {
                                    const ticketMedio = s.total_sales > 0 ? s.total_revenue / s.total_sales : 0;
                                    return (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{s.name}</TableCell>
                                            <TableCell className="text-center">{s.commission_percentage}%</TableCell>
                                            <TableCell className="text-right">{s.total_sales}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(ticketMedio)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(s.total_revenue)}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(s.total_commission)}</TableCell>
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
