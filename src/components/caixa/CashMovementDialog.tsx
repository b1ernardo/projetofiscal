import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "sangria" | "suprimento";
  cashRegisterId: string;
  onSaved: () => void;
}

export function CashMovementDialog({ open, onOpenChange, type, cashRegisterId, onSaved }: Props) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);

  const label = type === "sangria" ? "Sangria" : "Suprimento";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) {
      toast.error("Informe um valor válido");
      return;
    }
    const description = observation;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/movements`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cash_register_id: cashRegisterId,
          type: type,
          amount: parseFloat(amount.replace(",", ".")), // Ensure amount is parsed correctly
          description: observation || null // Use observation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao registrar movimentação');
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} registrada com sucesso!`);
      onSaved();
      onOpenChange(false);
      setAmount("");
      setObservation("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar {label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="mov-amount">Valor (R$)</Label>
            <Input
              id="mov-amount"
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="mov-obs">Observação</Label>
            <Textarea
              id="mov-obs"
              placeholder="Motivo (opcional)"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} variant={type === "sangria" ? "destructive" : "default"}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
