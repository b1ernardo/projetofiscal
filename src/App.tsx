import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PDV from "./pages/PDV";
import Vendas from "./pages/Vendas";
import NovaVenda from "./pages/NovaVenda";
import Comandas from "./pages/Comandas";
import Produtos from "./pages/Produtos";
import Estoque from "./pages/Estoque";
import Caixa from "./pages/Caixa";
import Clientes from "./pages/Clientes";
import Vendedores from "./pages/Vendedores";
import Fornecedores from "./pages/Fornecedores";
import Compras from "./pages/Compras";
import NovaCompra from "./pages/NovaCompra";
import Relatorios from "./pages/Relatorios";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import NovaNFe from "./pages/NovaNFe";
import NotasFiscais from "./pages/NotasFiscais";
import GuiaFiscal from "./pages/GuiaFiscal";
import SuperAdmin from "./pages/SuperAdmin";
import Delivery from "./pages/Delivery";
import GestaoDelivery from "./pages/GestaoDelivery";
import Orcamentos from "./pages/Orcamentos";
import ServiceOrders from "./pages/ServiceOrders";
import ServiceOrderForm from "./pages/ServiceOrderForm";
import PlanoDeContas from "./pages/PlanoDeContas";

const queryClient = new QueryClient();

function ProtectedRoute({ children, module, superOnly }: { children: React.ReactNode, module?: string, superOnly?: boolean }) {
  const { user, loading, hasPermission, roles, permissions } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (superOnly && !roles.includes("super_admin")) {
    return <Navigate to="/" replace />;
  }

  if (module && !hasPermission(module)) {
    // Se o usuário não tem permissão para esta rota:
    // 1. Se ele estiver tentando acessar a home (/), redireciona para o primeiro módulo disponível
    // 2. Se for qualquer outra rota, manda ele para a home (que fará a verificação acima)
    if (window.location.pathname === "/") {
      const availableModules = ["pdv", "vendas", "produtos", "estoque", "caixa", "clientes", "fiscal", "comandas"];
      const firstAllowed = availableModules.find(m => hasPermission(m));
      
      if (firstAllowed) {
        const routeMap: Record<string, string> = {
          pdv: "/pdv",
          vendas: "/vendas",
          produtos: "/produtos",
          estoque: "/estoque",
          caixa: "/caixa",
          clientes: "/clientes",
          fiscal: "/nfe",
          comandas: "/comandas"
        };
        return <Navigate to={routeMap[firstAllowed]} replace />;
      }
    }
    
    // Se não encontrou nada ou não é a home, vai para a home (que evitará o loop se a home for protegida)
    if (module === "dashboard") {
       // Se o problema é justamente a dashboard (home), e não achamos alternativa
       return <AppLayout><div className="p-8 text-center">Você não tem permissão para acessar este módulo.</div></AppLayout>;
    }
    
    return <Navigate to="/" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL === './' ? '' : import.meta.env.BASE_URL}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/pdv" element={<ProtectedRoute module="pdv"><PDV /></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute module="vendas"><Vendas /></ProtectedRoute>} />
            <Route path="/nova-venda" element={<ProtectedRoute module="pdv"><NovaVenda /></ProtectedRoute>} />
            <Route path="/nfe-avulsa" element={<ProtectedRoute module="fiscal"><NovaNFe /></ProtectedRoute>} />
            <Route path="/nfe" element={<ProtectedRoute module="fiscal"><NotasFiscais tipo="NFE" /></ProtectedRoute>} />
            <Route path="/nfce" element={<ProtectedRoute module="fiscal"><NotasFiscais tipo="NFCE" /></ProtectedRoute>} />
            <Route path="/guia-fiscal" element={<ProtectedRoute module="fiscal"><GuiaFiscal /></ProtectedRoute>} />
            <Route path="/comandas" element={<ProtectedRoute module="comandas"><Comandas /></ProtectedRoute>} />
            <Route path="/orcamentos" element={<ProtectedRoute module="pdv"><Orcamentos /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute module="produtos"><Produtos /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute module="estoque"><Estoque /></ProtectedRoute>} />
            <Route path="/caixa" element={<ProtectedRoute module="caixa"><Caixa /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute module="clientes"><Clientes /></ProtectedRoute>} />
            <Route path="/vendedores" element={<ProtectedRoute module="clientes"><Vendedores /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute module="fornecedores"><Fornecedores /></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute module="stock"><Compras /></ProtectedRoute>} />
            <Route path="/nova-compra" element={<ProtectedRoute module="stock"><NovaCompra /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute module="relatorios"><Relatorios /></ProtectedRoute>} />
            <Route path="/contas-pagar" element={<ProtectedRoute module="contas_pagar"><ContasPagar /></ProtectedRoute>} />
            <Route path="/contas-receber" element={<ProtectedRoute module="contas_receber"><ContasReceber /></ProtectedRoute>} />
            <Route path="/plano-contas" element={<ProtectedRoute module="finances"><PlanoDeContas /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute module="configuracoes"><Configuracoes /></ProtectedRoute>} />
            <Route path="/superadmin" element={<ProtectedRoute superOnly><SuperAdmin /></ProtectedRoute>} />
            <Route path="/delivery/:slug?" element={<Delivery />} />
            <Route path="/delivery-painel" element={<ProtectedRoute module="pdv"><GestaoDelivery /></ProtectedRoute>} />
            <Route path="/ordens-servico" element={<ProtectedRoute module="pdv"><ServiceOrders /></ProtectedRoute>} />
            <Route path="/ordens-servico/nova" element={<ProtectedRoute module="pdv"><ServiceOrderForm /></ProtectedRoute>} />
            <Route path="/ordens-servico/editar/:id" element={<ProtectedRoute module="pdv"><ServiceOrderForm /></ProtectedRoute>} />
            <Route path="/ordens-servico/ver/:id" element={<ProtectedRoute module="pdv"><ServiceOrderForm /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
