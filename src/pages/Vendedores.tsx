import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Loader2, Trash2, Pencil, Users } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SellerFormDialog } from "@/components/vendedores/SellerFormDialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSellers, useAddSeller, useUpdateSeller, useDeleteSeller, Seller } from "@/hooks/useSellers";

export default function Vendedores() {
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);
    const [sellerToEdit, setSellerToEdit] = useState<Seller | null>(null);
    const [activeTab, setActiveTab] = useState("active");
    const queryClient = useQueryClient();

    const { data: sellers = [], isLoading } = useSellers();
    const addSeller = useAddSeller();
    const updateSeller = useUpdateSeller();
    const deleteSeller = useDeleteSeller();

    const handleSave = (data: any) => {
        if (sellerToEdit) {
            updateSeller.mutate({ id: sellerToEdit.id, ...data }, {
                onSuccess: () => {
                    setShowForm(false);
                    setSellerToEdit(null);
                }
            });
        } else {
            addSeller.mutate(data, {
                onSuccess: () => {
                    setShowForm(false);
                }
            });
        }
    };

    const filtered = sellers.filter(
        (s: Seller) => {
            const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                (s.email ?? "").toLowerCase().includes(search.toLowerCase());
            const matchesStatus = activeTab === "active" ? s.active : !s.active;
            return matchesSearch && matchesStatus;
        }
    );

    const handleDelete = async () => {
        if (!sellerToDelete) return;
        deleteSeller.mutate(sellerToDelete.id, {
            onSuccess: () => setSellerToDelete(null)
        });
    };

    const renderTable = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            );
        }

        if (filtered.length === 0) {
            return (
                <div className="text-center py-12 flex flex-col items-center gap-2">
                    <Users className="h-10 w-10 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Nenhum vendedor {activeTab === "active" ? "ativo" : "inativo"} encontrado.</p>
                </div>
            );
        }

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead className="w-[120px]">Ações</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {filtered.map((s) => (
                        <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.email ?? "—"}</TableCell>
                            <TableCell>{s.phone ?? "—"}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => { setSellerToEdit(s); setShowForm(true); }}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => setSellerToDelete(s)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Vendedores</h1>
                    <p className="text-muted-foreground">Controle de quem realiza as vendas</p>
                </div>
                <Button onClick={() => { setSellerToEdit(null); setShowForm(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> Novo Vendedor
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-between items-center mb-4">
                    <TabsList>
                        <TabsTrigger value="active">Ativos</TabsTrigger>
                        <TabsTrigger value="inactive">Inativos</TabsTrigger>
                    </TabsList>
                </div>

                <Card>
                    <CardHeader>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {renderTable()}
                    </CardContent>
                </Card>
            </Tabs>

            <SellerFormDialog
                open={showForm}
                onOpenChange={(op) => {
                    setShowForm(op);
                    if (!op) setSellerToEdit(null);
                }}
                onSave={handleSave}
                initialData={sellerToEdit}
            />

            <AlertDialog open={!!sellerToDelete} onOpenChange={(open) => !open && setSellerToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso excluirá o vendedor <strong>{sellerToDelete?.name}</strong> permanentemente.
                            Essa ação não pode ser desfeita. (Só é possível excluir vendedores sem vendas vinculadas).
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Sim, excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
