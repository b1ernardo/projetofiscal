import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, TrendingUp, DollarSign, ShoppingCart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function RelatorioVendas() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: salesData = [], isLoading } = useQuery({
    queryKey: ["report-sales", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/sales-period?start=${startDate}&end=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar relatório');
      return await response.json();
    },
  });

  const totalVendas = salesData.reduce((s, d) => s + d.total, 0);
  const totalCount = salesData.reduce((s, d) => s + d.count, 0);
  const avgTicket = totalCount > 0 ? totalVendas / totalCount : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/relatorios")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Vendas por Período</h1>
          <p className="text-muted-foreground">Relatório detalhado de vendas com filtros por data</p>
        </div>
      </div>

      <Card>
        <CardContent className="flex items-end gap-4 p-4">
          <div className="space-y-1">
            <Label className="text-xs">Data Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Data Fim</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><DollarSign className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Vendido</p>
              <p className="text-lg font-bold">{formatCurrency(totalVendas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><ShoppingCart className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Nº de Vendas</p>
              <p className="text-lg font-bold">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><TrendingUp className="h-5 w-5" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="text-lg font-bold">{formatCurrency(avgTicket)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Vendas por Dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis tickFormatter={(v) => `R$${v}`} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Quantidade de Vendas por Dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
