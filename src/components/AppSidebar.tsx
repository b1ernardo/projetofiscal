import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  History,
  ClipboardList,
  DollarSign,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  UserPlus,
  FileJson,
  FileCheck,
  FileX,
  ChevronDown,
  Building2,
  Wrench,
  Store,
  BookOpen,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permission: string;
  subItems?: { title: string; url: string }[];
}

const mainItems: MenuItem[] = [
  { title: "Início", url: "/", icon: LayoutDashboard, permission: "dashboard" },
  { title: "PDV", url: "/pdv", icon: Store, permission: "pdv" },
  { title: "Nova Venda", url: "/nova-venda", icon: ShoppingCart, permission: "pdv" },
  { title: "Histórico de Vendas", url: "/vendas", icon: History, permission: "pdv" },
  { title: "Comandas", url: "/comandas", icon: ClipboardList, permission: "comandas" },
  { title: "Orçamentos", url: "/orcamentos", icon: ClipboardList, permission: "pdv" },
  { title: "Delivery / On-line", url: "/delivery-painel", icon: Truck, permission: "delivery" },
];

const cadastrosItems: MenuItem[] = [
  { title: "Produtos", url: "/produtos", icon: Package, permission: "stock" },
  { title: "Estoque", url: "/estoque", icon: Warehouse, permission: "stock" },
  { title: "Compras", url: "/compras", icon: Receipt, permission: "stock" },
  { title: "Clientes", url: "/clientes", icon: Users, permission: "clientes" },
  { title: "Vendedores", url: "/vendedores", icon: UserPlus, permission: "clientes" },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck, permission: "fornecedores" },
  { title: "Ordens de Serviço", url: "/ordens-servico", icon: Wrench, permission: "pdv" },
];

const financialItems: MenuItem[] = [
  { title: "Caixa Diário", url: "/caixa", icon: DollarSign, permission: "finances" },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: ArrowDownCircle, permission: "finances" },
  { title: "Contas a Receber", url: "/contas-receber", icon: ArrowUpCircle, permission: "finances" },
  { title: "Plano de Contas", url: "/plano-contas", icon: BookOpen, permission: "finances" },
];

const fiscalItems: MenuItem[] = [
  { title: "NF-e", url: "/nfe", icon: FileCheck, permission: "fiscal" },
  { title: "NFC-e", url: "/nfce", icon: FileX, permission: "fiscal" },
  { title: "NF-e Avulsa", url: "/nfe-avulsa", icon: FileJson, permission: "fiscal" },
  { title: "Guia Fiscal NF-e", url: "/guia-fiscal", icon: BookOpen, permission: "fiscal" },
];

const systemItems: MenuItem[] = [
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: BarChart3,
    permission: "relatorios",
    subItems: [
      { title: "Vendas por Período", url: "/relatorios?tab=vendas-periodo" },
      { title: "Estoque", url: "/relatorios?tab=estoque" },
      { title: "Financeiro", url: "/relatorios?tab=financeiro" },
      { title: "Produtos Mais Vendidos", url: "/relatorios?tab=produtos-mais-vendidos" },
      { title: "Vendas por Produto", url: "/relatorios?tab=vendas-produto" },
      { title: "Vendas por Clientes", url: "/relatorios?tab=vendas-clientes" },
      { title: "Vendas por Vendedor", url: "/relatorios?tab=vendas-vendedor" },
      { title: "Lucratividade", url: "/relatorios?tab=lucratividade" },
      { title: "Plano de Contas", url: "/relatorios?tab=plano-contas" },
    ],
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    permission: "configuracoes",
    subItems: [
      { title: "Dados da Empresa / Fiscal", url: "/configuracoes?tab=fiscal" },
      { title: "Usuários", url: "/configuracoes?tab=usuarios" },
      { title: "Opções PDV", url: "/configuracoes?tab=pdv" },
      { title: "Formas de Pagamento", url: "/configuracoes?tab=pagamentos" },
      { title: "Delivery", url: "/configuracoes?tab=delivery" },
    ],
  },
];

function SidebarSection({ label, items }: { label: string; items: MenuItem[] }) {
  const { hasPermission } = useAuth();
  const location = useLocation();
  const allowed = items.filter((i) => hasPermission(i.permission));
  if (allowed.length === 0) return null;

  return (
    <div className="mb-1">
      <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white/30 select-none">
        {label}
      </p>
      {allowed.map((item) => (
        <SidebarItem key={item.url} item={item} location={location} />
      ))}
    </div>
  );
}

function SidebarItem({ item, location }: { item: MenuItem; location: ReturnType<typeof useLocation> }) {
  const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const [open, setOpen] = useState(isActive);

  if (hasSubItems) {
    return (
      <div>
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "text-white"
              : "text-white/60 hover:text-white hover:bg-white/5"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.title}</span>
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div className="ml-7 border-l border-white/10 pl-3 pb-1">
            {item.subItems!.map((sub) => {
              const subActive = location.pathname + location.search === sub.url;
              return (
                <NavLink
                  key={sub.url}
                  to={sub.url}
                  className={cn(
                    "block py-1.5 px-2 text-xs rounded transition-colors",
                    subActive ? "text-white font-semibold" : "text-white/50 hover:text-white"
                  )}
                >
                  {sub.title}
                </NavLink>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.url}
      end={item.url === "/"}
      className={cn(
        "relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-white/10 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r-full before:bg-[hsl(210,100%,65%)]"
          : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      <span>{item.title}</span>
    </NavLink>
  );
}

export function AppSidebar() {
  const { profile, roles, signOut } = useAuth();

  const roleLabel = roles.includes("super_admin")
    ? "Super Admin"
    : roles.includes("admin")
    ? "Administrador"
    : roles.includes("operador_caixa")
    ? "Operador de Caixa"
    : roles.includes("estoquista")
    ? "Estoquista"
    : "Usuário";

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col overflow-y-auto bg-[hsl(228,39%,17%)] text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(210,100%,65%)] shadow">
          <Store className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-[13px] font-bold leading-tight tracking-tight">GestaoSystem</p>
          <p className="text-[10px] text-white/40 leading-tight">Sistema de Gestão</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {roles.includes("super_admin") && (
          <div className="mb-1">
            <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[hsl(210,100%,65%)] select-none">
              Super Admin
            </p>
            <NavLink
              to="/superadmin"
              className={({ isActive }) =>
                cn(
                  "relative flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-1 before:rounded-r-full before:bg-[hsl(210,100%,65%)]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )
              }
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span>Empresas &amp; Acessos</span>
            </NavLink>
          </div>
        )}

        <SidebarSection label="Vendas" items={mainItems} />
        <SidebarSection label="Cadastros" items={cadastrosItems} />
        <SidebarSection label="Financeiro" items={financialItems} />
        <SidebarSection label="Fiscal" items={fiscalItems} />
        <SidebarSection label="Sistema" items={systemItems} />
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(210,100%,65%)] text-xs font-bold text-white shadow">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold leading-tight">
              {profile?.full_name || "Usuário"}
            </p>
            <p className="truncate text-[11px] text-white/40">{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-red-400"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair do sistema
        </button>
      </div>
    </aside>
  );
}
