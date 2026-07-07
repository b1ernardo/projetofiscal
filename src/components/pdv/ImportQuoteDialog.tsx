import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileText, Search } from "lucide-react";

interface ImportQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (quoteId: string) => void;
}

const statusLabel: Record<string, { label: string; color: string }> = {
  pending:    { label: "Pendente",   color: "bg-yellow-100 text-yellow-800" },
  authorized: { label: "Autorizado", color: "bg-blue-100 text-blue-800" },
};

export function ImportQuoteDialog({ open, onOpenChange, onImport }: ImportQuoteDialogProps) {
  const [search, setSearch] = useState("");

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["quotes-import"],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/quotes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!res.ok) throw new Error("Erro ao carregar orçamentos");
      const data = await res.json();
      return (Array.isArray(data) ? data : data.data ?? []).filter(
        (q: any) => q.status === "pending" || q.status === "authorized"
      );
    },
    enabled: open,
  });

  const filtered = quotes.filter((q: any) => {
    const term = search.toLowerCase();
    return (
      !term ||
      String(q.quote_number || "").includes(term) ||
      (q.customer_name || "").toLowerCase().includes(term)
    );
  });

  const handleSelect = (quoteId: string) => {
    onImport(quoteId);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Importar Orçamento
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md divide-y">
          {isLoading && (
            <div className="p-6 text-center text-slate-500 text-sm">Carregando orçamentos...</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              Nenhum orçamento pendente encontrado.
            </div>
          )}
          {filtered.map((q: any) => {
            const st = statusLabel[q.status] ?? { label: q.status, color: "bg-slate-100 text-slate-700" };
            return (
              <button
                key={q.id}
                onClick={() => handleSelect(q.id)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-blue-700 text-sm w-12 shrink-0">
                      #{q.quote_number}
                    </span>
                    <span className="font-medium text-sm truncate">{q.customer_name || "Consumidor Final"}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.label}
                    </span>
                    <span className="font-bold text-green-700 text-sm">
                      R$ {Number(q.total_amount).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400 hidden sm:inline">
                      {new Date(q.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
