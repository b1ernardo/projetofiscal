import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movementId: string | null;
  onDeleted: () => void;
}

export function DeleteMovementDialog({ open, onOpenChange, movementId, onDeleted }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!movementId) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/movements`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: movementId })
      });

      if (!response.ok) throw new Error('Falha ao excluir movimentação');

      toast.success("Movimentação excluída!");
      onOpenChange(false);
      onDeleted();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir movimentação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
