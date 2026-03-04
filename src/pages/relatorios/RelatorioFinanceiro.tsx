import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function RelatorioFinanceiro() {
  const navigate = useNavigate();

  const { data: chartData = [], isLoading } = useQuery({
    queryKey: ["report-financial"],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/financial?year=${year}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar relatório');
      return await response.json();
    },
  });

  const totalReceita = chartData.reduce((s, d) => s + d.receita, 0);
  const totalDespesa = chartData.reduce((s, d) => s + d.despesa, 0);
  const lucro = totalReceita - totalDespesa;
  const margemLucro = totalReceita > 0 ? (lucro / totalReceita) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/relatorios")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Relatório Financeiro</h1>
          <p className="text-muted-foreground">Receitas vs despesas e fluxo de caixa</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><TrendingUp className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Receita Total</p><p className="text-lg font-bold">{formatCurrency(totalReceita)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><TrendingDown className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Despesa Total</p><p className="text-lg font-bold">{formatCurrency(totalDespesa)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><DollarSign className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Lucro Líquido</p><p className={`text-lg font-bold ${lucro >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(lucro)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><DollarSign className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Margem de Lucro</p><p className="text-lg font-bold">{margemLucro.toFixed(1)}%</p></div></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Receitas vs Despesas</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Fluxo de Caixa Mensal</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {chartData.filter((d) => d.receita > 0 || d.despesa > 0).map((d) => {
                  const saldo = d.receita - d.despesa;
                  return (
                    <div key={d.month} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="font-medium">{d.month}</span>
                      <div className="flex gap-6 text-sm">
                        <span className="text-success">{formatCurrency(d.receita)}</span>
                        <span className="text-destructive">-{formatCurrency(d.despesa)}</span>
                        <span className={`font-bold ${saldo >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(saldo)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
