import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpened: () => void;
}

export function OpenCashRegisterDialog({ open, onOpenChange, onOpened }: Props) {
  const { user } = useAuth();
  const [openingBalance, setOpeningBalance] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (!user) return;
    const balance = parseFloat(openingBalance.replace(",", ".")) || 0;
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/open`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          initial_balance: balance,
          opened_by: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao abrir caixa');
      }

      toast.success("Caixa aberto com sucesso!");
      setOpeningBalance("");
      onOpenChange(false);
      onOpened();
    } catch (error: any) {
      toast.error(error.message || "Erro ao abrir caixa");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Abrir Caixa</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="opening-balance">Saldo Inicial (R$)</Label>
            <Input
              id="opening-balance"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleOpen} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Abrir Caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
