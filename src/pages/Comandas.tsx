import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, CheckCircle, Loader2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ComandaFormDialog } from "@/components/comandas/ComandaFormDialog";
import { ComandaDetailDialog } from "@/components/comandas/ComandaDetailDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Comandas() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedComandaId, setSelectedComandaId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: comandas = [], isLoading } = useQuery({
    queryKey: ["comandas"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Falha ao carregar comandas');
      const data = await response.json();
      return data.map((c: any) => ({
        ...c,
        itemCount: c.items?.length ?? 0,
        total: (c.items ?? []).reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0),
      }));
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      toast.success("Comanda aberta!");
      setFormOpen(false);
      setSelectedComandaId(res.id);
      setDetailOpen(true);
    },
    onError: () => toast.error("Erro ao abrir comanda")
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao excluir');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comandas"] });
      toast.success("Comanda excluída com sucesso!");
      setDeleteDialogOpen(false);
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao excluir comanda")
  });

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  const openComandas = comandas.filter((c: any) => c.status === "open");
  const closedComandas = comandas.filter((c: any) => c.status === "closed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Comandas</h1>
          <p className="text-muted-foreground">{openComandas.length} comanda(s) aberta(s)</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Comanda
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {openComandas.length === 0 && closedComandas.length === 0 && (
            <p className="text-center text-muted-foreground py-8">Nenhuma comanda encontrada.</p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {openComandas.map((c: any) => (
              <Card
                key={c.id}
                className="cursor-pointer transition-all hover:shadow-lg border-primary/20 hover:border-primary/50"
                onClick={() => {
                  setSelectedComandaId(c.id);
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{c.table_number ?? "Sem mesa"}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                        <Clock className="mr-1 h-3 w-3" /> Aberta
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteClick(e, c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.customer_name ?? "Sem cliente"} • Aberta às {format(new Date(c.created_at), "HH:mm")}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-muted-foreground">{c.itemCount} itens adicionados</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(c.total)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {closedComandas.length > 0 && (
            <div className="space-y-4 pt-6">
              <h2 className="text-lg font-semibold text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-5 w-5" /> Recentemente Fechadas
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {closedComandas.slice(0, 6).map((c: any) => (
                  <Card key={c.id} className="opacity-60 bg-muted/30">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{c.table_number ?? "Sem mesa"}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Fechada</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={(e) => handleDeleteClick(e, c.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{c.customer_name ?? "Sem cliente"}</p>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">{c.itemCount} itens</span>
                        <span className="text-lg font-bold">{formatCurrency(c.total)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ComandaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={(data) => createMutation.mutate(data)}
      />

      {selectedComandaId && (
        <ComandaDetailDialog
          open={detailOpen}
          onOpenChange={setDetailOpen}
          comandaId={selectedComandaId}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Comanda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta comanda? Todos os itens serão removidos permanentemente e esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


