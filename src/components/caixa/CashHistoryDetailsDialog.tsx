import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Printer, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface CashRegister {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_balance: number;
  closing_balance: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  register: CashRegister | null;
}

export function CashHistoryDetailsDialog({ open, onOpenChange, register }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["cash-register-details", register?.id],
    queryFn: async () => {
      if (!register) return null;

      const [summaryRes, movementsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/cashier/summary?id=${register.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL}/cashier/movements?register_id=${register.id}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        })
      ]);

      if (!summaryRes.ok || !movementsRes.ok) throw new Error('Falha ao carregar detalhes');

      const summary = await summaryRes.json();
      const movements = await movementsRes.json();

      const byMethod: Record<string, number> = {};
      if (summary.salesByMethod) {
        summary.salesByMethod.forEach((item: any) => {
          byMethod[item.method] = parseFloat(item.total);
        });
      }

      return {
        byMethod,
        movements: movements || [],
      };
    },
    enabled: open && !!register?.id,
  });

  if (!register) return null;

  const byMethod = data?.byMethod || {};
  const movements = data?.movements || [];

  const totalVendas = Object.values(byMethod).reduce((s, v) => s + v, 0);
  const totalSangrias = movements
    .filter((m: any) => m.type === "sangria")
    .reduce((s: number, m: any) => s + m.amount, 0);
  const totalSuprimentos = movements
    .filter((m: any) => m.type === "suprimento")
    .reduce((s: number, m: any) => s + m.amount, 0);

  const buildReportText = () => {
    const opened = format(new Date(register.opened_at), "dd/MM/yyyy HH:mm");
    const closed = register.closed_at
      ? format(new Date(register.closed_at), "dd/MM/yyyy HH:mm")
      : "—";

    let text = `*Relatório de Caixa*\n`;
    text += `Abertura: ${opened}\nFechamento: ${closed}\n\n`;
    text += `Saldo Inicial: ${formatCurrency(register.opening_balance)}\n\n`;

    text += `*Vendas por Forma de Pagamento:*\n`;
    for (const [method, total] of Object.entries(byMethod)) {
      text += `${method}: ${formatCurrency(total as number)}\n`;
    }
    text += `\n*Total Vendas: ${formatCurrency(totalVendas)}*\n`;

    if (totalSangrias > 0) text += `Sangrias: ${formatCurrency(totalSangrias)}\n`;
    if (totalSuprimentos > 0) text += `Suprimentos: ${formatCurrency(totalSuprimentos)}\n`;

    text += `\n*Saldo Final: ${register.closing_balance != null ? formatCurrency(register.closing_balance) : "—"}*`;
    return text;
  };

  const handlePrint = () => {
    const opened = format(new Date(register.opened_at), "dd/MM/yyyy HH:mm");
    const closed = register.closed_at
      ? format(new Date(register.closed_at), "dd/MM/yyyy HH:mm")
      : "—";

    const methodRows = Object.entries(byMethod)
      .map(
        ([method, total]) =>
          `<tr><td style="padding:6px 12px">${method}</td><td style="padding:6px 12px;text-align:right;font-weight:600">${formatCurrency(total as number)}</td></tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head><title>Relatório de Caixa</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 13px; }
        h2 { margin-bottom: 4px; }
        table { border-collapse: collapse; width: 100%; max-width: 400px; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 6px 12px; text-align: left; }
        th { background: #f5f5f5; }
        .summary { margin: 16px 0; }
        .summary div { margin-bottom: 4px; }
        .total { font-size: 16px; font-weight: bold; margin-top: 8px; }
      </style>
      </head>
      <body>
        <h2>Relatório de Caixa</h2>
        <p>Abertura: ${opened} &nbsp;|&nbsp; Fechamento: ${closed}</p>
        <div class="summary">
          <div>Saldo Inicial: <strong>${formatCurrency(register.opening_balance)}</strong></div>
        </div>
        <h3>Vendas por Forma de Pagamento</h3>
        <table>
          <thead><tr><th>Forma de Pagamento</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${methodRows}
            <tr style="background:#f0f0f0;font-weight:bold"><td style="padding:6px 12px">Total Vendas</td><td style="padding:6px 12px;text-align:right">${formatCurrency(totalVendas)}</td></tr>
          </tbody>
        </table>
        <div class="summary" style="margin-top:16px">
          ${totalSangrias > 0 ? `<div>Sangrias: <strong style="color:red">${formatCurrency(totalSangrias)}</strong></div>` : ""}
          ${totalSuprimentos > 0 ? `<div>Suprimentos: <strong>${formatCurrency(totalSuprimentos)}</strong></div>` : ""}
          <div class="total">Saldo Final: ${register.closing_balance != null ? formatCurrency(register.closing_balance) : "—"}</div>
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleWhatsApp = () => {
    const text = buildReportText();
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>Detalhes do Caixa</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading}>
                <Printer className="mr-1.5 h-4 w-4" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleWhatsApp} disabled={isLoading}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Abertura: {format(new Date(register.opened_at), "dd/MM/yy HH:mm")}</span>
              <span>Fechamento: {register.closed_at ? format(new Date(register.closed_at), "dd/MM/yy HH:mm") : "—"}</span>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Saldo Inicial</p>
              <p className="text-lg font-bold">{formatCurrency(register.opening_balance)}</p>
            </div>

            <div className="rounded-lg border p-3 space-y-2">
              <p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">Vendas por Forma de Pagamento</p>
              {Object.keys(byMethod).length === 0 ? (
                <p className="text-muted-foreground">Nenhuma venda registrada.</p>
              ) : (
                <div className="space-y-1">
                  {Object.entries(byMethod).map(([method, total]) => (
                    <div key={method} className="flex justify-between">
                      <span>{method}</span>
                      <span className="font-medium">{formatCurrency(total as number)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1 font-bold">
                    <span>Total Vendas</span>
                    <span>{formatCurrency(totalVendas)}</span>
                  </div>
                </div>
              )}
            </div>

            {(totalSangrias > 0 || totalSuprimentos > 0) && (
              <div className="rounded-lg border p-3 space-y-1">
                {totalSangrias > 0 && (
                  <div className="flex justify-between">
                    <span>Sangrias</span>
                    <span className="font-medium text-destructive">{formatCurrency(totalSangrias)}</span>
                  </div>
                )}
                {totalSuprimentos > 0 && (
                  <div className="flex justify-between">
                    <span>Suprimentos</span>
                    <span className="font-medium">{formatCurrency(totalSuprimentos)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Saldo Final</span>
                <span className="text-lg font-bold">
                  {register.closing_balance != null ? formatCurrency(register.closing_balance) : "—"}
                </span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
