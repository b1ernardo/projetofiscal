import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCancelFiscal } from "@/hooks/useFiscal";

interface CancelFiscalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleId: string | null;
    onSuccess?: () => void;
}

export function CancelFiscalDialog({ open, onOpenChange, saleId, onSuccess }: CancelFiscalDialogProps) {
    const [justificativa, setJustificativa] = useState("");
    const cancelFiscal = useCancelFiscal();

    const handleCancel = () => {
        if (!saleId) return;
        if (justificativa.length < 15) return;

        cancelFiscal.mutate(
            { saleId, justificativa },
            {
                onSuccess: () => {
                    onOpenChange(false);
                    setJustificativa("");
                    if (onSuccess) onSuccess();
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cancelar Nota Fiscal (SEFAZ)</DialogTitle>
                    <DialogDescription>
                        Atenção: O cancelamento será registrado na base de dados da Receita Federal. O Fisco exige uma justificativa de no mínimo 15 caracteres.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="justificativa">Justificativa de Cancelamento</Label>
                        <Textarea
                            id="justificativa"
                            value={justificativa}
                            onChange={(e) => setJustificativa(e.target.value)}
                            placeholder="Ex: Cliente desistiu da compra no balcão da loja."
                            className="col-span-3"
                            rows={4}
                        />
                        <span className="text-xs text-muted-foreground text-right">
                            {justificativa.length}/15 caracteres mínimos
                        </span>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cancelFiscal.isPending}>
                        Sair
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={justificativa.length < 15 || cancelFiscal.isPending}
                    >
                        {cancelFiscal.isPending ? "Processando..." : "Confirmar Cancelamento"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
