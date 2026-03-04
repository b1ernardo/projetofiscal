import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

export default function RelatorioEstoque() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["report-stock"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/stock`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar relatório');
      return await response.json();
    },
  });

  const stockData = data ?? [];
  const lowStock = stockData.filter((p) => p.stock <= p.min);
  const chartData = stockData.slice(0, 6).map((p) => ({
    name: p.name.length > 12 ? p.name.slice(0, 12) + "…" : p.name,
    saida: p.sold,
    estoque: p.stock,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/relatorios")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Relatório de Estoque</h1>
          <p className="text-muted-foreground">Produtos com maior/menor saída e estoque baixo</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Estoque Baixo</p><p className="text-lg font-bold">{lowStock.length} produtos</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><TrendingUp className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Maior Saída</p><p className="text-lg font-bold">{stockData[0]?.name ?? "—"}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><TrendingDown className="h-5 w-5" /></div><div><p className="text-xs text-muted-foreground">Menor Saída</p><p className="text-lg font-bold">{stockData[stockData.length - 1]?.name ?? "—"}</p></div></CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Saída vs Estoque Atual</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="saida" name="Saída" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="estoque" name="Estoque" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {lowStock.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Produtos com Estoque Baixo</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Estoque</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStock.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                        <TableCell className="text-right"><Badge variant="destructive">{p.stock}</Badge></TableCell>
                        <TableCell className="text-right">{p.min}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
