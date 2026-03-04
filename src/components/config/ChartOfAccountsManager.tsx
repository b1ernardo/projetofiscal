import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ChartItem {
    id: string;
    name: string;
    type: 'revenue' | 'expense';
}
export function ChartOfAccountsManager() {
    const queryClient = useQueryClient();
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<'revenue' | 'expense'>('expense');

    const { data: accounts = [], isLoading } = useQuery<ChartItem[]>({
        queryKey: ["chart-of-accounts"],
        queryFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/chart-of-accounts`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
            return response.json();
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/chart-of-accounts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newName, type: newType })
            });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
            setNewName("");
            toast.success("Item adicionado ao Plano de Contas!");
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await fetch(`${import.meta.env.VITE_API_URL}/chart-of-accounts/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["chart-of-accounts"] });
            toast.success("Item removido!");
        },
    });

    const revenues = accounts.filter(a => a.type === 'revenue');
    const expenses = accounts.filter(a => a.type === 'expense');

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <CardTitle>Plano de Contas</CardTitle>
                <CardDescription>
                    Gerencie as categorias de receitas e despesas.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 flex-1 flex flex-col">
                <div className="flex items-end gap-2 p-1 border rounded-lg bg-muted/30">
                    <div className="flex-1 space-y-1.5">
                        <Label htmlFor="item-name">Descrição do Item</Label>
                        <Input
                            id="item-name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ex: Aluguel, Venda PDV..."
                        />
                    </div>
                    <div className="w-40 space-y-1.5">
                        <Label>Tipo</Label>
                        <Select value={newType} onValueChange={(v: any) => setNewType(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="revenue">Receita (+)</SelectItem>
                                <SelectItem value="expense">Despesa (-)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={() => createMutation.mutate()} disabled={!newName.trim() || createMutation.isPending}>
                        <Plus className="h-4 w-4 mr-2" /> Adicionar
                    </Button>
                </div>

                <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
                    <TabsList>
                        <TabsTrigger value="all">Todos</TabsTrigger>
                        <TabsTrigger value="revenue" className="text-green-600">Receitas ({revenues.length})</TabsTrigger>
                        <TabsTrigger value="expense" className="text-red-600">Despesas ({expenses.length})</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto mt-4 px-1">
                        <TabsContent value="all" className="m-0">
                            <AccountTable items={accounts} onDelete={(id) => deleteMutation.mutate(id)} />
                        </TabsContent>
                        <TabsContent value="revenue" className="m-0">
                            <AccountTable items={revenues} onDelete={(id) => deleteMutation.mutate(id)} />
                        </TabsContent>
                        <TabsContent value="expense" className="m-0">
                            <AccountTable items={expenses} onDelete={(id) => deleteMutation.mutate(id)} />
                        </TabsContent>
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
}

function AccountTable({ items, onDelete }: { items: ChartItem[], onDelete: (id: string) => void }) {
    if (items.length === 0) {
        return <div className="text-center py-8 text-muted-foreground italic">Nenhum item cadastrado.</div>;
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="w-20 text-right">Ação</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                            {item.type === 'revenue' ? (
                                <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">
                                    <ArrowUpCircle className="h-3 w-3 mr-1" /> Receita
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">
                                    <ArrowDownCircle className="h-3 w-3 mr-1" /> Despesa
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                    if (confirm("Deseja remover este item do Plano de Contas?")) onDelete(item.id)
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
