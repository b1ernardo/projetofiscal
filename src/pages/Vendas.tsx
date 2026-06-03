import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSales, type SalesFilters } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
    Calendar as CalendarIcon,
    Search,
    FileText,
    Ban,
    CheckCircle2,
    MoreVertical,
    Eye,
    FileJson,
    Printer,
    Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useFiscal } from "@/hooks/useFiscal";
import { CancelFiscalDialog } from "@/components/caixa/CancelFiscalDialog";
import { SaleDetailsDialog } from "@/components/vendas/SaleDetailsDialog";
import { EditSaleDialog } from "@/components/vendas/EditSaleDialog";
import { DeleteSaleDialog } from "@/components/caixa/DeleteSaleDialog";
import { CancelSaleDialog } from "@/components/caixa/CancelSaleDialog";
import { Edit3, QrCode, Trash2, Ban as BanIcon } from "lucide-react";

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function Vendas() {
    const [filters, setFilters] = useState<SalesFilters>({
        start_date: format(new Date(), "yyyy-MM-01"),
        end_date: format(new Date(), "yyyy-MM-dd"),
    });
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [cancelInternalOpen, setCancelInternalOpen] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

    const { data: sales, isLoading, refetch } = useSales(filters);
    const { data: customers } = useCustomers();
    const emitFiscal = useFiscal();
    const navigate = useNavigate();

    const handleFilterChange = (key: keyof SalesFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleEmit = (saleId: string, model: '55' | '65') => {
        if (model === '55') {
            navigate(`/nfe-avulsa?vendaId=${saleId}`);
        } else {
            const promise = emitFiscal.mutateAsync({ saleId, model });
            toast.promise(promise, {
                loading: 'Comunicando com a SEFAZ... Aguarde...',
                success: (data) => {
                    refetch();
                    return data.message || "Nota emitida com sucesso!";
                },
                error: (error) => error.message || "Erro ao emitir nota"
            });
        }
    };

    const handleViewDanfe = (fiscalId: string) => {
        window.open(`${import.meta.env.VITE_API_URL}/fiscal/danfe/${fiscalId}?token=${localStorage.getItem('auth_token')}&t=${Date.now()}`, '_blank');
    };

    const openDetailsDialog = (saleId: string) => {
        setSelectedSaleId(saleId);
        setDetailsOpen(true);
    };

    const openEditDialog = (saleId: string) => {
        setSelectedSaleId(saleId);
        setEditOpen(true);
    };

    const openCancelDialog = (saleId: string) => {
        setSelectedSaleId(saleId);
        setCancelDialogOpen(true);
    };

    const getFiscalBadge = (sale: any) => {
        if (!sale.fiscal_status) return <Badge variant="outline" className="text-muted-foreground">Sem Nota</Badge>;

        if (sale.fiscal_status === 'cancelled') {
            return <Badge variant="destructive" className="gap-1 px-2"><Ban className="h-3 w-3" /> Cancelada</Badge>;
        }

        const label = sale.fiscal_tipo === 'NFCE' ? 'NFC-e' : 'NF-e';
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1 px-2">
            <CheckCircle2 className="h-3 w-3" /> {label} #{sale.fiscal_numero}
        </Badge>;
    };

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5" /> Filtros de Busca
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>De</Label>
                            <Input
                                type="date"
                                value={filters.start_date}
                                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Até</Label>
                            <Input
                                type="date"
                                value={filters.end_date}
                                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Nº Venda</Label>
                            <Input
                                placeholder="Ex: 123"
                                value={filters.sale_number || ""}
                                onChange={(e) => handleFilterChange('sale_number', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cliente</Label>
                            <Select
                                value={filters.customer_id || "all"}
                                onValueChange={(v) => handleFilterChange('customer_id', v === "all" ? "" : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os Clientes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Clientes</SelectItem>
                                    {customers?.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status Fiscal</Label>
                            <Select
                                value={filters.fiscal_status || "all"}
                                onValueChange={(v) => handleFilterChange('fiscal_status', v === "all" ? "" : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Todos os Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os Status</SelectItem>
                                    <SelectItem value="emitted">Nota Emitida</SelectItem>
                                    <SelectItem value="not_emitted">Sem Nota</SelectItem>
                                    <SelectItem value="cancelled">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Nº</TableHead>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Pagamento</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status Fiscal</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground uppercase text-xs tracking-widest font-bold">
                                        Carregando vendas...
                                    </TableCell>
                                </TableRow>
                            ) : sales?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        Nenhuma venda encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sales?.map((sale) => (
                                    <TableRow key={sale.id}>
                                        <TableCell className="font-medium">#{sale.sale_number}</TableCell>
                                        <TableCell>{format(new Date(sale.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                                        <TableCell>{sale.customer_name || "Consumidor Final"}</TableCell>
                                        <TableCell className="text-xs uppercase text-muted-foreground">{sale.payment_method}</TableCell>
                                        <TableCell className="font-semibold text-primary">{formatCurrency(sale.total_amount)}</TableCell>
                                        <TableCell>{getFiscalBadge(sale)}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetailsDialog(sale.id)} title="Ver Detalhes">
                                                    <Eye className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(sale.id)} title="Editar Venda">
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </Button>
                                                
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-primary"
                                                    onClick={() => navigate(`/nfe-avulsa?vendaId=${sale.id}`)}
                                                    title="Emitir NF-e"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                </Button>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-success"
                                                    onClick={() => handleEmit(sale.id, '65')}
                                                    disabled={emitFiscal.isPending}
                                                    title="Emitir NFC-e"
                                                >
                                                    <QrCode className="h-3.5 w-3.5" />
                                                </Button>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-orange-500" 
                                                    onClick={() => {
                                                        setSelectedSaleId(sale.id);
                                                        setCancelInternalOpen(true);
                                                    }} 
                                                    title="Cancelar Venda (Interno)" 
                                                    disabled={sale.status === 'cancelada'}
                                                >
                                                    <BanIcon className="h-3.5 w-3.5" />
                                                </Button>

                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-destructive" 
                                                    onClick={() => {
                                                        setSelectedSaleId(sale.id);
                                                        setDeleteOpen(true);
                                                    }} 
                                                    title="Excluir Venda"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CancelFiscalDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
                saleId={selectedSaleId}
                onSuccess={() => refetch()}
            />

            <SaleDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                saleId={selectedSaleId}
            />

            <EditSaleDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                saleId={selectedSaleId}
                onSuccess={() => refetch()}
            />

            <DeleteSaleDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                saleId={selectedSaleId}
                onDeleted={() => refetch()}
            />

            <CancelSaleDialog
                open={cancelInternalOpen}
                onOpenChange={setCancelInternalOpen}
                saleId={selectedSaleId}
                onCancelled={() => refetch()}
            />
        </div>
    );
}
