import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useSaveCategory, useDeleteCategory } from "@/hooks/useCategories";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const [newName, setNewName] = useState("");

  const { data: categories = [], isLoading } = useCategories();
  const saveCategory = useSaveCategory();
  const deleteCategoryMutation = useDeleteCategory();

  const addCategory = async () => {
    if (!newName.trim()) return;
    saveCategory.mutate(newName.trim(), {
      onSuccess: () => {
        toast.success("Categoria adicionada!");
        setNewName("");
      },
      onError: (err: any) => {
        toast.error(err.message || "Erro ao adicionar");
      }
    });
  };

  const deleteCategory = async (id: string) => {
    deleteCategoryMutation.mutate(id, {
      onError: (err: any) => {
        toast.error(err.message);
      }
    });
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
            <Button onClick={addCategory} disabled={saveCategory.isPending} size="icon">
              {saveCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <div className="space-y-2 max-h-60 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
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
