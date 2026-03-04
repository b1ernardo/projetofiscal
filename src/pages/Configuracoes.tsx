import { useSearchParams, Navigate } from "react-router-dom";
import { FiscalConfig } from "@/components/config/FiscalConfig";
import { PDVConfig } from "@/components/config/PDVConfig";
import { UserManager } from "@/components/config/UserManager";
import { PaymentMethodManager } from "@/components/config/PaymentMethodManager";
import { ChartOfAccountsManager } from "@/components/config/ChartOfAccountsManager";

export default function Configuracoes() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  if (!tab) {
    return <Navigate to="/configuracoes?tab=fiscal" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie as definições do sistema</p>
      </div>

      {tab === "fiscal" && <FiscalConfig />}
      {tab === "usuarios" && <UserManager />}
      {tab === "pdv" && <div className="max-w-2xl"><PDVConfig /></div>}
      {tab === "plano-contas" && <div className="max-w-4xl"><ChartOfAccountsManager /></div>}
      {tab === "pagamentos" && <div className="max-w-xl"><PaymentMethodManager /></div>}
    </div>
  );
}
