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
import { Loader2, ShieldCheck, Ban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CancelSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
  onCancelled: () => void;
}

export function CancelSaleDialog({ open, onOpenChange, saleId, onCancelled }: CancelSaleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const { user } = useAuth();

  const handleCancel = async () => {
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

      // 2. Se a senha estiver correta, prosseguir com o cancelamento
      const response = await fetch(`${import.meta.env.VITE_API_URL}/sales/${saleId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Falha ao cancelar venda');
      }

      toast.success("Venda cancelada com sucesso. O estoque foi restaurado.");
      setAdminPassword("");
      onCancelled();
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
            <Ban className="h-5 w-5 text-orange-500" /> Cancelar Venda
          </AlertDialogTitle>
          <AlertDialogDescription>
            A venda será marcada como <b>cancelada</b> no sistema, mas permanecerá no histórico. As parcelas em aberto serão excluídas e o estoque será restaurado.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
            <ShieldCheck className="h-4 w-4" /> Autorização Requerida
          </div>
          <Label htmlFor="admin_pass_cancel">Senha de Administrador</Label>
          <Input
            id="admin_pass_cancel"
            type="password"
            placeholder="Digite a senha de um administrador"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCancel();
            }}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => setAdminPassword("")}>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={loading || !adminPassword} className="bg-orange-600 text-white hover:bg-orange-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirmar Cancelamento
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
