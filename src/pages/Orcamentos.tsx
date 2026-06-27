import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    Search,
    Eye,
    Printer,
    MessageCircle,
    MoreVertical,
    ArrowRight,
    Pencil,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { printQuote, printQuoteA4, getQuoteWhatsappUrl, type QuoteData } from "@/utils/printReceipt";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function Orcamentos() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const { data: quotes = [], isLoading } = useQuery({
        queryKey: ["quotes"],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/quotes`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
            });
            if (!res.ok) throw new Error("Erro ao buscar orçamentos");
            return res.json();
        },
    });

    const queryClient = useQueryClient();

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/quotes/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Erro ao atualizar status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["quotes"] });
            toast.success("Status atualizado com sucesso!");
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    const filteredQuotes = quotes.filter((q: any) =>
        (q.customer_name || "CONSUMIDOR FINAL")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
        String(q.quote_number).includes(searchTerm)
    );

    const handlePrint = (quote: any, isA4: boolean = false) => {
        // We need to fetch the full quote with items
        fetchFullQuoteThen(quote.id, (fullData) => {
            const data: QuoteData = {
                customerName: fullData.customer_name || "CONSUMIDOR FINAL",
                customerDocument: fullData.customer_document || "",
                cart: fullData.items.map((it: any) => ({
                    name: it.product_name,
                    price: Number(it.unit_price),
                    quantity: Number(it.quantity),
                })),
                total: Number(fullData.total_amount),
                discount: Number(fullData.discount),
                date: new Date(fullData.created_at),
                validityDays: Number(fullData.validity_days),
                observations: fullData.observations,
                sellerName: fullData.seller_name
            };
            if (isA4) {
                printQuoteA4(data);
            } else {
                printQuote(data);
            }
        });
    };

    const handleWhatsApp = (quote: any) => {
        fetchFullQuoteThen(quote.id, async (fullData) => {
            const data: QuoteData = {
                customerName: fullData.customer_name || "CONSUMIDOR FINAL",
                customerDocument: fullData.customer_document || "",
                cart: fullData.items.map((it: any) => ({
                    name: it.product_name,
                    price: Number(it.unit_price),
                    quantity: Number(it.quantity),
                })),
                total: Number(fullData.total_amount),
                discount: Number(fullData.discount),
                date: new Date(fullData.created_at),
                validityDays: Number(fullData.validity_days),
                observations: fullData.observations,
            };
            const url = await getQuoteWhatsappUrl(data);
            window.open(url, "_blank");
        });
    };

    const fetchFullQuoteThen = async (id: string, callback: (data: any) => void) => {
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/quotes/${id}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
                },
            });
            if (!res.ok) throw new Error("Erro ao buscar detalhes");
            const data = await res.json();
            callback(data);
        } catch (err: any) {
            toast.error(err.message);
        }
    };

    const viewDetails = (quote: any) => {
        fetchFullQuoteThen(quote.id, (fullData) => {
            setSelectedQuote(fullData);
            setIsDetailOpen(true);
        });
    };

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" /> Orçamentos
                    </h1>
                    <p className="text-muted-foreground">Gerencie seus orçamentos salvos</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Buscar orçamento por cliente ou número..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-11"
                />
            </div>

            <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="font-bold"># Número</TableHead>
                            <TableHead className="font-bold">Data</TableHead>
                            <TableHead className="font-bold">Cliente</TableHead>
                            <TableHead className="font-bold text-right">Total</TableHead>
                            <TableHead className="font-bold">Validade</TableHead>
                            <TableHead className="font-bold">Status</TableHead>
                            <TableHead className="w-12"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                    Carregando orçamentos...
                                </TableCell>
                            </TableRow>
                        ) : filteredQuotes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                    Nenhum orçamento encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredQuotes.map((quote: any) => {
                                const date = new Date(quote.created_at);
                                const expiryDate = new Date(date);
                                expiryDate.setDate(date.getDate() + Number(quote.validity_days || 7));
                                const isExpired = expiryDate < new Date() && quote.status === 'pending';

                                return (
                                    <TableRow key={quote.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell className="font-mono font-bold">
                                            #{quote.quote_number}
                                        </TableCell>
                                        <TableCell>
                                            {format(date, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell>{quote.customer_name || "CONSUMIDOR FINAL"}</TableCell>
                                        <TableCell className="text-right font-bold text-primary">
                                            {formatCurrency(Number(quote.total_amount))}
                                        </TableCell>
                                        <TableCell>
                                            {quote.validity_days} dias
                                            <br />
                                            <span className="text-[10px] text-muted-foreground">
                                                Até {format(expiryDate, "dd/MM/yyyy")}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                defaultValue={isExpired ? 'expired' : quote.status}
                                                onValueChange={(value) => {
                                                    if (value !== 'expired') {
                                                        updateStatusMutation.mutate({ id: quote.id, status: value });
                                                    }
                                                }}
                                                disabled={updateStatusMutation.isPending}
                                            >
                                                <SelectTrigger className="h-8 w-[130px] border-0 bg-transparent p-0 flex justify-start hover:bg-slate-100 rounded focus:ring-0 focus:ring-offset-0">
                                                    {isExpired ? (
                                                        <Badge variant="destructive">Expirado</Badge>
                                                    ) : quote.status === 'pending' ? (
                                                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendente</Badge>
                                                    ) : quote.status === 'authorized' ? (
                                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200">Autorizado</Badge>
                                                    ) : quote.status === 'converted' ? (
                                                        <Badge className="bg-green-50 text-green-700 border-green-200">Vendido</Badge>
                                                    ) : quote.status === 'cancelled' ? (
                                                        <Badge variant="destructive">Cancelado</Badge>
                                                    ) : (
                                                        <Badge variant="secondary">{quote.status}</Badge>
                                                    )}
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="pending">Pendente</SelectItem>
                                                    <SelectItem value="authorized">Autorizado</SelectItem>
                                                    <SelectItem value="converted">Vendido (Convertido)</SelectItem>
                                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                                    {isExpired && <SelectItem value="expired" disabled>Expirado</SelectItem>}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => viewDetails(quote)}>
                                                        <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => navigate(`/nova-venda?edit=${quote.id}`)}>
                                                        <Pencil className="mr-2 h-4 w-4" /> Editar Orçamento
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePrint(quote, true)}>
                                                        <FileText className="mr-2 h-4 w-4" /> Imprimir (A4)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handlePrint(quote)}>
                                                        <Printer className="mr-2 h-4 w-4" /> Imprimir (Térmica)
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleWhatsApp(quote)}>
                                                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
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

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Detalhes do Orçamento #{selectedQuote?.quote_number}</DialogTitle>
                    </DialogHeader>
                    {selectedQuote && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-3 rounded-lg border">
                                <div>
                                    <p className="text-muted-foreground">Cliente</p>
                                    <p className="font-bold">{selectedQuote.customer_name || "CONSUMIDOR FINAL"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Vendedor</p>
                                    <p className="font-bold">{selectedQuote.seller_name || "Não informado"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Data</p>
                                    <p className="font-bold">{format(new Date(selectedQuote.created_at), "dd/MM/yyyy HH:mm")}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Validade</p>
                                    <p className="font-bold">{selectedQuote.validity_days} dias</p>
                                </div>
                            </div>

                            {selectedQuote.observations && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                                    <p className="text-blue-800 font-semibold mb-1">Observações:</p>
                                    <p className="text-blue-900 italic">"{selectedQuote.observations}"</p>
                                </div>
                            )}

                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead>Produto</TableHead>
                                            <TableHead className="text-right">Qtd</TableHead>
                                            <TableHead className="text-right">Preço</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedQuote.items?.map((item: any) => (
                                            <TableRow key={item.id}>
                                                <TableCell>{item.product_name}</TableCell>
                                                <TableCell className="text-right">{Number(item.quantity).toFixed(2)} {item.product_unit}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(Number(item.unit_price))}</TableCell>
                                                <TableCell className="text-right font-semibold">{formatCurrency(Number(item.quantity) * Number(item.unit_price))}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex flex-col items-end gap-1 px-2 pt-2 border-t">
                                <div className="flex justify-between w-40 text-sm">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(Number(selectedQuote.total_amount) + Number(selectedQuote.discount))}</span>
                                </div>
                                {Number(selectedQuote.discount) > 0 && (
                                    <div className="flex justify-between w-40 text-sm text-destructive">
                                        <span>Desconto:</span>
                                        <span>-{formatCurrency(Number(selectedQuote.discount))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between w-40 text-lg font-bold text-primary">
                                    <span>Total:</span>
                                    <span>{formatCurrency(Number(selectedQuote.total_amount))}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" className="border-primary text-primary" onClick={() => handlePrint(selectedQuote, true)}>
                                    <FileText className="mr-2 h-4 w-4" /> Formato A4
                                </Button>
                                <Button variant="outline" onClick={() => handlePrint(selectedQuote)}>
                                    <Printer className="mr-2 h-4 w-4" /> Térmica
                                </Button>
                                <Button className="bg-[#25D366] hover:bg-[#20ba59] text-white" onClick={() => handleWhatsApp(selectedQuote)}>
                                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
