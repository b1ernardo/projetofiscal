import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Play, Trash2 } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface PausedSale {
  id: number;
  items: CartItem[];
  total: number;
  pausedAt: Date;
  label: string;
  observation: string;
}

interface PausedSalesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pausedSales: PausedSale[];
  onResume: (sale: PausedSale) => void;
  onDelete: (id: number) => void;
  formatCurrency: (v: number) => string;
}

export function PausedSalesDialog({ open, onOpenChange, pausedSales, onResume, onDelete, formatCurrency }: PausedSalesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vendas Pausadas ({pausedSales.length})</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-auto">
          {pausedSales.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma venda pausada</p>
          ) : (
            pausedSales.map((sale) => (
              <div key={sale.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{sale.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {sale.items.reduce((s, i) => s + i.quantity, 0)} itens • {formatCurrency(sale.total)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => { onResume(sale); onOpenChange(false); }}>
                      <Play className="mr-1 h-3 w-3" /> Retomar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(sale.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {sale.observation && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    💬 {sale.observation}
                  </p>
                )}
                <div className="text-xs text-muted-foreground">
                  Pausada em {sale.pausedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
