import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, ArrowUpCircle, ArrowDownCircle, Lock, Unlock, Loader2, Pencil, Trash2, History } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { EditSaleDialog } from "@/components/caixa/EditSaleDialog";
import { DeleteSaleDialog } from "@/components/caixa/DeleteSaleDialog";
import { OpenCashRegisterDialog } from "@/components/caixa/OpenCashRegisterDialog";
import { CashMovementDialog } from "@/components/caixa/CashMovementDialog";
import { CloseCashRegisterDialog } from "@/components/caixa/CloseCashRegisterDialog";
import { EditMovementDialog } from "@/components/caixa/EditMovementDialog";
import { DeleteMovementDialog } from "@/components/caixa/DeleteMovementDialog";
import { CashHistoryDialog } from "@/components/caixa/CashHistoryDialog";
import { useFiscal } from "@/hooks/useFiscal";
import { CancelFiscalDialog } from "@/components/caixa/CancelFiscalDialog";
import { FileText, QrCode } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Caixa() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editSale, setEditSale] = useState<any>(null);
  const [deleteSaleId, setDeleteSaleId] = useState<string | null>(null);
  const [cancelSaleId, setCancelSaleId] = useState<string | null>(null);
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [movementType, setMovementType] = useState<"sangria" | "suprimento" | null>(null);
  const [closeCashDialog, setCloseCashDialog] = useState(false);
  const [editMovement, setEditMovement] = useState<any>(null);
  const [deleteMovementId, setDeleteMovementId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const emitFiscal = useFiscal();

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["today-sales"] });
    queryClient.invalidateQueries({ queryKey: ["cash-movements"] });
    queryClient.invalidateQueries({ queryKey: ["cash-register-open"] });
    queryClient.invalidateQueries({ queryKey: ["cash-summary"] });
  };

  // Get the latest open cash register
  const { data: cashRegister, isLoading: loadingRegister } = useQuery({
    queryKey: ["cash-register-open"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/current`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return null;
      return await response.json();
    },
  });

  // Get summary for the open register
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["cash-summary", cashRegister?.id],
    queryFn: async () => {
      if (!cashRegister) return null;
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/summary?id=${cashRegister.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!cashRegister,
  });

  // Get movements for the open register
  const { data: movements = [], isLoading: loadingMovements } = useQuery({
    queryKey: ["cash-movements", cashRegister?.id],
    queryFn: async () => {
      if (!cashRegister) return [];
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cashier/movements?register_id=${cashRegister.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) return [];
      const data = await response.json();
      return data.filter((m: any) => ["sangria", "suprimento"].includes(m.type));
    },
    enabled: !!cashRegister,
  });

  // Get sales for the current open register
  const { data: todaySales = [] } = useQuery({
    queryKey: ["today-sales", cashRegister?.id],
    queryFn: async () => {
      if (!cashRegister) return [];
      const salesRes = await fetch(`${import.meta.env.VITE_API_URL}/reports/sales?limit=50`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!salesRes.ok) return [];
      const data = await salesRes.json();
      return data.filter((s: any) => s.created_at >= cashRegister.opened_at);
    },
    enabled: !!cashRegister,
  });

  const isLoading = loadingRegister || loadingMovements || loadingSummary;

  const totalVendas = summary?.totalSales ?? 0;
  const totalSangrias = summary?.totalSangrias ?? 0;
  const totalSuprimentos = summary?.totalSuprimentos ?? 0;
  const openingBalance = summary?.openingBalance ?? 0;
  const saldo = summary?.closingBalance ?? (openingBalance + totalVendas - totalSangrias + totalSuprimentos);

  // Combine sales and cash movements into a unified timeline
  const allMovements = [
    ...(cashRegister ? [{
      id: 'opening',
      type: "Abertura" as const,
      amount: parseFloat(cashRegister.opening_balance),
      method: "—",
      time: format(new Date(cashRegister.opened_at), "dd/MM HH:mm"),
      rawDate: new Date(cashRegister.opened_at).getTime(),
      saleData: null,
      movementData: null,
    }] : []),
    ...todaySales.map((s: any) => ({
      id: s.id,
      type: "Venda" as const,
      amount: parseFloat(s.total_amount),
      method: s.payment_method,
      time: format(new Date(s.created_at), "dd/MM HH:mm"),
      rawDate: new Date(s.created_at).getTime(),
      saleData: s,
      movementData: null as any,
    })),
    ...movements.map((m: any) => ({
      id: m.id,
      type: m.type === "sangria" ? "Sangria" : "Suprimento",
      amount: m.type === "sangria" ? -parseFloat(m.amount) : parseFloat(m.amount),
      method: "—",
      time: format(new Date(m.created_at), "dd/MM HH:mm"),
      rawDate: new Date(m.created_at).getTime(),
      saleData: null as any,
      movementData: m,
    })),
  ].sort((a, b) => b.rawDate - a.rawDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Caixa Financeiro</h1>
          <p className="text-muted-foreground">
            {cashRegister
              ? `Caixa aberto desde ${format(new Date(cashRegister.opened_at), "HH:mm")}`
              : "Nenhum caixa aberto"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setHistoryOpen(true)}>
            <History className="mr-2 h-4 w-4" /> Histórico
          </Button>
          {cashRegister ? (
            <>
              <Button variant="outline" onClick={() => setMovementType("sangria")}>
                <ArrowDownCircle className="mr-2 h-4 w-4" /> Sangria
              </Button>
              <Button variant="outline" onClick={() => setMovementType("suprimento")}>
                <ArrowUpCircle className="mr-2 h-4 w-4" /> Suprimento
              </Button>
              <Button variant="destructive" onClick={() => setCloseCashDialog(true)}>
                <Lock className="mr-2 h-4 w-4" /> Fechar Caixa
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpenCashDialog(true)}>
              <Unlock className="mr-2 h-4 w-4" /> Abrir Caixa
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
              <DollarSign className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Vendas</p>
              <p className="text-xl font-bold">{formatCurrency(totalVendas)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
              <ArrowDownCircle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sangrias</p>
              <p className="text-xl font-bold">{formatCurrency(totalSangrias)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className="text-xl font-bold">{formatCurrency(saldo)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Movimentações</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : allMovements.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma movimentação hoje.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allMovements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.time}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={m.type === "Sangria" ? "destructive" : m.type === "Suprimento" ? "secondary" : m.type === "Abertura" ? "outline" : "default"}>
                          {m.type}
                        </Badge>
                        {m.type === "Venda" && m.saleData?.fiscal_note_status === "generated" && (
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap cursor-pointer hover:bg-green-100 transition-colors"
                              onClick={() => {
                                if (m.saleData?.fiscal_note_id) {
                                  window.open(`${import.meta.env.VITE_API_URL}/fiscal/danfe/${m.saleData.fiscal_note_id}`, "_blank");
                                }
                              }}
                              title="Clique para ver o DANFE"
                            >
                              NF Emitida
                            </Badge>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive shrink-0" onClick={() => setCancelSaleId(m.saleData?.id)} title="Cancelar Nota Fiscal na SEFAZ">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {m.type === "Venda" && m.saleData?.fiscal_note_status === "cancelled" && (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200 whitespace-nowrap cursor-not-allowed"
                            title="Esta Nota Fiscal foi Cancelada na SEFAZ"
                          >
                            NF Cancelada
                          </Badge>
                        )}
                        {m.type === "Venda" && !m.saleData?.fiscal_note_status && Number(m.saleData?.has_fiscal_note) === 1 && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            NF Emitida
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{m.method}</TableCell>
                    <TableCell className={`text-right font-medium ${m.amount < 0 ? "text-destructive" : ""}`}>
                      {formatCurrency(m.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {m.type === "Venda" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditSale(m.saleData)} title="Editar Venda">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-primary"
                              onClick={() => navigate(`/nfe-avulsa?vendaId=${m.id}`)}
                              title="Emitir NF-e"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-success"
                              onClick={() => emitFiscal.mutate({ saleId: m.id, model: '65' })}
                              disabled={emitFiscal.isPending}
                              title="Emitir NFC-e"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteSaleId(m.id)} title="Excluir Venda">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {(m.type === "Sangria" || m.type === "Suprimento") && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditMovement(m.movementData)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteMovementId(m.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditSaleDialog
        open={!!editSale}
        onOpenChange={(open) => !open && setEditSale(null)}
        sale={editSale}
        onSaved={refreshAll}
      />
      <DeleteSaleDialog
        open={!!deleteSaleId}
        onOpenChange={(open) => !open && setDeleteSaleId(null)}
        saleId={deleteSaleId}
        onDeleted={refreshAll}
      />

      <EditMovementDialog
        open={!!editMovement}
        onOpenChange={(open) => !open && setEditMovement(null)}
        movement={editMovement}
        onSaved={refreshAll}
      />
      <DeleteMovementDialog
        open={!!deleteMovementId}
        onOpenChange={(open) => !open && setDeleteMovementId(null)}
        movementId={deleteMovementId}
        onDeleted={refreshAll}
      />

      <OpenCashRegisterDialog
        open={openCashDialog}
        onOpenChange={setOpenCashDialog}
        onOpened={refreshAll}
      />

      {cashRegister && (
        <CashMovementDialog
          open={!!movementType}
          onOpenChange={(open) => !open && setMovementType(null)}
          type={movementType || "sangria"}
          cashRegisterId={cashRegister.id}
          onSaved={refreshAll}
        />
      )}

      <CloseCashRegisterDialog
        open={closeCashDialog}
        onOpenChange={(open) => {
          setCloseCashDialog(open);
          if (!open) refreshAll();
        }}
        cashRegisterId={cashRegister?.id ?? ""}
        currentBalance={saldo}
        onClosed={() => { }}
      />

      <CashHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />

      <CancelFiscalDialog
        open={!!cancelSaleId}
        onOpenChange={(open) => !open && setCancelSaleId(null)}
        saleId={cancelSaleId}
        onSuccess={refreshAll}
      />
    </div>
  );
}
