import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownCircle, ArrowUpCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Estoque() {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["stock-products"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products?active=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar estoque');
      return await response.json();
    },
  });

  const lowStock = products.filter((p) => p.stock_current <= p.stock_min);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Controle de Estoque</h1>
          <p className="text-muted-foreground">Gerencie entradas e saídas de mercadorias</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><ArrowDownCircle className="mr-2 h-4 w-4" /> Entrada</Button>
          <Button variant="outline"><ArrowUpCircle className="mr-2 h-4 w-4" /> Saída</Button>
        </div>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <span className="text-sm font-medium">
              {lowStock.length} produto(s) com estoque baixo: {lowStock.map((p) => p.name).join(", ")}
            </span>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Estoque Atual</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum produto cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Estoque Atual</TableHead>
                  <TableHead className="text-right">Estoque Mín.</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.stock_current}</TableCell>
                    <TableCell className="text-right">{p.stock_min}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock_current < 0 ? "outline" : p.stock_current <= p.stock_min ? "destructive" : "secondary"} className={p.stock_current < 0 ? "border-red-500 text-red-500" : ""}>
                        {p.stock_current < 0 ? "Negativo" : p.stock_current <= p.stock_min ? "Baixo" : "Normal"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
