import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const medals = ["🥇", "🥈", "🥉"];

export default function RelatorioProdutosMaisVendidos() {
  const navigate = useNavigate();

  const { data: ranking = [], isLoading } = useQuery({
    queryKey: ["report-top-products"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/top-products`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar ranking');
      const data = await response.json();
      return data.map((p: any) => ({
        name: p.name,
        qty: parseInt(p.total_qty),
        revenue: parseFloat(p.total_amount),
        category: p.category ?? "—"
      }));
    },
  });

  const chartData = ranking.slice(0, 6).map((p) => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    quantidade: p.qty,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/relatorios")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold">Produtos Mais Vendidos</h1>
          <p className="text-muted-foreground">Ranking de produtos por quantidade vendida</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : ranking.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhuma venda registrada ainda.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {ranking.slice(0, 3).map((p, i) => (
              <Card key={p.name} className={i === 0 ? "border-primary/50" : ""}>
                <CardContent className="flex items-center gap-3 p-4">
                  <span className="text-2xl">{medals[i]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.qty} vendidos • {formatCurrency(p.revenue)}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4" /> Ranking por Quantidade</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={120} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="quantidade" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Ranking Completo</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Qtd Vendida</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ranking.map((p, i) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-bold">{i < 3 ? medals[i] : i + 1}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{p.qty}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
