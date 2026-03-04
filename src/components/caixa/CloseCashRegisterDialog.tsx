import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Printer, Share2 } from "lucide-react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface SummaryByMethod {
  method: string;
  total: number;
  count: number;
}

interface CashSummary {
  openingBalance: number;
  openedAt: string;
  salesByMethod: SummaryByMethod[];
  totalSales: number;
  totalSalesCount: number;
  totalSangrias: number;
  totalSuprimentos: number;
  closingBalance: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cashRegisterId: string;
  currentBalance: number;
  onClosed: () => void;
}

export function CloseCashRegisterDialog({ open, onOpenChange, cashRegisterId, currentBalance, onClosed }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [closed, setClosed] = useState(false);
  const [observations, setObservations] = useState("");
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setClosed(false);
      fetchSummary();
    }
  }, [open]);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/summary?id=${cashRegisterId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar resumo');
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      toast.error("Erro ao carregar resumo do caixa");
      console.error(error);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleClose = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/close`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: cashRegisterId,
          final_balance: currentBalance, // API expects final_balance as per code
          observations: observations
        })
      });

      if (!response.ok) throw new Error('Falha ao fechar caixa');

      toast.success("Caixa fechado com sucesso!");

      // Invalidate queries to refresh historical views and UI state
      queryClient.invalidateQueries({ queryKey: ["cash-register-open"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers-history"] });
      queryClient.invalidateQueries({ queryKey: ["cash-summary"] });

      onClosed();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const buildTextSummary = () => {
    if (!summary) return "";
    const now = new Date();
    const lines = [
      `📋 *FECHAMENTO DE CAIXA*`,
      `📅 ${format(now, "dd/MM/yyyy")} — ${summary.openedAt ? format(new Date(summary.openedAt), "HH:mm") : "--:--"} às ${format(now, "HH:mm")}`,
      `👤 ${profile?.full_name || "Operador"}`,
      ``,
      `💰 *Saldo Inicial:* ${formatCurrency(summary.openingBalance)}`,
      ``,
      `🛒 *Vendas (${summary.totalSalesCount}):* ${formatCurrency(summary.totalSales)}`,
    ];

    for (const m of summary.salesByMethod) {
      lines.push(`   • ${m.method}: ${formatCurrency(m.total)}`);
    }

    lines.push(``);
    if (summary.totalSuprimentos > 0) {
      lines.push(`⬆️ *Suprimentos:* ${formatCurrency(summary.totalSuprimentos)}`);
    }
    if (summary.totalSangrias > 0) {
      lines.push(`⬇️ *Sangrias:* ${formatCurrency(summary.totalSangrias)}`);
    }
    lines.push(``);
    lines.push(`✅ *Saldo Final:* ${formatCurrency(summary.closingBalance)}`);

    return lines.join("\n");
  };

  const handlePrint = () => {
    const text = buildTextSummary().replace(/\*/g, "");
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Fechamento de Caixa</title>
            <style>
              body { font-family: monospace; font-size: 14px; padding: 20px; white-space: pre-wrap; }
            </style>
          </head>
          <body>${text}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleWhatsApp = () => {
    const text = buildTextSummary();
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{closed ? "Caixa Fechado" : "Fechar Caixa"}</DialogTitle>
        </DialogHeader>

        {loadingSummary ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : summary ? (
          <div ref={summaryRef} className="space-y-4 max-h-[60vh] overflow-auto">
            {/* Period */}
            <div className="rounded-lg border p-3 text-sm">
              <p className="text-muted-foreground">Período</p>
              <p className="font-medium">
                {summary.openedAt
                  ? `${format(new Date(summary.openedAt), "dd/MM/yyyy HH:mm")}`
                  : "--"}{" "}
                até {format(new Date(), "HH:mm")}
              </p>
            </div>

            {/* Opening Balance */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Saldo Inicial</span>
              <span className="font-medium">{formatCurrency(summary.openingBalance)}</span>
            </div>

            <Separator />

            {/* Sales by method */}
            <div>
              <p className="text-sm font-semibold mb-2">Vendas ({summary.totalSalesCount})</p>
              {summary.salesByMethod.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma venda realizada</p>
              ) : (
                <div className="space-y-1">
                  {summary.salesByMethod.map((m) => (
                    <div key={m.method} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{m.method}</span>
                      <span className="font-medium">{formatCurrency(m.total)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                    <span>Total Vendas</span>
                    <span>{formatCurrency(summary.totalSales)}</span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Suprimentos & Sangrias */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Suprimentos</span>
                <span className="font-medium">{formatCurrency(summary.totalSuprimentos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sangrias</span>
                <span className="font-medium text-destructive">-{formatCurrency(summary.totalSangrias)}</span>
              </div>
            </div>

            <Separator />

            {/* Closing Balance */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Saldo de Fechamento</span>
                <span className="text-2xl font-bold">{formatCurrency(summary.closingBalance)}</span>
              </div>
            </div>
            {!closed && (
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações do fechamento..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {closed ? (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleWhatsApp}>
                <Share2 className="mr-2 h-4 w-4" /> WhatsApp
              </Button>
              <Button className="flex-1" onClick={() => onOpenChange(false)}>
                Concluir
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleClose} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Fechamento
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
