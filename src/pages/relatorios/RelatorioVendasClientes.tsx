import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function RelatorioVendasClientes() {
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [searchTerm, setSearchTerm] = useState("");

    const { data: salesData = [], isLoading } = useQuery({
        queryKey: ["report-sales-customer", startDate, endDate],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/sales-customer?start=${startDate}&end=${endDate}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            if (!response.ok) throw new Error('Falha ao carregar relatório');
            const data = await response.json();
            return data.map((c: any) => ({
                id: c.id,
                name: c.name || "CLIENTE NÃO IDENTIFICADO",
                document: c.document || "—",
                orders: parseInt(c.total_orders) || 0,
                revenue: parseFloat(c.total_amount) || 0,
                last_purchase: c.last_purchase ? new Date(c.last_purchase).toLocaleDateString('pt-BR') : "—"
            }));
        },
    });

    const filteredData = salesData.filter((item: any) => {
        if (!searchTerm) return true;
        const searchRaw = searchTerm.toLowerCase().trim();
        const safeName = String(item.name || "").toLowerCase();
        const safeDocument = String(item.document || "").toLowerCase();
        return safeName.includes(searchRaw) || safeDocument.includes(searchRaw);
    });

    const totalRevenue = filteredData.reduce((acc: number, item: any) => acc + item.revenue, 0);
    const totalOrders = filteredData.reduce((acc: number, item: any) => acc + item.orders, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 pb-4">
                <h3 className="text-xl font-bold">Vendas por Cliente</h3>
                <p className="text-sm text-muted-foreground">Listagem de clientes com histórico financeiro de compras no período</p>
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
                        <Label className="text-xs">Buscar Cliente</Label>
                        <Input
                            type="text"
                            placeholder="Nome ou CPF/CNPJ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Volume em Vendas Filtradas</p>
                            <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Users className="h-5 w-5" /></div>
                        <div>
                            <p className="text-xs text-muted-foreground">Número de Transações</p>
                            <p className="text-lg font-bold">{totalOrders}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum cliente comprou nesse período ou filtro.</p>
            ) : (
                <Card>
                    <CardHeader><CardTitle className="text-base">Listagem de Clientes</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Documento</TableHead>
                                    <TableHead className="text-center">Última Compra</TableHead>
                                    <TableHead className="text-right">Nº de Compras</TableHead>
                                    <TableHead className="text-right">Ticket Médio</TableHead>
                                    <TableHead className="text-right">Total Gasto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredData.map((c: any, i: number) => {
                                    const ticketMedio = c.orders > 0 ? c.revenue / c.orders : 0;
                                    return (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium text-primary">{c.name}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{c.document}</TableCell>
                                            <TableCell className="text-center">{c.last_purchase}</TableCell>
                                            <TableCell className="text-right">{c.orders}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(ticketMedio)}</TableCell>
                                            <TableCell className="text-right font-bold">{formatCurrency(c.revenue)}</TableCell>
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
