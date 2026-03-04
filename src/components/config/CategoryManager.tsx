import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const fetchCategories = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/categories`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    if (response.ok) {
      const data = await response.json();
      setCategories(data);
    }
  };

  useEffect(() => {
    if (open) fetchCategories();
  }, [open]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["categories"] });
    queryClient.invalidateQueries({ queryKey: ["products-with-configs"] });
  };

  const addCategory = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const response = await fetch(`${import.meta.env.VITE_API_URL}/categories`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: newName.trim() })
    });

    if (!response.ok) {
      const err = await response.json();
      toast.error(err.message || "Erro ao adicionar");
    } else {
      toast.success("Categoria adicionada!");
      setNewName("");
      fetchCategories();
      invalidate();
    }
    setLoading(false);
  };

  const deleteCategory = async (id: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });

    if (!response.ok) {
      toast.error("Não foi possível remover. Pode haver produtos vinculados.");
    } else {
      fetchCategories();
      invalidate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nome da categoria..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
            <Button onClick={addCategory} disabled={loading} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-auto">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria cadastrada</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-lg border p-2">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteCategory(cat.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
