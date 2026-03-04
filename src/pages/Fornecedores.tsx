import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SupplierFormDialog } from "@/components/fornecedores/SupplierFormDialog";

export default function Fornecedores() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/suppliers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      if (!response.ok) throw new Error('Falha ao carregar fornecedores');
      return response.json();
    },
  });

  const createSupplier = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/suppliers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Erro ao criar fornecedor');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fornecedor cadastrado!");
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleSave = (data: any) => {
    createSupplier.mutate(data);
  };

  const filtered = suppliers.filter((s: any) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie seus fornecedores</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Novo Fornecedor</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar fornecedor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum fornecedor encontrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="font-mono text-sm">{s.cnpj ?? "—"}</TableCell>
                    <TableCell>{s.phone ?? "—"}</TableCell>
                    <TableCell>{s.email ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <SupplierFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        onSave={handleSave}
      />
    </div>
  );
}
