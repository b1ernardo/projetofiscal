import { useSearchParams, Navigate } from "react-router-dom";
import { FiscalConfig } from "@/components/config/FiscalConfig";
import { PDVConfig } from "@/components/config/PDVConfig";
import { UserManager } from "@/components/config/UserManager";
import { PaymentMethodManager } from "@/components/config/PaymentMethodManager";
import { ChartOfAccountsManager } from "@/components/config/ChartOfAccountsManager";
import { DeliveryConfig } from "@/components/config/DeliveryConfig";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export default function Configuracoes() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const isTabAllowed = (currentTab: string | null) => {
    if (!currentTab) return true;
    switch (currentTab) {
      case "pdv": return hasPermission("pdv");
      case "plano-contas":
      case "pagamentos": return hasPermission("finances");
      case "delivery": return hasPermission("delivery");
      case "fiscal": return hasPermission("fiscal");
      case "dados-empresa": return true; // redireciona para fiscal
      case "usuarios": return true;
      default: return true;
    }
  };

  useEffect(() => {
    if (tab && !isTabAllowed(tab)) {
      toast({
        title: "Acesso Restrito",
        description: "Este módulo não está ativo para sua empresa.",
        variant: "destructive",
      });
    }
  }, [tab]);

  const getDefaultTab = () => {
    if (hasPermission("fiscal")) return "fiscal";
    return "usuarios";
  };

  if (!tab || !isTabAllowed(tab)) {
    return <Navigate to={`/configuracoes?tab=${getDefaultTab()}`} replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Gerencie as definições do sistema sistema web</p>
      </div>

      {(tab === "fiscal" || tab === "dados-empresa") && <FiscalConfig />}
      {tab === "usuarios" && <UserManager />}
      {tab === "pdv" && <div className="max-w-2xl"><PDVConfig /></div>}
      {tab === "plano-contas" && <div className="max-w-4xl"><ChartOfAccountsManager /></div>}
      {tab === "pagamentos" && <div className="max-w-xl"><PaymentMethodManager /></div>}
      {tab === "delivery" && <div className="max-w-2xl"><DeliveryConfig /></div>}
    </div>
  );
}
