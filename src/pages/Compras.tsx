import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Compras() {
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/purchases`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar compras');
      const data = await response.json();
      return data.map((p: any) => ({
        ...p,
        supplierName: p.supplier_name ?? "—",
        itemCount: p.item_count ?? 0,
      }));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-muted-foreground">Registre compras de fornecedores</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Nova Compra</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Histórico de Compras</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : purchases.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma compra registrada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="text-right">Itens</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-medium">{p.supplierName}</TableCell>
                    <TableCell className="text-right">{p.itemCount}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(p.total_amount)}</TableCell>
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
