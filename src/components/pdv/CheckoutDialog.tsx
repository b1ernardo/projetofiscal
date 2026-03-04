import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Banknote, Smartphone, CheckCircle, Plus, X, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface PaymentEntry {
  methodName: string;
  amount: number;
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  onConfirm: (payments: PaymentEntry[], customerId?: string) => void | Promise<void>;
}

const iconMap: Record<string, React.ReactNode> = {
  "Dinheiro": <Banknote className="h-5 w-5" />,
  "PIX": <Smartphone className="h-5 w-5" />,
};

const defaultIcon = <CreditCard className="h-5 w-5" />;

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function CheckoutDialog({ open, onOpenChange, total, onConfirm }: CheckoutDialogProps) {
  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [payments, setPayments] = useState<{ methodId: string; methodName: string; amount: number }[]>([]);
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      return response.json();
    },
    enabled: open
  });

  useEffect(() => {
    if (open) {
      setPayments([]);
      setCustomerId(undefined);
      fetch(`${import.meta.env.VITE_API_URL}/payment_methods`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setMethods(data);
        })
        .catch(err => console.error("Erro ao carregar métodos:", err));
    }
  }, [open]);

  const remaining = total - payments.reduce((s, p) => s + p.amount, 0);

  const addPayment = (methodId: string) => {
    const method = methods.find((m) => m.id === methodId);
    if (!method) return;

    setPayments((prev) => {
      const existing = prev.find((p) => p.methodId === methodId);
      if (existing) return prev;

      const currentTotal = prev.reduce((s, p) => s + p.amount, 0);
      const autoAmount = Math.max(0, Math.round((total - currentTotal) * 100) / 100);
      return [...prev, { methodId, methodName: method.name, amount: autoAmount }];
    });
  };

  const updateAmount = (methodId: string, amount: number) => {
    setPayments((prev) =>
      prev.map((p) => (p.methodId === methodId ? { ...p, amount: Math.max(0, amount) } : p))
    );
  };

  const removePayment = (methodId: string) => {
    setPayments((prev) => prev.filter((p) => p.methodId !== methodId));
  };

  const handleConfirm = async () => {
    if (payments.length === 0) {
      toast.error("Adicione pelo menos uma forma de pagamento");
      return;
    }
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(totalPaid - total) > 0.01) {
      toast.error(`O valor pago (${formatCurrency(totalPaid)}) não confere com o total (${formatCurrency(total)})`);
      return;
    }
    setLoading(true);
    try {
      await onConfirm(
        payments.map((p) => ({ methodName: p.methodName, amount: p.amount })),
        customerId
      );
    } finally {
      if (open) setLoading(false);
    }
  };

  const selectedIds = new Set(payments.map((p) => p.methodId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalizar Venda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Total a pagar</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" /> Cliente (Obrigatório para Conta)
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum / Venda Rápida</SelectItem>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-sm font-medium">Formas de Pagamento</p>
          <div className="grid grid-cols-3 gap-2">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => addPayment(m.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all text-xs ${selectedIds.has(m.id)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border hover:border-primary/30"
                  }`}
              >
                {iconMap[m.name] || defaultIcon}
                <span className="font-medium">{m.name}</span>
                {selectedIds.has(m.id) && <CheckCircle className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>

          {payments.length > 0 && (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.methodId} className="flex items-center gap-2 rounded-lg border p-2">
                  <span className="text-sm font-medium flex-1">{p.methodName}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={p.amount || ""}
                      onChange={(e) => updateAmount(p.methodId, parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-right text-sm"
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => removePayment(p.methodId)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {Math.abs(remaining) > 0.01 && (
                <p className={`text-xs font-medium text-center ${remaining > 0 ? "text-destructive" : "text-warning"}`}>
                  {remaining > 0 ? `Faltam ${formatCurrency(remaining)}` : `Excedente de ${formatCurrency(Math.abs(remaining))}`}
                </p>
              )}
            </div>
          )}

          {methods.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhuma forma de pagamento cadastrada. Configure em Configurações.
            </p>
          )}

          <Button
            className="w-full"
            size="lg"
            disabled={
              payments.length === 0 ||
              Math.abs(remaining) > 0.01 ||
              loading ||
              (payments.some(p => p.methodName.toLowerCase() === 'conta') && (!customerId || customerId === 'none'))
            }
            onClick={handleConfirm}
          >
            {loading ? "Processando..." : "Confirmar Pagamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
