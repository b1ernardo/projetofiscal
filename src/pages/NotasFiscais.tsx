import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Download, XCircle, Eye, Search, RefreshCw, CheckCircle2, AlertCircle, Clock, FileEdit, Trash2, PenSquare, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;
const token = () => localStorage.getItem("auth_token");

interface FiscalNote {
    id: string;
    sale_id: string;
    tipo: "NFE" | "NFCE";
    numero: number;
    serie: number;
    chave: string | null;
    status: string;
    protocolo: string | null;
    motivo_rejeicao: string | null;
    created_at: string;
    sale_number: number | null;
    customer_name: string | null;
    total_amount: number | null;
}

interface Rascunho {
    id: string;
    tipo: string;
    titulo: string;
    contingencia: boolean;
    created_at: string;
    updated_at: string;
}

const fetchNotes = async (tipo: string, search: string): Promise<FiscalNote[]> => {
    const params = new URLSearchParams({ tipo });
    if (search) params.append("search", search);
    const res = await fetch(`${API}/fiscal/notas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) throw new Error("Erro ao buscar notas");
    return res.json();
};

const fetchRascunhos = async (tipo: string): Promise<Rascunho[]> => {
    const res = await fetch(`${API}/fiscal/rascunhos?tipo=${tipo}`, {
        headers: { Authorization: `Bearer ${token()}` },
    });
    if (!res.ok) return [];
    return res.json();
};

const statusConfig: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline"; icon: any }> = {
    generated: { label: "Autorizada", variant: "default", icon: CheckCircle2 },
    autorizada: { label: "Autorizada", variant: "default", icon: CheckCircle2 },
    cancelled: { label: "Cancelada", variant: "destructive", icon: XCircle },
    cancelada: { label: "Cancelada", variant: "destructive", icon: XCircle },
    rejeitada: { label: "Rejeitada", variant: "destructive", icon: AlertCircle },
    pendente: { label: "Pendente", variant: "secondary", icon: Clock },
};

function getStatusCfg(status: string) {
    return statusConfig[status?.toLowerCase()] ?? { label: status, variant: "outline" as const, icon: Clock };
}

export default function NotasFiscais({ tipo }: { tipo: "NFE" | "NFCE" }) {
    const [activeTab, setActiveTab] = useState<"transmitidas" | "rascunhos">("transmitidas");
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [cancelDialog, setCancelDialog] = useState<{ open: boolean; note: FiscalNote | null }>({ open: false, note: null });
    const [justificativa, setJustificativa] = useState("");
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: notes = [], isLoading, refetch } = useQuery({
        queryKey: ["fiscal-notes", tipo, search],
        queryFn: () => fetchNotes(tipo, search),
    });

    const { data: rascunhos = [], refetch: refetchRascunhos } = useQuery({
        queryKey: ["fiscal-rascunhos", tipo],
        queryFn: () => fetchRascunhos(tipo),
    });

    const deleteRascunhoMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`${API}/fiscal/rascunho/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token()}` }
            });
        },
        onSuccess: () => {
            toast.success("Rascunho excluído.");
            queryClient.invalidateQueries({ queryKey: ["fiscal-rascunhos"] });
        }
    });

    const cancelMutation = useMutation({
        mutationFn: async ({ saleId, justificativa }: { saleId: string; justificativa: string }) => {
            const res = await fetch(`${API}/fiscal/cancelar`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
                body: JSON.stringify({ saleId, justificativa }),
            });
            const txt = await res.text();
            try { const j = JSON.parse(txt); if (!res.ok) throw new Error(j.message); return j; }
            catch { throw new Error(txt.substring(0, 200)); }
        },
        onSuccess: (data) => {
            toast.success(data.message || "Nota cancelada com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["fiscal-notes"] });
            setCancelDialog({ open: false, note: null });
            setJustificativa("");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleDanfe = (noteId: string) => {
        window.open(`${API}/fiscal/danfe/${noteId}?token=${token()}`, "_blank");
    };

    const handleXml = (noteId: string) => {
        window.open(`${API}/fiscal/xml/${noteId}?token=${token()}`, "_blank");
    };

    const authorizedCount = notes.filter(n => ["generated", "autorizada"].includes(n.status?.toLowerCase())).length;
    const cancelledCount = notes.filter(n => ["cancelled", "cancelada"].includes(n.status?.toLowerCase())).length;
    const total = notes.reduce((s, n) => s + (Number(n.total_amount) || 0), 0);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" />
                        {tipo === "NFE" ? "NF-e — Notas Fiscais Eletrônicas" : "NFC-e — Notas Fiscais de Consumidor"}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Gerencie as notas {tipo === "NFE" ? "NF-e (Modelo 55)" : "NFC-e (Modelo 65)"} emitidas
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Atualizar
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Transmitidas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{notes.length}</p>
                    </CardContent>
                </Card>
                <Card className="border-green-500/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> Autorizadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{authorizedCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-red-500/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
                            <XCircle className="h-4 w-4" /> Canceladas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">{cancelledCount}</p>
                    </CardContent>
                </Card>
                <Card className="border-blue-500/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1">
                            <FileEdit className="h-4 w-4" /> Em Digitação
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{rascunhos.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="transmitidas" className="gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Transmitidas ({notes.length})
                        </TabsTrigger>
                        <TabsTrigger value="rascunhos" className="gap-2">
                            <FileEdit className="h-4 w-4" /> Em Digitação ({rascunhos.length})
                        </TabsTrigger>
                    </TabsList>
                    <Button variant="outline" size="sm" onClick={() => { refetch(); refetchRascunhos(); }} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Atualizar
                    </Button>
                </div>

                {/* ─── Aba Transmitidas ─── */}
                <TabsContent value="transmitidas" className="mt-4 space-y-4">
                    {/* Filter */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex gap-3 flex-wrap">
                                <div className="flex-1 min-w-[200px] flex gap-2">
                                    <Input
                                        placeholder="Buscar por número, chave ou cliente..."
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && setSearch(searchInput)}
                                        className="h-9"
                                    />
                                    <Button size="sm" onClick={() => setSearch(searchInput)} className="gap-1">
                                        <Search className="h-4 w-4" />
                                    </Button>
                                    {search && (
                                        <Button size="sm" variant="ghost" onClick={() => { setSearch(""); setSearchInput(""); }}>
                                            Limpar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-4 overflow-x-auto">
                            {isLoading ? (
                                <div className="flex justify-center py-16">
                                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                                </div>
                            ) : notes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                                    <CheckCircle2 className="h-12 w-12 opacity-30" />
                                    <p className="text-lg font-medium">Nenhuma nota transmitida</p>
                                    <p className="text-sm">Emita uma nota para ela aparecer aqui.</p>
                                </div>
                            ) : (
                                <Table className="min-w-[900px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nº Nota</TableHead>
                                            <TableHead>Série</TableHead>
                                            <TableHead>Data</TableHead>
                                            <TableHead>Venda</TableHead>
                                            <TableHead>Cliente</TableHead>
                                            <TableHead className="text-right">Valor</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {notes.map(note => {
                                            const cfg = getStatusCfg(note.status);
                                            const Icon = cfg.icon;
                                            const isCancellable = ["generated", "autorizada"].includes(note.status?.toLowerCase());
                                            return (
                                                <TableRow key={note.id}>
                                                    <TableCell className="font-mono font-semibold">
                                                        {String(note.numero).padStart(9, "0")}
                                                    </TableCell>
                                                    <TableCell>{note.serie}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {new Date(note.created_at).toLocaleDateString("pt-BR", {
                                                            day: "2-digit", month: "2-digit", year: "numeric",
                                                            hour: "2-digit", minute: "2-digit"
                                                        })}
                                                    </TableCell>
                                                    <TableCell>{note.sale_number ? `#${note.sale_number}` : "—"}</TableCell>
                                                    <TableCell className="max-w-[160px] truncate text-sm">
                                                        {note.customer_name || "Consumidor Final"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        {note.total_amount
                                                            ? Number(note.total_amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={cfg.variant} className="gap-1 text-xs">
                                                            <Icon className="h-3 w-3" />
                                                            {cfg.label}
                                                        </Badge>
                                                        {note.motivo_rejeicao && (
                                                            <p className="text-xs text-muted-foreground mt-1 max-w-[160px] truncate" title={note.motivo_rejeicao}>
                                                                {note.motivo_rejeicao}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex gap-1 justify-end">
                                                            <Button variant="ghost" size="icon" title="DANFE (PDF)" onClick={() => handleDanfe(note.id)}>
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" title="Download XML" onClick={() => handleXml(note.id)}>
                                                                <Download className="h-4 w-4" />
                                                            </Button>
                                                            {isCancellable && (
                                                                <Button
                                                                    variant="ghost" size="icon" title="Cancelar Nota"
                                                                    className="text-destructive hover:text-destructive"
                                                                    onClick={() => { setCancelDialog({ open: true, note }); setJustificativa(""); }}
                                                                >
                                                                    <XCircle className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ─── Aba Em Digitação (Rascunhos) ─── */}
                <TabsContent value="rascunhos" className="mt-4">
                    <Card>
                        <CardContent className="pt-4 overflow-x-auto">
                            {rascunhos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                                    <FileEdit className="h-12 w-12 opacity-30" />
                                    <p className="text-lg font-medium">Nenhum rascunho</p>
                                    <p className="text-sm">Clique em "Salvar Rascunho" na tela NF-e Avulsa para salvar um aqui.</p>
                                    <Button variant="outline" onClick={() => navigate('/nfe-avulsa')} className="mt-2 gap-2">
                                        <PenSquare className="h-4 w-4" /> Nova NF-e Avulsa
                                    </Button>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Destinatário / Descrição</TableHead>
                                            <TableHead>Última Edição</TableHead>
                                            <TableHead>Criado em</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rascunhos.map(r => (
                                            <TableRow key={r.id} className={r.contingencia ? "bg-orange-50/50 dark:bg-orange-950/10" : ""}>
                                                <TableCell className="font-medium">
                                                    {r.contingencia && <ShieldAlert className="h-4 w-4 text-orange-500 inline mr-1" />}
                                                    {r.titulo || "Sem título"}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(r.updated_at).toLocaleDateString("pt-BR", {
                                                        day: "2-digit", month: "2-digit", year: "numeric",
                                                        hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(r.created_at).toLocaleDateString("pt-BR", {
                                                        day: "2-digit", month: "2-digit", year: "numeric"
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    {r.contingencia ? (
                                                        <Badge variant="secondary" className="gap-1 text-xs text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950 dark:text-orange-300">
                                                            <ShieldAlert className="h-3 w-3" /> Contingência
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="gap-1 text-xs text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:text-blue-300">
                                                            <FileEdit className="h-3 w-3" /> Em Digitação
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex gap-1 justify-end">
                                                        <Button
                                                            variant="outline" size="sm"
                                                            className={`gap-1 ${r.contingencia ? "text-orange-600 border-orange-300 hover:bg-orange-50" : "text-blue-600 border-blue-300"}`}
                                                            onClick={() => navigate(`/nfe-avulsa?rascunhoId=${r.id}`)}
                                                        >
                                                            <PenSquare className="h-4 w-4" /> Continuar Edição
                                                        </Button>
                                                        <Button
                                                            variant="ghost" size="icon" title="Excluir Rascunho"
                                                            className="text-destructive hover:text-destructive"
                                                            onClick={() => deleteRascunhoMutation.mutate(r.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Cancel Dialog */}
            <Dialog open={cancelDialog.open} onOpenChange={o => setCancelDialog({ open: o, note: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-destructive flex items-center gap-2">
                            <XCircle className="h-5 w-5" /> Cancelar Nota Fiscal
                        </DialogTitle>
                        <DialogDescription>
                            Nota Nº {cancelDialog.note && String(cancelDialog.note.numero).padStart(9, "0")} — Esta ação é irreversível.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            Informe a justificativa de cancelamento <span className="font-semibold">(mínimo 15 caracteres)</span>:
                        </p>
                        <textarea
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                            rows={4}
                            placeholder="Ex: Erro no cadastro do produto, venda cancelada pelo cliente..."
                            value={justificativa}
                            onChange={e => setJustificativa(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">{justificativa.length} caracteres</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelDialog({ open: false, note: null })}>Fechar</Button>
                        <Button
                            variant="destructive"
                            disabled={justificativa.trim().length < 15 || cancelMutation.isPending}
                            onClick={() => cancelDialog.note && cancelMutation.mutate({ saleId: cancelDialog.note.sale_id, justificativa })}
                        >
                            {cancelMutation.isPending ? "Cancelando..." : "Confirmar Cancelamento"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
