import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DeleteSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  onDeleted: () => void;
}

export function DeleteSaleDialog({ open, onOpenChange, saleId, onDeleted }: DeleteSaleDialogProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!saleId || !user) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/${saleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Falha ao excluir venda');
      }

      toast.success("Venda excluída e estoque restaurado.");
      onDeleted();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Erro ao excluir venda: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Venda</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir esta venda? O estoque dos produtos será restaurado automaticamente. Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
