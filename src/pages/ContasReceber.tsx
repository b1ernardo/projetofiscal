import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Clock, AlertCircle, Calendar, CreditCard, Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AccountFormDialog } from "@/components/financas/AccountFormDialog";
import { PaymentConfirmationDialog } from "@/components/financas/ReceiveConfirmationDialog";

interface AccountReceivable {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'overdue';
    customer_name?: string;
    category: string;
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function ContasReceber() {
    const queryClient = useQueryClient();
    const [filter, setFilter] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<AccountReceivable | null>(null);

    const { data: accounts = [], isLoading } = useQuery<AccountReceivable[]>({
        queryKey: ["accounts-receivable"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/accounts-receivable`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        },
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/accounts-receivable`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
            toast.success("Novo recebimento registrado!");
            setFormOpen(false);
        },
        onError: () => toast.error("Erro ao registrar recebimento"),
    });

    const receiveMutation = useMutation({
        mutationFn: async ({ account, paymentMethod }: { account: AccountReceivable, paymentMethod: string }) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/accounts-receivable/${account.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...account,
                    status: 'paid',
                    payment_date: new Date().toISOString().split('T')[0],
                    payment_method: paymentMethod
                })
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
            toast.success("Recebimento confirmado!");
            setConfirmDialogOpen(false);
            setSelectedAccount(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`${import.meta.env.VITE_API_URL}/accounts-receivable/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
            toast.success("Recebimento removido!");
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle className="mr-1 h-3 w-3" /> Recebido</Badge>;
            case 'overdue': return <Badge variant="destructive"><AlertCircle className="mr-1 h-3 w-3" /> Atrasado</Badge>;
            default: return <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50"><Clock className="mr-1 h-3 w-3" /> Aguardando</Badge>;
        }
    };

    const filteredAccounts = accounts.filter(acc => {
        const matchesStatus = filter === 'all' || acc.status === filter;
        const matchesSearch =
            acc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (acc.customer_name?.toLowerCase() || "").includes(searchQuery.toLowerCase());

        let matchesDate = true;
        if (startDate || endDate) {
            const accDate = parseISO(acc.due_date);
            const start = startDate ? startOfDay(parseISO(startDate)) : null;
            const end = endDate ? endOfDay(parseISO(endDate)) : null;

            if (start && end) {
                matchesDate = isWithinInterval(accDate, { start, end });
            } else if (start) {
                matchesDate = accDate >= start;
            } else if (end) {
                matchesDate = accDate <= end;
            }
        }

        return matchesStatus && matchesSearch && matchesDate;
    });

    const clearFilters = () => {
        setSearchQuery("");
        setStartDate("");
        setEndDate("");
        setFilter("all");
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-heading italic text-primary">Contas a Receber</h1>
                    <p className="text-muted-foreground">Monitore os recebimentos de clientes e vendas</p>
                </div>
                <Button onClick={() => setFormOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Novo Recebimento
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50/50 border-blue-100">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-blue-600">Total a Receber</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(accounts.filter(a => a.status !== 'paid').reduce((acc, curr) => acc + Number(curr.amount), 0))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-premium bg-card/80 backdrop-blur-sm">
                <CardHeader className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="text-lg">Próximos Recebimentos</CardTitle>
                        <div className="flex flex-wrap gap-2">
                            <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>Tudo</Button>
                            <Button variant={filter === 'pending' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('pending')}>Aguardando</Button>
                            <Button variant={filter === 'paid' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('paid')}>Recebidos</Button>
                            {(searchQuery || startDate || endDate || filter !== 'all') && (
                                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                                    <X className="mr-1 h-3 w-3" /> Limpar
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-4 pt-4 border-t border-muted/50">
                        <div className="flex-1 w-full space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Buscar</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Descrição ou cliente..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 bg-muted/30 h-9"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
                            <div className="flex-1 space-y-1.5">
                                <Label htmlFor="start" className="text-[10px] uppercase font-bold text-muted-foreground">Início</Label>
                                <Input
                                    id="start"
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-muted/30 h-9 w-full"
                                />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <Label htmlFor="end" className="text-[10px] uppercase font-bold text-muted-foreground">Fim</Label>
                                <Input
                                    id="end"
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-muted/30 h-9 w-full"
                                />
                            </div>
                        </div>
                        <div className="flex-none pt-2 md:pt-0">
                            <p className="text-sm text-muted-foreground whitespace-nowrap pb-2">
                                <span className="font-bold text-primary">{filteredAccounts.length}</span> registros
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vencimento</TableHead>
                                <TableHead>Descrição</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAccounts.map((acc) => (
                                <TableRow key={acc.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {format(new Date(acc.due_date), "dd/MM/yyyy", { locale: ptBR })}
                                        </div>
                                    </TableCell>
                                    <TableCell>{acc.description}</TableCell>
                                    <TableCell>{acc.customer_name || "—"}</TableCell>
                                    <TableCell><Badge variant="outline">{acc.category}</Badge></TableCell>
                                    <TableCell className="font-bold text-blue-600">{formatCurrency(acc.amount)}</TableCell>
                                    <TableCell>{getStatusBadge(acc.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {acc.status !== 'paid' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => {
                                                        setSelectedAccount(acc);
                                                        setConfirmDialogOpen(true);
                                                    }}
                                                    title="Confirmar Recebimento"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-red-50" onClick={() => {
                                                if (confirm("Deseja remover este registro?")) deleteMutation.mutate(acc.id)
                                            }}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredAccounts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        Sem registros para mostrar.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AccountFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                onSave={(data) => createMutation.mutate(data)}
                type="receivable"
                title="Novo Recebimento"
            />

            {selectedAccount && (
                <PaymentConfirmationDialog
                    open={confirmDialogOpen}
                    onOpenChange={setConfirmDialogOpen}
                    onConfirm={(paymentMethod) => {
                        receiveMutation.mutate({ account: selectedAccount, paymentMethod });
                    }}
                    amount={selectedAccount.amount}
                    description={selectedAccount.description}
                    type="receivable"
                />
            )}
        </div>
    );
}
