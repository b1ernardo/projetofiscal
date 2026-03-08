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
  Beer,
  ArrowUpCircle,
  ArrowDownCircle,
  Receipt,
  UserPlus,
  FileJson,
  FileCheck,
  FileX,
  ChevronRight,
  Building2,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuItem {
  title: string;
  url: string;
  icon: any;
  permission: string;
  subItems?: { title: string; url: string; }[];
}

const mainItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permission: "dashboard" },
  { title: "PDV", url: "/pdv", icon: ShoppingCart, permission: "pdv" },
  { title: "Nova Venda", url: "/nova-venda", icon: ShoppingCart, permission: "pdv" },
  { title: "Histórico de Vendas", url: "/vendas", icon: History, permission: "pdv" },
  { title: "Comandas", url: "/comandas", icon: ClipboardList, permission: "comandas" },
  { title: "Delivery / On-line", url: "/delivery-painel", icon: Truck, permission: "delivery" },
  { title: "Produtos", url: "/produtos", icon: Package, permission: "stock" },
  { title: "Estoque", url: "/estoque", icon: Warehouse, permission: "stock" },
  { title: "Compras", url: "/compras", icon: Receipt, permission: "stock" },
];

const financialItems: MenuItem[] = [
  { title: "Caixa Diário", url: "/caixa", icon: DollarSign, permission: "finances" },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: ArrowDownCircle, permission: "finances" },
  { title: "Contas a Receber", url: "/contas-receber", icon: ArrowUpCircle, permission: "finances" },
];

const fiscalItems: MenuItem[] = [
  { title: "NF-e", url: "/nfe", icon: FileCheck, permission: "fiscal" },
  { title: "NFC-e", url: "/nfce", icon: FileX, permission: "fiscal" },
  { title: "NF-e Avulsa", url: "/nfe-avulsa", icon: FileJson, permission: "fiscal" },
];

const registrationItems: MenuItem[] = [
  { title: "Clientes", url: "/clientes", icon: Users, permission: "clientes" },
  { title: "Vendedores", url: "/vendedores", icon: UserPlus, permission: "clientes" },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck, permission: "fornecedores" },
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
      { title: "Lucratividade", url: "/relatorios?tab=lucratividade" }
    ]
  },
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    permission: "configuracoes",
    subItems: [
      { title: "Dados da Empresa / Fiscal", url: "/configuracoes?tab=fiscal" },
      { title: "Configurações de Usuário", url: "/configuracoes?tab=usuarios" },
      { title: "Opções PDV", url: "/configuracoes?tab=pdv" },
      { title: "Plano de Contas", url: "/configuracoes?tab=plano-contas" },
      { title: "Formas de Pagamento", url: "/configuracoes?tab=pagamentos" },
      { title: "Delivery", url: "/configuracoes?tab=delivery" }
    ]
  },
];

const superAdminItems: MenuItem[] = [
  { title: "Empresas & Acessos", url: "/superadmin", icon: Building2, permission: "superadmin" },
];

export function AppSidebar() {
  const { profile, roles, signOut, hasPermission } = useAuth();
  const { setOpen, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();

  const renderMenuItems = (items: MenuItem[]) => {
    return items
      .filter((item) => hasPermission(item.permission))
      .map((item) => {
        if (item.subItems) {
          return (
            <Collapsible key={item.title} asChild defaultOpen={location.pathname.startsWith(item.url)} className="group/collapsible">
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.subItems.map((subItem) => {
                      const isSubActive = location.pathname + location.search === subItem.url;
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild isActive={isSubActive}>
                            <NavLink
                              to={subItem.url}
                              end
                              onClick={() => { if (isMobile) setOpenMobile(false); }}
                              className={isSubActive ? "bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90" : ""}
                            >
                              <span>{subItem.title}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        }

        const isMainActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);

        return (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title} isActive={isMainActive}>
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={isMainActive ? "bg-primary text-primary-foreground font-bold shadow-sm hover:bg-primary/90 hover:text-primary-foreground" : ""}
                onClick={() => {
                  if (item.url === "/pdv" || item.url === "/nova-venda") {
                    setOpen(false);
                  }
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      });
  };

  const renderSidebarGroup = (label: string, items: MenuItem[]) => {
    const allowedItems = items.filter(item => hasPermission(item.permission));
    if (allowedItems.length === 0) return null;

    return (
      <SidebarGroup>
        <SidebarGroupLabel className="text-sidebar-muted uppercase font-bold text-[10px] tracking-wider px-2 py-4">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {renderMenuItems(items)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <LayoutDashboard className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-sidebar-foreground">GestaoSystem</span>
            <span className="text-xs text-sidebar-muted">Sistema de Gestão</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {roles.includes("super_admin") && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-muted uppercase font-bold text-[10px] tracking-wider px-2 py-4 text-primary">Super Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map(item => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={location.pathname === item.url}>
                      <NavLink
                        to={item.url}
                        className={location.pathname === item.url ? "bg-primary text-primary-foreground font-bold shadow-sm" : ""}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {renderSidebarGroup("Menu Principal", mainItems)}
        {renderSidebarGroup("Financeiro", financialItems)}
        {renderSidebarGroup("Cadastro", registrationItems)}
        {renderSidebarGroup("Fiscal", fiscalItems)}
        {renderSidebarGroup("Sistema", systemItems)}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <SidebarSeparator className="mb-3" />
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
            {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {profile?.full_name || "Usuário"}
            </span>
            <span className="truncate text-xs text-sidebar-muted">
              {roles.includes("super_admin") ? "Super Administrador" : roles.includes("admin") ? "Administrador" : roles.includes("operador_caixa") ? "Operador" : roles.includes("estoquista") ? "Estoquista" : "Sem perfil"}
            </span>
          </div>
        </div>
        <SidebarMenuButton onClick={signOut} className="text-sidebar-muted hover:text-destructive hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}
