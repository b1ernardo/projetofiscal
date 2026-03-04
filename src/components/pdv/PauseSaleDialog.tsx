import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Pause } from "lucide-react";

interface PauseSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (observation: string) => void;
  itemCount: number;
  total: string;
}

export function PauseSaleDialog({ open, onOpenChange, onConfirm, itemCount, total }: PauseSaleDialogProps) {
  const [observation, setObservation] = useState("");

  const handleConfirm = () => {
    onConfirm(observation.trim());
    setObservation("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause className="h-5 w-5" />
            Pausar Venda
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p><strong>{itemCount}</strong> {itemCount === 1 ? "item" : "itens"} • Total: <strong>{total}</strong></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="observation">Observação (opcional)</Label>
            <Textarea
              id="observation"
              placeholder="Ex: Cliente foi buscar mais produtos, mesa 5..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              maxLength={200}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar Pausa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
