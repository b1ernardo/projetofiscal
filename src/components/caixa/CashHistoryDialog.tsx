import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { CashHistoryDetailsDialog } from "./CashHistoryDetailsDialog";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashHistoryDialog({ open, onOpenChange }: Props) {
  const [selectedRegister, setSelectedRegister] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: registers = [], isLoading } = useQuery({
    queryKey: ["cash-registers-history"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao buscar histórico');
      return await response.json();
    },
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/history/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha ao excluir registro');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers-history"] });
      toast.success("Registro de caixa excluído com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este registro de histórico? Esta ação não pode ser desfeita.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico de Caixas (Registros)</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : registers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum caixa fechado encontrado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead className="text-right">Saldo Inicial</TableHead>
                    <TableHead className="text-right">Saldo Final</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registers.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {format(new Date(r.opened_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.closed_at ? format(new Date(r.closed_at), "dd/MM/yyyy HH:mm") : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(r.opening_balance)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium">
                        {r.closing_balance != null ? formatCurrency(r.closing_balance) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRegister(r)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(r.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CashHistoryDetailsDialog
        open={!!selectedRegister}
        onOpenChange={(o) => !o && setSelectedRegister(null)}
        register={selectedRegister}
      />
    </>
  );
}
