import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

export function PaymentMethodManager() {
  const [methods, setMethods] = useState<{ id: string; name: string; active: boolean }[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchMethods = async () => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payment_methods`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });
    if (response.ok) {
      const data = await response.json();
      setMethods(data.map((m: any) => ({ ...m, active: !!parseInt(m.active) })));
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const addMethod = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payment_methods`, {
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
      toast.success("Forma de pagamento adicionada!");
      setNewName("");
      fetchMethods();
    }
    setLoading(false);
  };

  const toggleActive = async (id: string, active: boolean, field: 'active' | 'show_in_delivery') => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payment_methods/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ [field]: !active })
    });

    if (response.ok) {
      fetchMethods();
    }
  };

  const saveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    setLoading(true);
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payment_methods/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: editingName.trim() })
    });

    if (response.ok) {
      toast.success("Nome atualizado!");
      setEditingId(null);
      fetchMethods();
    } else {
      toast.error("Erro ao atualizar nome.");
    }
    setLoading(false);
  };

  const deleteMethod = async (id: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payment_methods/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
    });

    if (!response.ok) {
      toast.error("Não foi possível remover.");
    } else {
      fetchMethods();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>Formas de Pagamento</CardTitle>
        <CardDescription>Gerencie as formas de pagamento disponíveis.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Nova forma de pagamento..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMethod()}
            />
            <Button onClick={addMethod} disabled={loading} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground uppercase px-2 mb-1">
            <div className="col-span-5">Nome</div>
            <div className="col-span-3 text-center">Ativo</div>
            <div className="col-span-3 text-center">Delivery</div>
            <div className="col-span-1"></div>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-auto pr-1">
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma forma cadastrada</p>
            ) : (
              methods.map((m: any) => (
                <div key={m.id} className="grid grid-cols-12 gap-2 items-center rounded-lg border p-2 hover:bg-muted/30 transition-colors">
                  <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                    {editingId === m.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 py-0 px-2 text-xs"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(m.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className={`text-xs font-semibold truncate ${!m.active ? "text-muted-foreground line-through opacity-50" : ""}`}>
                        {m.name}
                      </span>
                    )}
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <Switch
                      checked={m.active}
                      onCheckedChange={() => toggleActive(m.id, m.active, 'active')}
                      className="scale-75"
                    />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <Switch
                      checked={!!parseInt(m.show_in_delivery)}
                      onCheckedChange={() => toggleActive(m.id, !!parseInt(m.show_in_delivery), 'show_in_delivery')}
                      className="scale-75"
                    />
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    {editingId === m.id ? (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-green-600 p-0" onClick={() => saveEdit(m.id)} disabled={loading}>
                        <Check className="h-4 w-4" />
                      </Button>
                    ) : (
                      <div className="flex">
                        {m.name !== "Dinheiro" && m.name !== "Conta" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground p-0" onClick={() => {
                              setEditingId(m.id);
                              setEditingName(m.name);
                            }}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive p-0" onClick={() => deleteMethod(m.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
