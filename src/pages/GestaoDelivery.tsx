import { useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Bike, CheckCircle2, Clock, MapPin, Phone, User, ChefHat, LayoutGrid, XCircle, Search, PlusCircle, Printer, RefreshCw, MessageSquare, ExternalLink, ChevronDown, ChevronUp, Check, X, Volume2, VolumeX, FileText
} from "lucide-react";

import { useDeliveryOrders, useUpdateDeliveryOrderStatus, DeliveryOrder } from "@/hooks/useDeliveryOrders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ManualDeliveryDialog } from "@/components/delivery/ManualDeliveryDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { printDeliveryA4, type DeliveryData } from "@/utils/printReceipt";

export default function GestaoDelivery() {
    const [activeTab, setActiveTab] = useState("pedidos");
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("todos");
    const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastOrderIds = useRef<Set<string>>(new Set());

    const { data: rawOrders, isLoading, refetch, isFetching } = useDeliveryOrders();
    const updateStatus = useUpdateDeliveryOrderStatus();

    // Sound Control Effect - Loops while there are pending orders
    useEffect(() => {
        const hasPending = rawOrders?.some(o => o.status === 'pendente');

        if (hasPending && soundEnabled && audioRef.current) {
            audioRef.current.loop = true;
            audioRef.current.play().catch(e => console.log("Erro ao tocar som:", e));
        } else if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [rawOrders, soundEnabled]);

    // Toast Notification Effect - Only for BRAND NEW orders
    useEffect(() => {
        if (rawOrders && rawOrders.length > 0) {
            // First load - just populate the set
            if (lastOrderIds.current.size === 0) {
                rawOrders.forEach(o => lastOrderIds.current.add(o.id));
                return;
            }

            const newOrders = rawOrders.filter(o => !lastOrderIds.current.has(o.id) && o.status === 'pendente');

            if (newOrders.length > 0) {
                toast.info(`Você tem ${newOrders.length} novo(s) pedido(s)!`, {
                    icon: <Bike className="w-4 h-4" />,
                    duration: 10000
                });
                newOrders.forEach(o => lastOrderIds.current.add(o.id));
            }
        }
    }, [rawOrders]);

    const orders = useMemo(() => {
        if (!rawOrders) return [];
        let filtered = [...rawOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (statusFilter !== "todos") {
            filtered = filtered.filter(o => o.status === statusFilter);
        }

        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            filtered = filtered.filter(o =>
                (o.customer_name?.toLowerCase().includes(lower) || false) ||
                (o.id?.toLowerCase().includes(lower) || false) ||
                (o.customer_phone && o.customer_phone.includes(lower))
            );
        }

        return filtered;
    }, [rawOrders, statusFilter, searchQuery]);

    const stats = useMemo(() => {
        const s = {
            todos: rawOrders?.length || 0,
            cancelados: rawOrders?.filter(o => o.status === 'cancelado').length || 0,
            agendamento: 0,
            recebidos: rawOrders?.filter(o => o.status === 'pendente').length || 0,
            aceitos: rawOrders?.filter(o => o.status === 'preparando').length || 0,
            prontos: rawOrders?.filter(o => o.status === 'saiu_entrega').length || 0,
        };
        return s;
    }, [rawOrders]);

    const handleUpdateStatus = (id: string, newStatus: string) => {
        updateStatus.mutate({ id, status: newStatus }, {
            onSuccess: () => {
                toast.success("Status atualizado!");
            }
        });
    };

    const handleOpenWA = (phone: string) => {
        const num = phone.replace(/\D/g, '');
        window.open(`https://wa.me/${num}`, '_blank');
    };

    return (
        <div className="flex flex-col h-screen bg-[#f0f2f5] overflow-hidden">
            {/* Top Navigation Interface Style */}
            <div className="bg-white border-b px-6 py-2 flex items-center gap-1 overflow-x-auto shadow-sm">
                <button
                    onClick={() => setActiveTab('pedidos')}
                    className={`px-4 py-2 border-b-2 text-sm font-semibold transition-colors whitespace-nowrap ${activeTab === 'pedidos' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    Pedidos Existentes
                </button>
                <button
                    onClick={() => setIsManualModalOpen(true)}
                    className="px-4 py-2 border-b-2 border-transparent text-sm font-semibold text-gray-500 hover:text-gray-700 whitespace-nowrap"
                >
                    PDV- Lançar Pedido
                </button>

            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-6 max-w-[1400px] mx-auto pb-20">
                    {/* Filter Section */}
                    <div className="bg-white p-4 rounded-md border shadow-sm grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-12 md:col-span-3">
                            <label className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1 block italic">Filtrar Pedidos</label>
                            <label className="text-[11px] text-gray-500 mb-1 block">Status:</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-8 text-xs font-bold bg-[#f8f9fa]">
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os pedidos - {stats.todos}</SelectItem>
                                    <SelectItem value="pendente">Recebidos - {stats.recebidos}</SelectItem>
                                    <SelectItem value="preparando">Aceitos - {stats.aceitos}</SelectItem>
                                    <SelectItem value="saiu_entrega">Prontos - {stats.prontos}</SelectItem>
                                    <SelectItem value="cancelado">Cancelados - {stats.cancelados}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-12 md:col-span-7">
                            <label className="text-[11px] text-gray-500 mb-1 block">ID do Pedido:</label>
                            <div className="relative">
                                <Input
                                    className="h-8 text-xs bg-[#f8f9fa] border-gray-300 pr-10"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Digite o ID ou nome do cliente"
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <div className="col-span-6 md:col-span-1 flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 mb-0.5 font-bold">Som</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-full ${soundEnabled ? 'text-primary' : 'text-gray-400'}`}
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                title={soundEnabled ? 'Silenciar notificações' : 'Ativar som de notificações'}
                            >
                                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                            </Button>
                        </div>
                        <div className="col-span-6 md:col-span-1 flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 mb-0.5 font-bold">Atualizar</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 rounded-full ${isFetching ? 'animate-spin' : ''}`}
                                onClick={() => refetch()}
                            >
                                <RefreshCw className="w-5 h-5 text-primary" />
                            </Button>
                        </div>
                    </div>

                    <audio ref={audioRef} src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" preload="auto" />

                    {/* Summary Blocks */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setStatusFilter('todos')}
                            className={`${statusFilter === 'todos' ? 'bg-primary' : 'bg-[#2c3e50]'} text-white px-6 py-2 rounded font-bold text-sm min-w-[180px] text-center shadow transition-colors`}
                        >
                            Todos Pedidos ({stats.todos})
                        </button>
                        <button
                            onClick={() => setStatusFilter('cancelado')}
                            className={`${statusFilter === 'cancelado' ? 'bg-red-600' : 'bg-[#2c3e50]'} text-white px-6 py-2 rounded font-bold text-sm min-w-[180px] text-center shadow transition-colors`}
                        >
                            Pedidos Cancelados ({stats.cancelados})
                        </button>
                        <button className="bg-[#2c3e50] text-white px-6 py-2 rounded font-bold text-sm min-w-[180px] text-center shadow">
                            Pedidos com Agendamento ({stats.agendamento})
                        </button>
                    </div>

                    {/* Status Columns Grid */}
                    {statusFilter === 'todos' || statusFilter === 'pendente' || statusFilter === 'preparando' || statusFilter === 'saiu_entrega' ? (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* Pedidos Recebidos */}
                            {(statusFilter === 'todos' || statusFilter === 'pendente') && (
                                <div className="space-y-4">
                                    <div className="bg-[#f39c12] text-white px-4 py-2 rounded font-bold text-sm shadow">
                                        Pedidos Recebidos ({stats.recebidos})
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {orders.filter(o => o.status === 'pendente').map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                theme="yellow"
                                                onUpdateStatus={handleUpdateStatus}
                                                isExpanded={expandedOrder === order.id}
                                                onToggleExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                onOpenWA={() => handleOpenWA(order.customer_phone)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pedidos Aceitos */}
                            {(statusFilter === 'todos' || statusFilter === 'preparando') && (
                                <div className="space-y-4">
                                    <div className="bg-[#2980b9] text-white px-4 py-2 rounded font-bold text-sm shadow">
                                        Pedidos Aceitos ({stats.aceitos})
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {orders.filter(o => o.status === 'preparando').map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                theme="blue"
                                                onUpdateStatus={handleUpdateStatus}
                                                isExpanded={expandedOrder === order.id}
                                                onToggleExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                onOpenWA={() => handleOpenWA(order.customer_phone)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pedidos Prontos */}
                            {(statusFilter === 'todos' || statusFilter === 'saiu_entrega') && (
                                <div className="space-y-4">
                                    <div className="bg-[#27ae60] text-white px-4 py-2 rounded font-bold text-sm shadow">
                                        Pedidos Prontos ({stats.prontos})
                                    </div>
                                    <div className="flex flex-col gap-3">
                                        {orders.filter(o => o.status === 'saiu_entrega').map(order => (
                                            <OrderCard
                                                key={order.id}
                                                order={order}
                                                theme="green"
                                                onUpdateStatus={handleUpdateStatus}
                                                isExpanded={expandedOrder === order.id}
                                                onToggleExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                                onOpenWA={() => handleOpenWA(order.customer_phone)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm shadow inline-block">
                                Pedidos Cancelados ({stats.cancelados})
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {orders.map(order => (
                                    <OrderCard
                                        key={order.id}
                                        order={order}
                                        theme="yellow"
                                        onUpdateStatus={handleUpdateStatus}
                                        isExpanded={expandedOrder === order.id}
                                        onToggleExpand={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                        onOpenWA={() => handleOpenWA(order.customer_phone)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {isLoading && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="space-y-4">
                                    <Skeleton className="h-10 w-full" />
                                    <Skeleton className="h-40 w-full" />
                                    <Skeleton className="h-40 w-full" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {isManualModalOpen && (
                <ManualDeliveryDialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen} />
            )}
        </div>
    );
}

interface OrderCardProps {
    order: DeliveryOrder;
    theme: 'yellow' | 'blue' | 'green';
    onUpdateStatus: (id: string, status: string) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onOpenWA: () => void;
}

function OrderCard({ order, theme, onUpdateStatus, isExpanded, onToggleExpand, onOpenWA }: OrderCardProps) {
    const bgColor = theme === 'yellow' ? 'bg-[#f39c12]' : theme === 'blue' ? 'bg-[#2980b9]' : 'bg-[#27ae60]';
    const textColor = 'text-white';

    const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

    return (
        <div className={`${bgColor} ${textColor} rounded shadow-md overflow-hidden flex flex-col p-4 relative`}>
            {/* Main Info Row */}
            <div className="flex justify-between items-start mb-4">
                <div className="space-y-0.5">
                    <p className="font-bold text-base leading-tight">{order.customer_name}</p>
                    <p className="text-[10px] font-bold opacity-90 uppercase">ID: {order.id.substring(0, 8)}</p>
                    <p className="text-[10px] font-black uppercase tracking-wider">{order.order_type === 'retira' ? 'BALCÃO' : 'DELIVERY'}</p>
                </div>
                <div className="flex flex-col items-end">
                    <p className="font-bold text-sm tracking-tight">{formatBRL(Number(order.total))}</p>
                    <p className="text-xs font-medium">{format(new Date(order.created_at), "HH:mm:ss")}</p>
                    <p className="text-[10px] font-bold uppercase">{order.payment_method || 'Dinheiro'}</p>
                </div>
            </div>

            {/* Status Flow Radio Buttons */}
            <div className="flex items-center gap-3 mt-1 mb-4">
                <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                        type="radio"
                        name={`status-${order.id}`}
                        checked={order.status === 'pendente'}
                        onChange={() => onUpdateStatus(order.id, 'pendente')}
                        className="w-3 h-3 accent-[#f39c12] border-white focus:ring-0"
                    />
                    <span className="text-[10px] font-bold group-hover:underline">Recebido</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                        type="radio"
                        name={`status-${order.id}`}
                        checked={order.status === 'preparando'}
                        onChange={() => onUpdateStatus(order.id, 'preparando')}
                        className="w-3 h-3 accent-[#2980b9] border-white focus:ring-0"
                    />
                    <span className="text-[10px] font-bold group-hover:underline">Aceito</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                        type="radio"
                        name={`status-${order.id}`}
                        checked={order.status === 'saiu_entrega'}
                        onChange={() => onUpdateStatus(order.id, 'saiu_entrega')}
                        className="w-3 h-3 accent-[#27ae60] border-white focus:ring-0"
                    />
                    <span className="text-[10px] font-bold group-hover:underline">Pronto</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer group">
                    <input
                        type="radio"
                        name={`status-${order.id}`}
                        checked={order.status === 'cancelado'}
                        onChange={() => onUpdateStatus(order.id, 'cancelado')}
                        className="w-3 h-3 accent-red-600 border-white focus:ring-0"
                    />
                    <span className="text-[10px] font-bold group-hover:underline">Cancelado</span>
                </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between gap-2 border-t border-white/20 pt-4 mt-auto">
                <div className="flex items-center gap-2">
                    <button onClick={onOpenWA} className="w-7 h-7 bg-[#25D366] rounded-md flex items-center justify-center hover:scale-110 transition-transform shadow" title="Falar no WhatsApp">
                        <MessageSquare className="w-4 h-4 text-white" />
                    </button>
                    <button className="w-7 h-7 bg-[#3498db] rounded-md flex items-center justify-center hover:scale-110 transition-transform shadow" title="Abrir Link">
                        <ExternalLink className="w-4 h-4 text-white" />
                    </button>
                    <button
                        onClick={() => {
                            const data: DeliveryData = {
                                orderNumber: order.id,
                                customerName: order.customer_name,
                                customerPhone: order.customer_phone,
                                address: order.delivery_address || "Retirada no Balcão",
                                type: order.order_type,
                                paymentMethod: order.payment_method,
                                items: order.items || [],
                                subtotal: Number(order.subtotal),
                                deliveryFee: Number(order.delivery_fee),
                                total: Number(order.total),
                                changeFor: order.change_for ? Number(order.change_for) : undefined,
                                date: new Date(order.created_at)
                            };
                            printDeliveryA4(data);
                        }}
                        className="w-7 h-7 bg-orange-500 rounded-md flex items-center justify-center hover:scale-110 transition-transform shadow"
                        title="Imprimir A4"
                    >
                        <FileText className="w-4 h-4 text-white" />
                    </button>
                </div>
                {order.status !== 'entregue' && (
                    <button
                        onClick={() => onUpdateStatus(order.id, 'entregue')}
                        className="bg-gray-600 hover:bg-gray-700 text-white text-[10px] font-bold px-3 py-1.5 rounded uppercase flex items-center gap-1.5 transition-colors shadow"
                    >
                        <Check className="w-3.5 h-3.5" /> Marcar c/ entregue
                    </button>
                )}
            </div>

            {/* Details Expansion Toggle */}
            <button
                onClick={onToggleExpand}
                className="w-full text-center text-[11px] font-bold mt-4 flex items-center justify-center gap-1 opacity-80 hover:opacity-100 py-1 transition-all"
            >
                Exibir detalhes {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {/* Expanded Detailed Content */}
            {isExpanded && (
                <div className="mt-4 p-3 bg-black/10 rounded space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="text-[11px] space-y-1 border-b border-white/10 pb-2">
                        <p className="font-bold flex items-center gap-1.5"><MapPin size={12} /> {order.delivery_address || 'Retirada no Balcão'}</p>
                        <p className="font-bold flex items-center gap-1.5"><Phone size={12} /> {order.customer_phone}</p>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-[11px] font-black uppercase flex items-center gap-1.5"><ChefHat size={12} /> ITENS:</h4>
                        <div className="space-y-1">
                            {order.items?.map(it => (
                                <div key={it.id} className="text-[10px] flex justify-between gap-2 leading-tight">
                                    <span className="flex-1">• {it.quantity}x {it.product_name}</span>
                                    <span className="font-bold whitespace-nowrap">{formatBRL(Number(it.price) * it.quantity)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 text-[10px] flex flex-col gap-1">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span className="font-bold">{formatBRL(Number(order.subtotal))}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Taxa:</span>
                            <span className="font-bold">{formatBRL(Number(order.delivery_fee))}</span>
                        </div>
                        {order.change_for && Number(order.change_for) > 0 && (
                            <div className="flex flex-col gap-0.5 border-t border-white/5 pt-1 mt-1">
                                <div className="flex justify-between text-yellow-200">
                                    <span>Troco para:</span>
                                    <span className="font-bold">{formatBRL(Number(order.change_for))}</span>
                                </div>
                                <div className="flex justify-between text-yellow-200">
                                    <span>Valor do Troco:</span>
                                    <span className="font-bold">{formatBRL(Number(order.change_for) - Number(order.total))}</span>
                                </div>
                            </div>
                        )}
                        <div className="flex justify-between text-xs pt-1 border-t border-white/10 mt-1">
                            <span className="font-black uppercase tracking-widest">TOTAL:</span>
                            <span className="font-black">{formatBRL(Number(order.total))}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
