import { useState } from "react";
import {
    Plus, Search, FileText, Wrench, Smartphone, Car,
    MoreVertical, Eye, Pencil, Trash2, Printer,
    AlertCircle, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { useServiceOrders, useDeleteSO, ServiceOrder } from "@/hooks/useServiceOrders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { printSO_A4, ServiceOrderData } from "@/utils/printReceipt";
import { api } from "@/services/api";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const statusMap = {
    pendente: { label: "Pendente", color: "bg-gray-100 text-gray-800", icon: Clock },
    em_analise: { label: "Em Análise", color: "bg-yellow-100 text-yellow-800", icon: Search },
    orcamento_aprovado: { label: "Orçamento Aprovado", color: "bg-blue-100 text-blue-800", icon: CheckCircle2 },
    orcamento_reprovado: { label: "Orçamento Reprovado", color: "bg-red-100 text-red-800", icon: XCircle },
    em_execucao: { label: "Em Execução", color: "bg-orange-100 text-orange-800", icon: Wrench },
    aguardando_pecas: { label: "Aguardando Peças", color: "bg-purple-100 text-purple-800", icon: AlertCircle },
    pronto: { label: "Pronto", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
    entregue: { label: "Entregue", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
    cancelado: { label: "Cancelado", color: "bg-slate-100 text-slate-800", icon: XCircle },
};

const priorityMap = {
    baixa: { label: "Baixa", color: "text-blue-600" },
    media: { label: "Média", color: "text-yellow-600" },
    alta: { label: "Alta", color: "text-red-600 font-bold" },
};

export default function ServiceOrders() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data: orders, isLoading } = useServiceOrders();
    const deleteSO = useDeleteSO();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    const [soToDelete, setSoToDelete] = useState<string | null>(null);

    const filteredOrders = orders?.filter(o => {
        const matchesSearch = (
            o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
            o.item_identifier?.toLowerCase().includes(search.toLowerCase()) ||
            o.id.toLowerCase().includes(search.toLowerCase()) ||
            o.so_number?.toString().includes(search)
        );
        const matchesStatus = statusFilter === "todos" || o.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleDelete = async () => {
        if (soToDelete) {
            await deleteSO.mutateAsync(soToDelete);
            setSoToDelete(null);
        }
    };

    const handlePrint = async (id: string) => {
        try {
            const so = await api.get<ServiceOrder>(`/service-orders/${id}`);

            const printData: ServiceOrderData = {
                id: so.id,
                so_number: so.so_number,
                customerName: so.customer_name,
                customerPhone: so.customer_phone,
                customerDocument: so.customer_doc,
                customerAddress: so.customer_address,
                itemType: so.item_type,
                itemMake: so.item_make,
                itemModel: so.item_model,
                itemIdentifier: so.item_identifier,
                itemColor: so.item_color,
                itemCondition: so.item_condition,
                accessories: so.accessories,
                problemReported: so.problem_reported,
                problemFound: so.problem_found,
                servicePerformed: so.service_performed,
                items: so.items,
                services: so.services,
                laborTotal: Number(so.labor_total),
                partsTotal: Number(so.parts_total),
                discount: Number(so.discount),
                totalAmount: Number(so.total_amount),
                status: so.status,
                priority: so.priority,
                entryDate: new Date(so.entry_date),
                expectedDelivery: so.expected_delivery ? new Date(so.expected_delivery) : undefined,
            };

            printSO_A4(printData);
        } catch (error) {
            toast.error("Erro ao carregar dados para impressão");
        }
    };

    const getItemIcon = (type: string) => {
        switch (type) {
            case 'veiculo': return <Car className="w-4 h-4 mr-2 text-blue-500" />;
            case 'celular': return <Smartphone className="w-4 h-4 mr-2 text-purple-500" />;
            default: return <Wrench className="w-4 h-4 mr-2 text-gray-500" />;
        }
    };

    return (
        <div className="p-6 space-y-6 bg-[#f8fbff] min-h-screen">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="text-primary" /> Ordens de Serviço
                    </h1>
                    <p className="text-sm text-gray-500">Gestão de oficina e assistência técnica</p>
                </div>
                <Button onClick={() => navigate("/ordens-servico/nova")} className="gap-2">
                    <Plus size={18} /> Nova OS
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs uppercase text-gray-500 font-bold">Total de OS</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black">{orders?.length || 0}</p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-yellow-400">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs uppercase text-yellow-600 font-bold">Pendente/Análise</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black">
                            {orders?.filter(o => o.status === 'pendente' || o.status === 'em_analise').length || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-blue-400">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs uppercase text-blue-600 font-bold">Em Execução</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black">
                            {orders?.filter(o => o.status === 'em_execucao' || o.status === 'aguardando_pecas').length || 0}
                        </p>
                    </CardContent>
                </Card>
                <Card className="bg-white border-l-4 border-l-green-400">
                    <CardHeader className="py-4">
                        <CardTitle className="text-xs uppercase text-green-600 font-bold">Pronto/Entregue</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-black">
                            {orders?.filter(o => o.status === 'pronto' || o.status === 'entregue').length || 0}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder="Buscar por cliente, placa, IMEI ou ID..."
                            className="pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Filtrar por Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="todos">Todos os Status</SelectItem>
                                {Object.entries(statusMap).map(([key, value]) => (
                                    <SelectItem key={key} value={key}>
                                        {value.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow className="bg-gray-50">
                            <TableHead className="w-20 font-bold">ID</TableHead>
                            <TableHead className="font-bold">Cliente</TableHead>
                            <TableHead className="font-bold">Item/Identificador</TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                            <TableHead className="font-bold">Prioridade</TableHead>
                            <TableHead className="font-bold">Entrada</TableHead>
                            <TableHead className="font-bold text-right">Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10 text-gray-500">Carregando ordens de serviço...</TableCell>
                            </TableRow>
                        ) : filteredOrders?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10 text-gray-500">Nenhuma ordem de serviço encontrada.</TableCell>
                            </TableRow>
                        ) : (
                            filteredOrders?.map((order) => {
                                return (
                                    <TableRow key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                        <TableCell className="font-mono text-[11px] font-bold text-gray-500">#{order.so_number || order.id?.slice(0, 8) || "---"}</TableCell>
                                        <TableCell>
                                            <div className="font-bold text-gray-800">{order.customer_name || "Sem Nome"}</div>
                                            <div className="text-[10px] text-gray-500">{order.customer_phone || "---"}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-sm font-medium">
                                                {getItemIcon(order.item_type)}
                                                {order.item_make} {order.item_model}
                                            </div>
                                            <div className="text-[11px] font-bold text-primary bg-primary/5 inline-block px-1.5 rounded">
                                                {order.item_identifier || "---"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {statusMap[order.status] ? (() => {
                                                const status = statusMap[order.status];
                                                const StatusIcon = status.icon;
                                                return (
                                                    <Badge className={`${status.color} border-none font-bold py-1 gap-1`}>
                                                        {StatusIcon && <StatusIcon size={12} />}
                                                        {status.label}
                                                    </Badge>
                                                );
                                            })() : (
                                                <Badge variant="outline">{order.status}</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {priorityMap[order.priority] ? (
                                                <span className={`text-xs ${priorityMap[order.priority].color}`}>
                                                    {priorityMap[order.priority].label}
                                                </span>
                                            ) : (
                                                <span className="text-xs">{order.priority}</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-600">
                                            {order.entry_date ? format(new Date(order.entry_date), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "---"}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-gray-900">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(order.total_amount) || 0)}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-200">
                                                        <MoreVertical size={16} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem onClick={() => navigate(`/ordens-servico/ver/${order.id}`)} className="gap-2">
                                                        <Eye size={14} /> Visualizar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/ordens-servico/editar/${order.id}`)} className="gap-2">
                                                        <Pencil size={14} /> Editar OS
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePrint(order.id)} className="gap-2 text-orange-600">
                                                        <Printer size={14} /> Imprimir A4
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setSoToDelete(order.id)} className="gap-2 text-red-600">
                                                        <Trash2 size={14} /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!soToDelete} onOpenChange={() => setSoToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Ordem de Serviço?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A OS será removida permanentemente do sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
