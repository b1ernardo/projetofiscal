import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Plus, Minus, Trash2, Pause, Percent } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartPanelProps {
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  subtotal: number;
  discount: number;
  onDiscountChange: (value: number) => void;
  formatCurrency: (v: number) => string;
  onPause: () => void;
  onCheckout: () => void;
  onSaveToComanda: () => void;
  asCard?: boolean;
}

export function CartPanel({
  cart,
  onUpdateQuantity,
  onRemove,
  subtotal,
  discount,
  onDiscountChange,
  formatCurrency,
  onPause,
  onCheckout,
  onSaveToComanda,
  asCard = true,
}: CartPanelProps) {
  const [discountType, setDiscountType] = useState<"percent" | "value">("percent");

  const discountAmount = discountType === "percent"
    ? subtotal * (discount / 100)
    : discount;
  const total = Math.max(0, subtotal - discountAmount);

  const content = (
    <>
      <div className="flex items-center gap-2 text-lg font-semibold">
        <ShoppingCart className="h-5 w-5" />
        Carrinho
        {cart.length > 0 && (
          <Badge variant="secondary" className="ml-auto">
            {cart.reduce((s, i) => s + i.quantity, 0)} itens
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-auto space-y-2 mt-3">
        {cart.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">Carrinho vazio</p>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(item.price)} × {item.quantity} = {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.id, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(item.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t pt-3 mt-3 space-y-3">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>

        {cart.length > 0 && (
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex items-center gap-1 flex-1">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={discount || ""}
                onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                placeholder="Desconto"
                className="h-8 text-sm"
              />
              <div className="flex rounded-md border overflow-hidden shrink-0">
                <button
                  onClick={() => { setDiscountType("percent"); onDiscountChange(0); }}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${discountType === "percent" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  %
                </button>
                <button
                  onClick={() => { setDiscountType("value"); onDiscountChange(0); }}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${discountType === "value" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  R$
                </button>
              </div>
            </div>
          </div>
        )}

        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-destructive">
            <span>Desconto</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={cart.length === 0} onClick={onPause}>
              <Pause className="mr-2 h-4 w-4" /> Pausar
            </Button>
            <Button variant="outline" className="flex-1" disabled={cart.length === 0} onClick={onSaveToComanda}>
              Comanda
            </Button>
          </div>
          <Button className="w-full" disabled={cart.length === 0} onClick={onCheckout}>
            Finalizar Venda
          </Button>
        </div>
      </div>
    </>
  );

  if (!asCard) {
    return <div className="flex flex-col h-full">{content}</div>;
  }

  return (
    <Card className="hidden md:flex w-80 flex-col shrink-0">
      <CardHeader className="pb-3">
        <CardTitle className="sr-only">Carrinho</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col overflow-hidden">
        {content}
      </CardContent>
    </Card>
  );
}
