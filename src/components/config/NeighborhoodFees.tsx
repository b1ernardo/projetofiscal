import { useState } from "react";
import { useDeliveryNeighborhoods, useSaveDeliveryNeighborhood, useDeleteDeliveryNeighborhood, DeliveryNeighborhood } from "@/hooks/useDeliverySettings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export function NeighborhoodFees() {
    const { data: neighborhoods, isLoading } = useDeliveryNeighborhoods();
    const saveNeighborhood = useSaveDeliveryNeighborhood();
    const deleteNeighborhood = useDeleteDeliveryNeighborhood();

    const [newNeighborhood, setNewNeighborhood] = useState({ name: "", fee: "" });
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAdd = () => {
        if (!newNeighborhood.name) {
            toast.error("O nome do bairro é obrigatório");
            return;
        }

        saveNeighborhood.mutate({
            name: newNeighborhood.name,
            fee: parseFloat(newNeighborhood.fee) || 0
        }, {
            onSuccess: () => {
                setNewNeighborhood({ name: "", fee: "" });
                toast.success("Bairro adicionado!");
            }
        });
    };

    const handleDelete = (id: string) => {
        if (confirm("Deseja realmente excluir este bairro?")) {
            deleteNeighborhood.mutate(id, {
                onSuccess: () => toast.success("Bairro excluído!")
            });
        }
    };

    return (
        <Card className="mt-6 border-primary/20">
            <CardHeader>
                <CardTitle className="text-lg">Taxas por Bairro</CardTitle>
                <CardDescription>
                    Cadastre os bairros atendidos e seus respectivos valores de entrega. Se o cliente selecionar um bairro, este valor substituirá a taxa padrão.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end bg-gray-50 p-3 rounded-lg border border-dashed">
                    <div className="md:col-span-3 space-y-1.5">
                        <Label htmlFor="nb-name" className="text-[10px] font-bold uppercase text-gray-500">Nome do Bairro</Label>
                        <Input
                            id="nb-name"
                            placeholder="Ex: Centro, Industrial..."
                            value={newNeighborhood.name}
                            onChange={e => setNewNeighborhood({ ...newNeighborhood, name: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-1 space-y-1.5">
                        <Label htmlFor="nb-fee" className="text-[10px] font-bold uppercase text-gray-500">Taxa (R$)</Label>
                        <Input
                            id="nb-fee"
                            type="number"
                            step="0.5"
                            placeholder="0.00"
                            value={newNeighborhood.fee}
                            onChange={e => setNewNeighborhood({ ...newNeighborhood, fee: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-1">
                        <Button
                            className="w-full"
                            onClick={handleAdd}
                            disabled={saveNeighborhood.isPending}
                        >
                            {saveNeighborhood.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                            Adicionar
                        </Button>
                    </div>
                </div>

                <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="text-left p-3 font-bold text-xs uppercase text-gray-600">Bairro</th>
                                <th className="text-right p-3 font-bold text-xs uppercase text-gray-600 w-24">Taxa</th>
                                <th className="text-center p-3 font-bold text-xs uppercase text-gray-600 w-20">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={3} className="p-10 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </td>
                                </tr>
                            ) : neighborhoods?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-6 text-center text-gray-400 italic">Nenhum bairro cadastrado.</td>
                                </tr>
                            ) : neighborhoods?.map(n => (
                                <tr key={n.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-3 font-medium text-gray-700">{n.name}</td>
                                    <td className="p-3 text-right font-bold text-primary">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n.fee))}
                                    </td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(n.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
