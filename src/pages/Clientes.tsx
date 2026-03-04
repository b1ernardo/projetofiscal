import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Loader2, Trash2, Pencil } from "lucide-react";
import { useState } from "react";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { CustomerFormDialog } from "@/components/clientes/CustomerFormDialog";
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

import { useCustomers, useDeleteCustomer, useUpdateCustomer, Customer } from "@/hooks/useCustomers";

export default function Clientes() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [customerToEdit, setCustomerToEdit] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("active");
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();

  const createCustomer = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao criar cliente');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente cadastrado!");
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleSave = (data: any) => {
    if (customerToEdit) {
      updateCustomer.mutate({ id: customerToEdit.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["customers"] });
          toast.success("Cliente atualizado!");
          setShowForm(false);
          setCustomerToEdit(null);
        },
        onError: (error: any) => toast.error(error.message)
      });
    } else {
      createCustomer.mutate(data);
    }
  };

  const filtered = clients.filter(
    (c: any) => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.cpf_cnpj ?? "").includes(search);
      const matchesStatus = activeTab === "active" ? (!c.status || c.status === "active") : c.status === "inactive";
      return matchesSearch && matchesStatus;
    }
  );

  const handleDelete = async () => {
    if (!customerToDelete) return;
    try {
      await deleteCustomer.mutateAsync(customerToDelete.id);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente removido com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir cliente");
    } finally {
      setCustomerToDelete(null);
    }
  };

  const renderTable = () => {
    if (isLoading) {
      return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }
    if (filtered.length === 0) {
      return <p className="text-center text-muted-foreground py-8">Nenhum cliente {activeTab === "active" ? "ativo" : "inativo"} encontrado.</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>CPF/CNPJ</TableHead>
            <TableHead>Telefone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-[120px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((c: any) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.name}</TableCell>
              <TableCell className="font-mono text-sm">{c.cpf_cnpj ?? "—"}</TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell>{c.email ?? "—"}</TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => { setCustomerToEdit(c); setShowForm(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setCustomerToDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
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
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => { setCustomerToEdit(null); setShowForm(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="active">Ativos</TabsTrigger>
            <TabsTrigger value="inactive">Inativos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="mt-0">
          <Card>
            <CardHeader>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou CPF/CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              {renderTable()}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inactive" className="mt-0">
          <Card>
            <CardHeader>
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou CPF/CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </CardHeader>
            <CardContent>
              {renderTable()}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerFormDialog
        open={showForm}
        onOpenChange={(op) => {
          setShowForm(op);
          if (!op) setCustomerToEdit(null);
        }}
        onSave={handleSave}
        initialData={customerToEdit}
      />

      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá o cliente <strong>{customerToDelete?.name}</strong> permanentemente.
              Essa ação não pode ser desfeita.
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
