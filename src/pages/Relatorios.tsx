import { useSearchParams, Navigate } from "react-router-dom";
import RelatorioVendas from "./relatorios/RelatorioVendas";
import RelatorioEstoque from "./relatorios/RelatorioEstoque";
import RelatorioFinanceiro from "./relatorios/RelatorioFinanceiro";
import RelatorioProdutosMaisVendidos from "./relatorios/RelatorioProdutosMaisVendidos";
import RelatorioVendasProduto from "./relatorios/RelatorioVendasProduto";
import RelatorioVendasClientes from "./relatorios/RelatorioVendasClientes";
import RelatorioLucratividade from "./relatorios/RelatorioLucratividade";
import RelatorioVendedores from "./relatorios/RelatorioVendedores";
import RelatorioPlanoContas from "./relatorios/RelatorioPlanoContas";

// Relatório de Vendedores
export default function Relatorios() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  if (!tab) {
    return <Navigate to="/relatorios?tab=vendas-periodo" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
        <p className="text-muted-foreground">Análises e relatórios do negócio</p>
      </div>

      {tab === "vendas-periodo" && <RelatorioVendas />}
      {tab === "estoque" && <RelatorioEstoque />}
      {tab === "financeiro" && <RelatorioFinanceiro />}
      {tab === "produtos-mais-vendidos" && <RelatorioProdutosMaisVendidos />}
      {tab === "vendas-produto" && <RelatorioVendasProduto />}
      {tab === "vendas-clientes" && <RelatorioVendasClientes />}
      {tab === "lucratividade" && <RelatorioLucratividade />}
      {tab === "vendas-vendedor" && <RelatorioVendedores />}
      {tab === "plano-contas" && <RelatorioPlanoContas />}
    </div>
  );
}

