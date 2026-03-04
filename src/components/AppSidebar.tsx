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
  { title: "Produtos", url: "/produtos", icon: Package, permission: "produtos" },
  { title: "Estoque", url: "/estoque", icon: Warehouse, permission: "estoque" },
  { title: "Compras", url: "/compras", icon: Receipt, permission: "compras" },
];

const financialItems: MenuItem[] = [
  { title: "Caixa", url: "/caixa", icon: DollarSign, permission: "caixa" },
  { title: "Contas a Pagar", url: "/contas-pagar", icon: ArrowDownCircle, permission: "caixa" },
  { title: "Contas a Receber", url: "/contas-receber", icon: ArrowUpCircle, permission: "caixa" },
];

const fiscalItems: MenuItem[] = [
  { title: "NF-e", url: "/nfe", icon: FileCheck, permission: "pdv" },
  { title: "NFC-e", url: "/nfce", icon: FileX, permission: "pdv" },
  { title: "NF-e Avulsa", url: "/nfe-avulsa", icon: FileJson, permission: "pdv" },
];

const registrationItems: MenuItem[] = [
  { title: "Clientes", url: "/clientes", icon: Users, permission: "clientes" },
  { title: "Fornecedores", url: "/fornecedores", icon: Truck, permission: "fornecedores" },
];

const systemItems: MenuItem[] = [
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, permission: "relatorios" },
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
      { title: "Formas de Pagamento", url: "/configuracoes?tab=pagamentos" }
    ]
  },
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
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted uppercase font-bold text-[10px] tracking-wider px-2 py-4">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted uppercase font-bold text-[10px] tracking-wider px-2 py-4">Financeiro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(financialItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted uppercase font-bold text-[10px] tracking-wider px-2 py-4">Cadastro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(registrationItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted uppercase font-bold text-[10px] tracking-wider px-2 py-4">Fiscal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(fiscalItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-muted uppercase font-bold text-[10px] tracking-wider px-2 py-4">Sistema</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderMenuItems(systemItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
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
              {roles[0] === "admin" ? "Administrador" : roles[0] === "operador_caixa" ? "Operador" : roles[0] === "estoquista" ? "Estoquista" : "Sem perfil"}
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
