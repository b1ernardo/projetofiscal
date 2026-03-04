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

  const toggleActive = async (id: string, active: boolean) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/payment_methods/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ active: !active })
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
      <CardHeader>
        <CardTitle>Formas de Pagamento</CardTitle>
        <CardDescription>Gerencie as formas de pagamento disponíveis.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
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
          <div className="space-y-2 max-h-60 overflow-auto">
            {methods.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma forma cadastrada</p>
            ) : (
              methods.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-2">
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={m.active}
                      onCheckedChange={() => toggleActive(m.id, m.active)}
                      disabled={editingId === m.id}
                    />
                    {editingId === m.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-8 py-0"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(m.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className={`text-sm font-medium ${!m.active ? "text-muted-foreground line-through" : ""}`}>
                        {m.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {editingId === m.id ? (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => saveEdit(m.id)} disabled={loading}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => {
                          setEditingId(m.id);
                          setEditingName(m.name);
                        }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMethod(m.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
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
