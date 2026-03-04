import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const reports = [
  { title: "Vendas por Período", description: "Relatório detalhado de vendas com filtros por data", icon: TrendingUp, color: "text-success bg-success/10", path: "/relatorios/vendas" },
  { title: "Estoque", description: "Produtos com maior e menor saída, estoque baixo", icon: Package, color: "text-warning bg-warning/10", path: "/relatorios/estoque" },
  { title: "Financeiro", description: "Receitas vs despesas, fluxo de caixa", icon: DollarSign, color: "text-primary bg-primary/10", path: "/relatorios/financeiro" },
  { title: "Produtos Mais Vendidos", description: "Ranking de produtos por quantidade vendida", icon: BarChart3, color: "text-info bg-info/10", path: "/relatorios/produtos-mais-vendidos" },
];

export default function Relatorios() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Análises e relatórios do negócio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(r.path)}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${r.color}`}>
                <r.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
