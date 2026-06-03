import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Loader2, Pencil, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useCategories, useSaveCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useCategories";
import { useSubCategories, useSaveSubCategory, useDeleteSubCategory } from "@/hooks/useSubCategories";

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManager({ open, onOpenChange }: CategoryManagerProps) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState("");

  const { data: categories = [], isLoading } = useCategories();
  const { data: subCategories = [] } = useSubCategories();

  const saveCategory = useSaveCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const saveSubCategory = useSaveSubCategory();
  const deleteSubCategory = useDeleteSubCategory();

  const addCategory = () => {
    if (!newName.trim()) return;
    saveCategory.mutate(newName.trim(), {
      onSuccess: () => { toast.success("Categoria adicionada!"); setNewName(""); },
      onError: (err: any) => toast.error(err.message || "Erro ao adicionar"),
    });
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const confirmEdit = (id: string) => {
    if (!editingName.trim()) return;
    updateCategory.mutate({ id, name: editingName.trim() }, {
      onSuccess: () => { toast.success("Categoria atualizada!"); setEditingId(null); },
      onError: (err: any) => toast.error(err.message || "Erro ao atualizar"),
    });
  };

  const addSubCategory = (category_id: string) => {
    if (!newSubName.trim()) return;
    saveSubCategory.mutate({ category_id, name: newSubName.trim() }, {
      onSuccess: () => { toast.success("Sub-categoria adicionada!"); setNewSubName(""); },
      onError: (err: any) => toast.error(err.message || "Erro ao adicionar"),
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
    setNewSubName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add category */}
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

          {/* Category list */}
          <div className="space-y-1 max-h-[420px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : categories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria cadastrada</p>
            ) : (
              categories.map((cat) => {
                const catSubs = subCategories.filter((s) => s.category_id === cat.id);
                const isExpanded = expandedId === cat.id;
                const isEditing = editingId === cat.id;

                return (
                  <div key={cat.id} className="rounded-lg border overflow-hidden">
                    {/* Category row */}
                    <div className="flex items-center gap-1 p-2 bg-background">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground"
                        onClick={() => toggleExpand(cat.id)}
                      >
                        {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                      </Button>

                      {isEditing ? (
                        <Input
                          className="h-7 text-sm flex-1"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmEdit(cat.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-medium flex-1 truncate">{cat.name}</span>
                      )}

                      {catSubs.length > 0 && !isEditing && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full shrink-0">
                          {catSubs.length}
                        </span>
                      )}

                      {isEditing ? (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary shrink-0" onClick={() => confirmEdit(cat.id)} disabled={updateCategory.isPending}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground shrink-0" onClick={() => startEdit(cat.id, cat.name)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => deleteCategory.mutate(cat.id, { onError: (e: any) => toast.error(e.message) })}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Sub-categories section */}
                    {isExpanded && (
                      <div className="border-t bg-muted/30 px-3 py-2 space-y-1.5">
                        {catSubs.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhuma sub-categoria</p>
                        ) : (
                          catSubs.map((sub) => (
                            <div key={sub.id} className="flex items-center justify-between rounded border bg-background px-2 py-1">
                              <span className="text-xs">{sub.name}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-destructive"
                                onClick={() => deleteSubCategory.mutate(sub.id, { onError: (e: any) => toast.error(e.message) })}
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          ))
                        )}
                        {/* Add sub-category */}
                        <div className="flex gap-1.5 pt-1">
                          <Input
                            className="h-7 text-xs"
                            placeholder="Nova sub-categoria..."
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && addSubCategory(cat.id)}
                          />
                          <Button
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => addSubCategory(cat.id)}
                            disabled={saveSubCategory.isPending}
                          >
                            {saveSubCategory.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
