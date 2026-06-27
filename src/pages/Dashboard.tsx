import { DollarSign, TrendingUp, Clock, Package, ShoppingCart, Truck, ClipboardList, Warehouse, BarChart2, Gift } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const quickActions = [
  { title: "Nova Venda", icon: ShoppingCart, url: "/pdv", color: "bg-primary", permission: "pdv" },
  { title: "Gestão Delivery", icon: Truck, url: "/delivery-painel", color: "bg-emerald-500", permission: "delivery" },
  { title: "Nova Comanda", icon: ClipboardList, url: "/comandas", color: "bg-amber-500", permission: "comandas" },
  { title: "Produtos", icon: Package, url: "/produtos", color: "bg-violet-500", permission: "stock" },
  { title: "Estoque", icon: Warehouse, url: "/estoque", color: "bg-cyan-500", permission: "stock" },
];

const PERIODS = ["Dia atual", "Mês atual", "Últimos 12 meses"] as const;

const PERIOD_PARAM: Record<string, string> = {
  "Dia atual": "dia",
  "Mês atual": "mes",
  "Últimos 12 meses": "ano",
};

// Colorful card configs matching PowerStock
const STAT_CONFIGS = [
  { key: "todaySales",      title: "Faturamento",       icon: BarChart2, bg: "bg-emerald-500",  permission: "pdv" },
  { key: "totalVendas",     title: "Total de vendas",   icon: ShoppingCart, bg: "bg-amber-400", permission: "pdv" },
  { key: "ticketMedio",     title: "Ticket médio",      icon: DollarSign,   bg: "bg-violet-500", permission: "pdv" },
  { key: "productCount",    title: "Produtos vendidos", icon: Gift,         bg: "bg-teal-500",   permission: "stock" },
  { key: "openComandas",    title: "Por atendimento",   icon: Clock,        bg: "bg-pink-500",   permission: "comandas" },
] as const;

export default function Dashboard() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [period, setPeriod] = useState<typeof PERIODS[number]>("Dia atual");

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["dashboard-stats", period],
    queryFn: async () => {
      const p = PERIOD_PARAM[period] ?? "dia";
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/dashboard?period=${p}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar estatísticas");
      return response.json();
    },
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ["dashboard-chart"],
    queryFn: async () => {
      const year = new Date().getFullYear();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/reports/financial?year=${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("auth_token")}` },
      });
      if (!response.ok) throw new Error("Falha ao carregar gráfico");
      const data = await response.json();
      return data.map((item: any) => ({ month: item.month, vendas: item.receita, despesas: item.despesa }));
    },
  });

  const statValues: Record<string, string> = {
    todaySales: formatCurrency(stats?.todaySales ?? 0),
    totalVendas: String(stats?.totalVendas ?? 0),
    ticketMedio: formatCurrency(stats?.ticketMedio ?? 0),
    productCount: String(stats?.productCount ?? 0),
    openComandas: `${stats?.openComandas ?? 0} produtos`,
  };

  const now = new Date();
  const dateLabel = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`;
  const timeLabel = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden text-sm">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-4 py-1.5 font-medium transition-colors",
                  period === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <span className="hidden sm:block text-xs text-muted-foreground">
            Dados de {dateLabel} às {timeLabel}h.{" "}
            <button className="text-primary hover:underline font-medium" onClick={() => refetchStats()}>Atualizar agora</button>
          </span>
        </div>
      </div>

      {/* Colorful stat cards — like PowerStock */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {STAT_CONFIGS.filter((c) => hasPermission(c.permission)).map((cfg) => (
          <div
            key={cfg.key}
            className={`${cfg.bg} rounded-xl p-4 text-white shadow-sm flex items-center gap-3`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/20">
              <cfg.icon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/80 leading-tight">{cfg.title}</p>
              <p className="text-lg font-bold leading-tight truncate">{statValues[cfg.key]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {quickActions
          .filter((a) => hasPermission(a.permission))
          .map((action) => (
            <button
              key={action.title}
              onClick={() => navigate(action.url)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <span className="text-sm font-medium">{action.title}</span>
            </button>
          ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4 text-primary">Faturamento</h2>
        <div className="h-72">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-primary font-medium">Não existem dados para serem exibidos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `R$ ${Number(v).toFixed(0)}`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="vendas" name="Receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
