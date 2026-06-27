import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  stock_current: number;
  unit: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "entrada" | "saida" | null;
  products: Product[];
  onSaved: () => void;
}

export function StockAdjustmentDialog({ open, onOpenChange, type, products, onSaved }: Props) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setProductId("");
      setQuantity("");
      setObservation("");
    }
  }, [open]);

  const label = type === "entrada" ? "Entrada de Estoque" : "Saída de Estoque";
  const selectedProduct = products.find(p => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productId) {
      toast.error("Por favor, selecione um produto.");
      return;
    }

    const qtyParsed = parseFloat(quantity.replace(",", "."));
    if (isNaN(qtyParsed) || qtyParsed <= 0) {
      toast.error("Por favor, insira uma quantidade válida maior que zero.");
      return;
    }

    if (type === "saida" && selectedProduct && selectedProduct.stock_current < qtyParsed) {
      // Alert the user but don't strictly block unless business rules require it, or warn them.
      // We will allow negative stock since the DB system allows negative stock_current, but let's notify.
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/adjust-stock`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          product_id: productId,
          quantity: qtyParsed,
          type: type,
          observation: observation
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Falha ao realizar movimentação.");
      }

      toast.success(`${type === "entrada" ? "Entrada" : "Saída"} de estoque registrada com sucesso!`);
      onSaved();
      onOpenChange(false);
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
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="adj-product">Produto</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="adj-product" className="w-full">
                <SelectValue placeholder="Selecione um produto" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} (Estoque atual: {p.stock_current} {p.unit ?? "UN"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-qty">Quantidade</Label>
            <div className="flex items-center gap-2">
              <Input
                id="adj-qty"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              {selectedProduct && (
                <span className="text-sm font-semibold text-muted-foreground bg-muted p-2 rounded-md">
                  {selectedProduct.unit ?? "UN"}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adj-obs">Observação / Motivo</Label>
            <Textarea
              id="adj-obs"
              placeholder="Ex: Compra com fornecedor, acerto de balanço, avaria..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant={type === "saida" ? "destructive" : "default"}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
