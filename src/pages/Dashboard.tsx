import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Clock, Package, ShoppingCart, Users, ClipboardList, Warehouse } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const quickActions = [
  { title: "Nova Venda", icon: ShoppingCart, url: "/pdv", color: "bg-primary" },
  { title: "Nova Comanda", icon: ClipboardList, url: "/comandas", color: "bg-success" },
  { title: "Produtos", icon: Package, url: "/produtos", color: "bg-warning" },
  { title: "Estoque", icon: Warehouse, url: "/estoque", color: "bg-info" },
  { title: "Clientes", icon: Users, url: "/clientes", color: "bg-destructive" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/dashboard`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Falha ao carregar estatísticas');
      return await response.json();
    },
  });

  // Monthly sales chart
  const { data: chartData = [] } = useQuery({
    queryKey: ["dashboard-chart"],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/financial?year=${year}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (!response.ok) throw new Error('Falha ao carregar gráfico');
      const data = await response.json();
      // data is [{month, receita, despesa}]
      return data.map((item: any) => ({
        month: item.month,
        vendas: item.receita
      }));
    },
  });

  const summaryCards = [
    { title: "Despesas", value: formatCurrency(stats?.totalDespesas ?? 0), icon: DollarSign, color: "text-destructive", bg: "bg-destructive/10" },
    { title: "Vendas Hoje", value: formatCurrency(stats?.todaySales ?? 0), icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
    { title: "Comandas Abertas", value: String(stats?.openComandas ?? 0), icon: Clock, color: "text-warning", bg: "bg-warning/10" },
    { title: "Produtos Ativos", value: String(stats?.productCount ?? 0), icon: Package, color: "text-info", bg: "bg-info/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                <card.icon className={`h-6 w-6 ${card.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="text-xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions.map((action) => (
          <button key={action.title} onClick={() => navigate(action.url)} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 transition-colors hover:bg-accent">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
              <action.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">{action.title}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Vendas por Mês</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
