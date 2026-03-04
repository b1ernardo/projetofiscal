import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, CreditCard, Banknote, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentConfirmationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (paymentMethod: string) => void;
    amount: number;
    description: string;
    type?: 'receivable' | 'payable';
}

export function PaymentConfirmationDialog({
    open,
    onOpenChange,
    onConfirm,
    amount,
    description,
    type = 'receivable'
}) {
    const [paymentMethod, setPaymentMethod] = useState("Dinheiro");
    const [methods, setMethods] = useState<any[]>([]);

    useEffect(() => {
        if (open) {
            fetch(`${import.meta.env.VITE_API_URL}/payment_methods`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setMethods(data);
                    }
                })
                .catch(err => console.error("Error fetching payment methods:", err));
        }
    }, [open]);

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-width-[400px]">
                <DialogHeader>
                    <DialogTitle className={cn(
                        "flex items-center gap-2",
                        type === 'receivable' ? "text-green-600" : "text-blue-600"
                    )}>
                        {type === 'receivable' ? <CheckCircle className="h-5 w-5" /> : <CreditCard className="h-5 w-5" />}
                        {type === 'receivable' ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="bg-muted/30 p-4 rounded-lg space-y-1">
                        <p className="text-sm text-muted-foreground">{description}</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(amount)}</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Forma de Pagamento</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione a forma..." />
                            </SelectTrigger>
                            <SelectContent>
                                {methods.length > 0 ? (
                                    methods.map((m) => (
                                        <SelectItem key={m.id} value={m.name}>
                                            <div className="flex items-center gap-2">
                                                {m.name.toLowerCase().includes('dinheiro') && <Banknote className="h-4 w-4" />}
                                                {m.name.toLowerCase().includes('cartão') && <CreditCard className="h-4 w-4" />}
                                                {m.name.toLowerCase().includes('pix') && <QrCode className="h-4 w-4" />}
                                                {m.name}
                                            </div>
                                        </SelectItem>
                                    ))
                                ) : (
                                    <>
                                        <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                                        <SelectItem value="Pix">Pix</SelectItem>
                                        <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                                        <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button
                        className={cn(
                            type === 'receivable' ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                        )}
                        onClick={() => onConfirm(paymentMethod)}
                    >
                        {type === 'receivable' ? 'Confirmar e Receber' : 'Confirmar e Pagar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
