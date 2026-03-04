import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movement: { id: string; amount: number; type: string; observation: string | null } | null;
  onSaved: () => void;
}

export function EditMovementDialog({ open, onOpenChange, movement, onSaved }: Props) {
  const [amount, setAmount] = useState("");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (movement) {
      setAmount(String(movement.amount).replace(".", ","));
      setObservation(movement.observation || "");
    }
  }, [movement]);

  const label = movement?.type === "sangria" ? "Sangria" : "Suprimento";

  const handleSave = async () => {
    if (!movement) return;
    const value = parseFloat(amount.replace(",", "."));
    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/movements`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: movement.id,
          amount: value,
          description: observation || null
        })
      });

      if (!response.ok) throw new Error('Falha ao atualizar movimentação');

      toast.success(`${label} atualizada com sucesso!`);
      onOpenChange(false);
      onSaved();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar movimentação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-mov-amount">Valor (R$)</Label>
            <Input
              id="edit-mov-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-mov-obs">Observação</Label>
            <Textarea
              id="edit-mov-obs"
              placeholder="Motivo (opcional)"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
