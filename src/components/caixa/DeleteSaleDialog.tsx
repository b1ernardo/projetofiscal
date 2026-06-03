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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DeleteSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  onDeleted: () => void;
}

export function DeleteSaleDialog({ open, onOpenChange, saleId, onDeleted }: DeleteSaleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!saleId || !user) return;
    if (!adminPassword) {
      toast.error("Informe a senha do administrador para continuar.");
      return;
    }

    setLoading(true);
    try {
      // 1. Verificar senha do administrador
      const verifyRes = await fetch(`${import.meta.env.VITE_API_URL}/auth/verify-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ password: adminPassword })
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        throw new Error(err.message || 'Senha de administrador incorreta');
      }

      // 2. Se a senha estiver correta, prosseguir com a exclusão
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
      setAdminPassword("");
      onDeleted();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => {
      if (!o) setAdminPassword("");
      onOpenChange(o);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-destructive" /> Confirmar Exclusão de Venda
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta é uma operação sensível. A venda será removida permanentemente, as parcelas em aberto serão excluídas e o estoque dos produtos será restaurado.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-2">
          <Label htmlFor="admin_pass">Senha de Administrador</Label>
          <Input
            id="admin_pass"
            type="password"
            placeholder="Digite a senha de um administrador"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleDelete();
            }}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => setAdminPassword("")}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading || !adminPassword} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar Exclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
