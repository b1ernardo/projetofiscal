import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TrendingUp, TrendingDown, DollarSign, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface AccountLine {
    account_id: string | null;
    account_name: string;
    total: number;
}

interface PlanoContasData {
    revenues: AccountLine[];
    expenses: AccountLine[];
    total_revenue: number;
    total_expense: number;
    net_result: number;
}

export default function RelatorioPlanoContas() {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
    const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
    const [showZero, setShowZero] = useState(false);
    const [revenuesOpen, setRevenuesOpen] = useState(true);
    const [expensesOpen, setExpensesOpen] = useState(true);

    const { data, isLoading } = useQuery<PlanoContasData>({
        queryKey: ["report-plano-contas", startDate, endDate],
        queryFn: async () => {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL}/reports/plano-contas?start=${startDate}&end=${endDate}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` } }
            );
            if (!res.ok) throw new Error("Falha ao carregar relatório");
            return res.json();
        },
    });

    const revenues = (data?.revenues ?? []).filter(r => showZero || r.total > 0);
    const expenses = (data?.expenses ?? []).filter(e => showZero || e.total > 0);
    const totalRevenue = data?.total_revenue ?? 0;
    const totalExpense = data?.total_expense ?? 0;
    const netResult = data?.net_result ?? 0;
    const isPositive = netResult >= 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1 pb-4">
                <h3 className="text-xl font-bold">Relatório por Plano de Contas</h3>
                <p className="text-sm text-muted-foreground">
                    Demonstrativo de receitas e despesas classificadas pelo plano de contas
                </p>
            </div>

            {/* Filtros */}
            <Card>
                <CardContent className="flex flex-wrap items-end gap-4 p-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Data Início</Label>
                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Data Fim</Label>
                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="flex items-center gap-2 pb-0.5">
                        <Switch id="show-zero" checked={showZero} onCheckedChange={setShowZero} />
                        <Label htmlFor="show-zero" className="text-xs cursor-pointer">Mostrar contas sem movimento</Label>
                    </div>
                </CardContent>
            </Card>

            {/* Cards de resumo */}
            <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Receitas</p>
                            <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                            <TrendingDown className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Total Despesas</p>
                            <p className="text-lg font-bold text-red-600">{formatCurrency(totalExpense)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className={isPositive ? "border-green-500/40" : "border-red-500/40"}>
                    <CardContent className="flex items-center gap-3 p-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Resultado Líquido</p>
                            <p className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                {formatCurrency(netResult)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <div className="space-y-4">
                    {/* RECEITAS */}
                    <Card>
                        <CardHeader
                            className="cursor-pointer select-none py-3 px-4"
                            onClick={() => setRevenuesOpen(o => !o)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {revenuesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <CardTitle className="text-base text-green-600">RECEITAS</CardTitle>
                                    <Badge variant="outline" className="text-green-600 border-green-500/40">
                                        {revenues.length} conta{revenues.length !== 1 ? "s" : ""}
                                    </Badge>
                                </div>
                                <span className="font-bold text-green-600">{formatCurrency(totalRevenue)}</span>
                            </div>
                        </CardHeader>
                        {revenuesOpen && (
                            <CardContent className="p-0">
                                {revenues.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-6 text-sm">
                                        Nenhuma receita registrada no período.
                                    </p>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-t text-xs text-muted-foreground">
                                                <th className="text-left px-4 py-2 font-medium">Conta</th>
                                                <th className="text-right px-4 py-2 font-medium w-36">Valor</th>
                                                <th className="text-right px-4 py-2 font-medium w-20">%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {revenues.map((r, i) => {
                                                const pct = totalRevenue > 0 ? (r.total / totalRevenue) * 100 : 0;
                                                return (
                                                    <tr key={r.account_id ?? i} className="border-t hover:bg-muted/40">
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="h-1.5 rounded-full bg-green-500"
                                                                    style={{ width: `${Math.max(pct, 2)}px`, maxWidth: "120px", minWidth: "4px" }}
                                                                />
                                                                <span className="text-sm">{r.account_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-medium text-sm">
                                                            {formatCurrency(r.total)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {pct.toFixed(1)}%
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t bg-green-500/5">
                                                <td className="px-4 py-2.5 text-sm font-bold text-green-600">Total Receitas</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-green-600">{formatCurrency(totalRevenue)}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <Badge className="text-xs bg-green-500/20 text-green-700 hover:bg-green-500/20">100%</Badge>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    {/* DESPESAS */}
                    <Card>
                        <CardHeader
                            className="cursor-pointer select-none py-3 px-4"
                            onClick={() => setExpensesOpen(o => !o)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {expensesOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <CardTitle className="text-base text-red-600">DESPESAS</CardTitle>
                                    <Badge variant="outline" className="text-red-600 border-red-500/40">
                                        {expenses.length} conta{expenses.length !== 1 ? "s" : ""}
                                    </Badge>
                                </div>
                                <span className="font-bold text-red-600">{formatCurrency(totalExpense)}</span>
                            </div>
                        </CardHeader>
                        {expensesOpen && (
                            <CardContent className="p-0">
                                {expenses.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-6 text-sm">
                                        Nenhuma despesa registrada no período.
                                    </p>
                                ) : (
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-t text-xs text-muted-foreground">
                                                <th className="text-left px-4 py-2 font-medium">Conta</th>
                                                <th className="text-right px-4 py-2 font-medium w-36">Valor</th>
                                                <th className="text-right px-4 py-2 font-medium w-20">%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {expenses.map((e, i) => {
                                                const pct = totalExpense > 0 ? (e.total / totalExpense) * 100 : 0;
                                                return (
                                                    <tr key={e.account_id ?? i} className="border-t hover:bg-muted/40">
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center gap-3">
                                                                <div
                                                                    className="h-1.5 rounded-full bg-red-500"
                                                                    style={{ width: `${Math.max(pct, 2)}px`, maxWidth: "120px", minWidth: "4px" }}
                                                                />
                                                                <span className="text-sm">{e.account_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right font-medium text-sm">
                                                            {formatCurrency(e.total)}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right">
                                                            <Badge variant="secondary" className="text-xs">
                                                                {pct.toFixed(1)}%
                                                            </Badge>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t bg-red-500/5">
                                                <td className="px-4 py-2.5 text-sm font-bold text-red-600">Total Despesas</td>
                                                <td className="px-4 py-2.5 text-right font-bold text-red-600">{formatCurrency(totalExpense)}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <Badge className="text-xs bg-red-500/20 text-red-700 hover:bg-red-500/20">100%</Badge>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </CardContent>
                        )}
                    </Card>

                    {/* RESULTADO LÍQUIDO */}
                    <Card className={`border-2 ${isPositive ? "border-green-500/50" : "border-red-500/50"}`}>
                        <CardContent className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-base">RESULTADO LÍQUIDO DO PERÍODO</p>
                                    <p className="text-xs text-muted-foreground">
                                        Receitas ({formatCurrency(totalRevenue)}) − Despesas ({formatCurrency(totalExpense)})
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                                    {formatCurrency(netResult)}
                                </p>
                                <Badge variant={isPositive ? "default" : "destructive"} className="text-xs mt-1">
                                    {isPositive ? "Superávit" : "Déficit"}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
