import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Printer, MessageCircle, Loader2, Save, FileText } from "lucide-react";
import { printQuote, printQuoteA4, getQuoteWhatsappUrl, type QuoteData } from "@/utils/printReceipt";
import { useSaveQuote, useUpdateQuote } from "@/hooks/useQuotes";
import { toast } from "sonner";

interface QuoteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: any[];
    total: number;
    discount: number;
    customerName: string;
    customerDocument?: string;
    customerId?: string;
    sellerId?: string;
    quoteId?: string | null;
}

export function QuoteDialog({
    open,
    onOpenChange,
    items,
    total,
    discount,
    customerName,
    customerDocument,
    customerId,
    sellerId,
    quoteId,
}: QuoteDialogProps) {
    const [validityDays, setValidityDays] = useState(7);
    const [observations, setObservations] = useState("");
    const [status, setStatus] = useState("pending");
    const saveQuote = useSaveQuote();
    const updateQuote = useUpdateQuote();

    const isPending = saveQuote.isPending || updateQuote.isPending;

    // Se estiver editando, carregar dados extras quando abrir
    useEffect(() => {
        if (open && quoteId) {
            const fetchExtra = async () => {
                try {
                    const res = await fetch(`${import.meta.env.VITE_API_URL}/quotes/${quoteId}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` }
                    });
                    const data = await res.json();
                    setValidityDays(Number(data.validity_days || 7));
                    setObservations(data.observations || "");
                    setStatus(data.status || "pending");
                } catch (e) { }
            };
            fetchExtra();
        } else if (!open) {
            // Reset if needed? Maybe not necessary as it's re-opened
        }
    }, [open, quoteId]);

    const handleSave = async () => {
        try {
            const params = {
                cart: items.map(it => ({
                    id: it.product_id,
                    name: it.name,
                    price: it.unit_price,
                    quantity: it.quantity
                })),
                total,
                discount,
                customerId: customerId === 'default' ? undefined : customerId,
                sellerId,
                validityDays,
                observations,
                status,
            };

            if (quoteId) {
                return await updateQuote.mutateAsync({ id: quoteId, ...params });
            } else {
                return await saveQuote.mutateAsync(params);
            }
        } catch (err: any) {
            toast.error(`Erro ao salvar orçamento: ${err.message}`);
            return null;
        }
    };

    const handlePrint = async () => {
        const res = await handleSave();
        if (!res) return;

        const data: QuoteData = {
            customerName,
            customerDocument,
            cart: items.map(it => ({
                name: it.name,
                price: it.unit_price,
                quantity: it.quantity
            })),
            total,
            discount,
            date: new Date(),
            validityDays,
            observations,
        };
        printQuote(data);
        onOpenChange(false);
    };

    const handlePrintA4 = async () => {
        const res = await handleSave();
        if (!res) return;

        const data: QuoteData = {
            customerName,
            customerDocument,
            cart: items.map(it => ({
                name: it.name,
                price: it.unit_price,
                quantity: it.quantity
            })),
            total,
            discount,
            date: new Date(),
            validityDays,
            observations,
        };
        printQuoteA4(data);
        onOpenChange(false);
    };

    const handleWhatsApp = async () => {
        const res = await handleSave();
        if (!res) return;

        const data: QuoteData = {
            customerName,
            customerDocument,
            cart: items.map(it => ({
                name: it.name,
                price: it.unit_price,
                quantity: it.quantity
            })),
            total,
            discount,
            date: new Date(),
            validityDays,
            observations,
        };
        const url = await getQuoteWhatsappUrl(data);
        window.open(url, "_blank");
        onOpenChange(false);
    };

    const handleSaveOnly = async () => {
        const res = await handleSave();
        if (res) {
            toast.success(quoteId ? "Orçamento atualizado com sucesso!" : "Orçamento criado com sucesso!");
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{quoteId ? "Editar Orçamento" : "Gerar Orçamento"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {quoteId && (
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="status">Status do Orçamento</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger id="status">
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">Pendente</SelectItem>
                                    <SelectItem value="authorized">Autorizado</SelectItem>
                                    <SelectItem value="converted">Vendido (Convertido)</SelectItem>
                                    <SelectItem value="cancelled">Cancelado</SelectItem>
                                    <SelectItem value="expired">Expirado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="validity">Validade do Orçamento (dias)</Label>
                        <Input
                            id="validity"
                            type="number"
                            value={validityDays}
                            onChange={(e) => setValidityDays(Number(e.target.value))}
                            min={1}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="obs">Observações</Label>
                        <Textarea
                            id="obs"
                            placeholder="Alguma observação importante para o cliente?"
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            className="h-20 resize-none"
                        />
                    </div>
                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-200 space-y-2">
                        <div className="grid grid-cols-[80px_1fr] items-start text-sm">
                            <span className="text-muted-foreground">Cliente:</span>
                            <span className="font-bold text-right">{customerName}</span>
                        </div>
                        <div className="grid grid-cols-[80px_1fr] items-center text-sm">
                            <span className="text-muted-foreground">Itens:</span>
                            <span className="font-bold text-right">{items.length}</span>
                        </div>
                        <div className="flex justify-between items-center text-lg font-bold border-t pt-2 mt-1">
                            <span>Total:</span>
                            <span className="text-primary text-xl">R$ {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 pt-2">
                    <Button
                        type="button"
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1 flex-col h-auto py-2 px-1"
                        onClick={handleSaveOnly}
                        disabled={isPending}
                    >
                        {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mb-1" />
                        ) : (
                            <Save className="h-4 w-4 mb-1" />
                        )}
                        <span className="text-[10px] uppercase">{quoteId ? "Atualizar" : "Salvar"}</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrint}
                        className="flex-1 flex-col h-auto py-2 px-1"
                        disabled={isPending}
                    >
                        <Printer className="h-4 w-4 mb-1" />
                        <span className="text-[10px] uppercase">Térmica</span>
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrintA4}
                        className="flex-1 flex-col h-auto py-2 px-1 border-primary text-primary hover:bg-primary/5"
                        disabled={isPending}
                    >
                        <FileText className="h-4 w-4 mb-1" />
                        <span className="text-[10px] uppercase">A4</span>
                    </Button>

                    <Button
                        type="button"
                        onClick={handleWhatsApp}
                        className="flex-1 flex-col h-auto py-2 px-1 bg-[#25D366] hover:bg-[#20ba59] text-white"
                        disabled={isPending}
                    >
                        <MessageCircle className="h-4 w-4 mb-1" />
                        <span className="text-[10px] uppercase">WhatsApp</span>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
