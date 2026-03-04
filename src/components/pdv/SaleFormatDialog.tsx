import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Package } from "lucide-react";

interface BoxOption {
  label: string;
  quantity: number;
  price: number;
}

interface SaleFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  unitPrice: number;
  boxConfigs: BoxOption[];
  onSelect: (label: string, price: number, quantity: number) => void;
  formatCurrency: (v: number) => string;
}

export function SaleFormatDialog({
  open,
  onOpenChange,
  productName,
  unitPrice,
  boxConfigs,
  onSelect,
  formatCurrency,
}: SaleFormatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Formato de Venda</DialogTitle>
          <DialogDescription className="text-sm">{productName}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <button
            onClick={() => {
              onSelect("Unidade", unitPrice, 1);
              onOpenChange(false);
            }}
            className="flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary/50 hover:shadow-sm"
          >
            <span className="text-sm font-medium">Unidade</span>
            <span className="text-sm font-bold text-primary">{formatCurrency(unitPrice)}</span>
          </button>

          {boxConfigs.map((box, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(box.label, box.price, box.quantity);
                onOpenChange(false);
              }}
              className="flex items-center justify-between rounded-lg border p-3 transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Package className="h-4 w-4 text-muted-foreground" />
                {box.label}
              </span>
              <span className="text-sm font-bold text-primary">{formatCurrency(box.price)}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
