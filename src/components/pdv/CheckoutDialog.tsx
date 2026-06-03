import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CreditCard, Banknote, Smartphone, CheckCircle, Plus, X, User, CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface PaymentEntry {
  methodName: string;
  amount: number;
  installments?: {
    dueDate: string;
    amount: number;
  }[];
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

  // Estados para parcelamento (exclusivo para 'Conta')
  const [numInstallments, setNumInstallments] = useState<number>(1);
  const [intervalDays, setIntervalDays] = useState<number>(30);

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
      setNumInstallments(1);
      setIntervalDays(30);
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

  const generateInstallments = (amount: number, count: number, interval: number) => {
    const installments = [];
    const baseAmount = Math.floor((amount / count) * 100) / 100;
    let totalAssigned = 0;

    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() + (i + 1) * interval);
      
      let currentAmount = baseAmount;
      if (i === count - 1) {
        currentAmount = Math.round((amount - totalAssigned) * 100) / 100;
      }
      totalAssigned += currentAmount;

      installments.push({
        dueDate: date.toISOString().split('T')[0],
        amount: currentAmount
      });
    }
    return installments;
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

    const isContaSelected = payments.some(p => p.methodName.toLowerCase() === 'conta');
    if (isContaSelected && (!customerId || customerId === 'none')) {
      toast.error("Vendas em 'Conta' exigem a seleção de um cliente.");
      return;
    }

    setLoading(true);
    try {
      const finalPayments: PaymentEntry[] = payments.map((p) => {
        const entry: PaymentEntry = { methodName: p.methodName, amount: p.amount };
        if (p.methodName.toLowerCase() === 'conta') {
          entry.installments = generateInstallments(p.amount, numInstallments, intervalDays);
        }
        return entry;
      });

      await onConfirm(finalPayments, customerId);
    } finally {
      if (open) setLoading(false);
    }
  };

  const selectedIds = new Set(payments.map((p) => p.methodId));
  const hasConta = payments.some(p => p.methodName.toLowerCase() === 'conta');
  const contaAmount = payments.find(p => p.methodName.toLowerCase() === 'conta')?.amount || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Finalizar Venda</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-100 p-4 text-center border">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total a pagar</p>
            <p className="text-4xl font-black text-primary">{formatCurrency(total)}</p>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 font-semibold">
              <User className="h-4 w-4 text-primary" /> Cliente {hasConta && <span className="text-destructive font-bold">*</span>}
            </Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="Selecione um cliente..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum / Venda Rápida</SelectItem>
                {customers.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasConta && !customerId && (
              <p className="text-[10px] text-destructive font-medium uppercase">Obrigatório para venda a prazo</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold border-b pb-1">Formas de Pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => addPayment(m.id)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all text-[11px] ${selectedIds.has(m.id)
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : "border-slate-200 bg-white hover:border-primary/30"
                    }`}
                >
                  {iconMap[m.name] || defaultIcon}
                  <span className="font-bold">{m.name}</span>
                  {selectedIds.has(m.id) && <CheckCircle className="h-3.5 w-3.5 absolute top-1 right-1" />}
                </button>
              ))}
            </div>
          </div>

          {payments.length > 0 && (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.methodId} className="flex items-center gap-2 rounded-lg border bg-white p-2 shadow-sm">
                  <span className="text-sm font-bold flex-1 text-slate-700">{p.methodName}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-400">R$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={p.amount || ""}
                      onChange={(e) => updateAmount(p.methodId, parseFloat(e.target.value) || 0)}
                      className="w-28 h-9 text-right text-base font-bold"
                      onFocus={(e) => e.target.select()}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/5 shrink-0" onClick={() => removePayment(p.methodId)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {hasConta && contaAmount > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2 text-primary font-bold text-sm">
                    <CalendarDays className="h-4 w-4" /> Configurar Parcelamento
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-500">Parcelas</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="12" 
                        value={numInstallments} 
                        onChange={(e) => setNumInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-9 bg-white"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-bold uppercase text-slate-500">Intervalo (Dias)</Label>
                      <Input 
                        type="number" 
                        min="1" 
                        value={intervalDays} 
                        onChange={(e) => setIntervalDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="h-9 bg-white"
                      />
                    </div>
                  </div>
                  {numInstallments > 1 && (
                    <div className="text-xs font-medium text-primary bg-white p-2 rounded border border-primary/10">
                      Serão geradas <span className="font-bold">{numInstallments} parcelas</span> de aproximadamente <span className="font-bold text-base">{formatCurrency(contaAmount / numInstallments)}</span>
                    </div>
                  )}
                </div>
              )}

              {Math.abs(remaining) > 0.01 && (
                <div className={`p-2 rounded mt-2 text-center text-xs font-bold uppercase tracking-tight ${remaining > 0 ? "bg-destructive/10 text-destructive" : "bg-orange-100 text-orange-700"}`}>
                  {remaining > 0 ? `Faltam ${formatCurrency(remaining)} para fechar o total` : `Excedente de ${formatCurrency(Math.abs(remaining))}`}
                </div>
              )}
            </div>
          )}

          {methods.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4 bg-slate-50 rounded-lg border border-dashed">
              Nenhuma forma de pagamento configurada.
            </p>
          )}

          <Button
            className="w-full h-12 text-base font-bold shadow-lg"
            size="lg"
            disabled={
              payments.length === 0 ||
              Math.abs(remaining) > 0.01 ||
              loading ||
              (hasConta && (!customerId || customerId === 'none'))
            }
            onClick={handleConfirm}
          >
            {loading ? "Processando..." : "Confirmar e Finalizar Venda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
