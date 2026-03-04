import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, UtensilsCrossed, Clock, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ComandaFormDialog } from "@/components/comandas/ComandaFormDialog";

interface SaveToComandaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cart: any[];
    onSaved: () => void;
}

export function SaveToComandaDialog({ open, onOpenChange, cart, onSaved }: SaveToComandaDialogProps) {
    const queryClient = useQueryClient();
    const [isNewComandaOpen, setIsNewComandaOpen] = useState(false);

    const { data: comandas = [], isLoading } = useQuery({
        queryKey: ["comandas-open"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            const data = await response.json();
            return data.filter((c: any) => c.status === "open");
        },
        enabled: open
    });

    const saveItemsMutation = useMutation({
        mutationFn: async (comandaId: string) => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/comandas/${comandaId}/items-batch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: cart })
            });
            if (!response.ok) throw new Error("Erro ao salvar itens");
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comandas"] });
            toast.success("Itens salvos na comanda!");
            onSaved();
            onOpenChange(false);
        }
    });

    const createAndSaveMutation = useMutation({
        mutationFn: async (data: any) => {
            // 1. Create comanda
            const createRes = await fetch(`${import.meta.env.VITE_API_URL}/comandas`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const comanda = await createRes.json();

            // 2. Save items
            await fetch(`${import.meta.env.VITE_API_URL}/comandas/${comanda.id}/items-batch`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ items: cart })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comandas"] });
            toast.success("Nova comanda aberta e itens salvos!");
            onSaved();
            onOpenChange(false);
            setIsNewComandaOpen(false);
        }
    });

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UtensilsCrossed className="h-5 w-5 text-primary" />
                            Salvar na Comanda
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        <Button
                            variant="outline"
                            className="w-full border-dashed py-8 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/50"
                            onClick={() => setIsNewComandaOpen(true)}
                        >
                            <Plus className="h-6 w-6 text-primary" />
                            <span>Abrir Nova Comanda</span>
                        </Button>

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                                <Clock className="h-4 w-4" /> Selecione uma Comanda Aberta
                            </h3>

                            <div className="grid gap-2 max-h-[300px] overflow-auto pr-2">
                                {isLoading ? (
                                    <p className="text-center py-4 text-muted-foreground">Carregando...</p>
                                ) : comandas.length === 0 ? (
                                    <p className="text-center py-4 text-muted-foreground text-sm">Nenhuma comanda aberta no momento.</p>
                                ) : (
                                    comandas.map((c: any) => (
                                        <button
                                            key={c.id}
                                            onClick={() => saveItemsMutation.mutate(c.id)}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                    {c.table_number?.replace(/\D/g, "") || "?"}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{c.table_number}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Users className="h-3 w-3" /> {c.customer_name || "Mesa Local"}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                Selecionar
                                            </Badge>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ComandaFormDialog
                open={isNewComandaOpen}
                onOpenChange={setIsNewComandaOpen}
                onSave={(data) => createAndSaveMutation.mutate(data)}
            />
        </>
    );
}
