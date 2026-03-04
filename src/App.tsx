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
import Fornecedores from "./pages/Fornecedores";
import Compras from "./pages/Compras";
import Relatorios from "./pages/Relatorios";
import RelatorioVendas from "./pages/relatorios/RelatorioVendas";
import RelatorioEstoque from "./pages/relatorios/RelatorioEstoque";
import RelatorioFinanceiro from "./pages/relatorios/RelatorioFinanceiro";
import RelatorioProdutosMaisVendidos from "./pages/relatorios/RelatorioProdutosMaisVendidos";
import ContasPagar from "./pages/ContasPagar";
import ContasReceber from "./pages/ContasReceber";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";
import NovaNFe from "./pages/NovaNFe";
import NotasFiscais from "./pages/NotasFiscais";

const queryClient = new QueryClient();

function ProtectedRoute({ children, module }: { children: React.ReactNode, module?: string }) {
  const { user, loading, hasPermission } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="./login" replace />;

  if (module && !hasPermission(module)) {
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
      <BrowserRouter basename="/">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/pdv" element={<ProtectedRoute module="pdv"><PDV /></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute module="pdv"><Vendas /></ProtectedRoute>} />
            <Route path="/nova-venda" element={<ProtectedRoute module="pdv"><NovaVenda /></ProtectedRoute>} />
            <Route path="/nfe-avulsa" element={<ProtectedRoute module="pdv"><NovaNFe /></ProtectedRoute>} />
            <Route path="/nfe" element={<ProtectedRoute module="pdv"><NotasFiscais tipo="NFE" /></ProtectedRoute>} />
            <Route path="/nfce" element={<ProtectedRoute module="pdv"><NotasFiscais tipo="NFCE" /></ProtectedRoute>} />
            <Route path="/comandas" element={<ProtectedRoute module="comandas"><Comandas /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute module="produtos"><Produtos /></ProtectedRoute>} />
            <Route path="/estoque" element={<ProtectedRoute module="estoque"><Estoque /></ProtectedRoute>} />
            <Route path="/caixa" element={<ProtectedRoute module="caixa"><Caixa /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute module="clientes"><Clientes /></ProtectedRoute>} />
            <Route path="/fornecedores" element={<ProtectedRoute module="fornecedores"><Fornecedores /></ProtectedRoute>} />
            <Route path="/compras" element={<ProtectedRoute module="compras"><Compras /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute module="relatorios"><Relatorios /></ProtectedRoute>} />
            <Route path="/relatorios/vendas" element={<ProtectedRoute module="relatorios"><RelatorioVendas /></ProtectedRoute>} />
            <Route path="/relatorios/estoque" element={<ProtectedRoute module="relatorios"><RelatorioEstoque /></ProtectedRoute>} />
            <Route path="/relatorios/financeiro" element={<ProtectedRoute module="relatorios"><RelatorioFinanceiro /></ProtectedRoute>} />
            <Route path="/relatorios/produtos-mais-vendidos" element={<ProtectedRoute module="relatorios"><RelatorioProdutosMaisVendidos /></ProtectedRoute>} />
            <Route path="/contas-pagar" element={<ProtectedRoute module="caixa"><ContasPagar /></ProtectedRoute>} />
            <Route path="/contas-receber" element={<ProtectedRoute module="caixa"><ContasReceber /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute module="configuracoes"><Configuracoes /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
