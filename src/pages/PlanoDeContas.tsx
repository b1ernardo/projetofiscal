import { ChartOfAccountsManager } from "@/components/config/ChartOfAccountsManager";

export default function PlanoDeContas() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Plano de Contas</h2>
        <p className="text-muted-foreground">Cadastre e gerencie as contas de receitas e despesas</p>
      </div>
      <ChartOfAccountsManager />
    </div>
  );
}
