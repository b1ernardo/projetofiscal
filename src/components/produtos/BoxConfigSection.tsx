import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package } from "lucide-react";
import { BoxConfig } from "@/hooks/useProducts";

interface BoxConfigSectionProps {
  configs: BoxConfig[];
  onChange: (configs: BoxConfig[]) => void;
  salePrice: number;
}

let tempIdCounter = 0;

export function BoxConfigSection({ configs, onChange, salePrice }: BoxConfigSectionProps) {
  const addConfig = () => {
    onChange([
      ...configs,
      { id: `temp-${++tempIdCounter}`, label: "", quantity: 12, price: salePrice * 12 },
    ]);
  };

  const updateConfig = (index: number, field: keyof BoxConfig, value: string | number) => {
    const updated = configs.map((c, i) => {
      if (i !== index) return c;
      return { ...c, [field]: value };
    });
    onChange(updated);
  };

  const removeConfig = (index: number) => {
    onChange(configs.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          Formatos de Venda (Grades/Caixas)
        </Label>
        <Button type="button" variant="outline" size="sm" onClick={addConfig}>
          <Plus className="mr-1 h-3 w-3" /> Adicionar Caixa
        </Button>
      </div>

      {configs.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhuma configuração de caixa. O produto será vendido apenas por unidade.
        </p>
      )}

      {configs.map((config, index) => (
        <div key={config.id} className="flex items-end gap-2 rounded-lg border p-3 bg-muted/30">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Nome</Label>
            <Input
              value={config.label}
              onChange={(e) => updateConfig(index, "label", e.target.value)}
              placeholder="Ex: Caixa c/ 12"
              className="h-8 text-sm"
            />
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-xs">Qtd Un.</Label>
            <Input
              type="number"
              min={1}
              value={config.quantity || ""}
              onChange={(e) => updateConfig(index, "quantity", Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <div className="w-28 space-y-1">
            <Label className="text-xs">Preço</Label>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={config.price || ""}
              onChange={(e) => updateConfig(index, "price", Number(e.target.value))}
              className="h-8 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => removeConfig(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
