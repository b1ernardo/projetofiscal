import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AppRole = "super_admin" | "admin" | "operador_caixa" | "estoquista";

interface User {
  id: string;
  email: string;
  full_name?: string;
  permissions?: string[];
  company_modules?: string[];
  max_discount?: number;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  roles: AppRole[];
  permissions: string[];
  companyModules: string[];
  profile: { full_name: string; phone: string | null; avatar_url: string | null } | null;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (module: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [companyModules, setCompanyModules] = useState<string[]>([]);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Detecta a base da API de forma ultra-segura
        let apiBase = import.meta.env.VITE_API_URL || "";
        if (!apiBase) {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          if (isLocal) {
            apiBase = "/api";
          } else {
            // Em produção, tenta encontrar a base removendo a página atual se for conhecida
            const path = window.location.pathname.replace(/\/(login|vendas|pdv|produtos|estoque|caixa|clientes|configuracoes|orcamentos|ordens-servico|nfe|nfce|nova-venda|nova-compra|relatorios|comandas|fornecedores|vendedores|superadmin|delivery-painel).*$/, "");
            apiBase = `${window.location.origin}${path.replace(/\/$/, '')}/api`;
          }
        }

        const response = await fetch(`${apiBase}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data && data.user) {
            setUser(data.user);
            setSession({ access_token: token });
            if (data.user.roles) setRoles(Array.isArray(data.user.roles) ? data.user.roles : [data.user.roles]);
            if (data.user.permissions) setPermissions(Array.isArray(data.user.permissions) ? data.user.permissions : []);
            if (data.user.company_modules) setCompanyModules(Array.isArray(data.user.company_modules) ? data.user.company_modules : []);
            if (data.user.profile) setProfile(data.user.profile);
          } else {
            console.warn("User data missing in /auth/me response", data);
            localStorage.removeItem('auth_token');
            setLoading(false);
          }
        } else {
          localStorage.removeItem('auth_token');
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const hasPermission = (module: string) => {
    if (roles.includes("super_admin")) return true;

    const moduleMappings: Record<string, string> = {
      'pdv': 'pdv',
      'comandas': 'comandas',
      'delivery': 'delivery',
      'stock': 'stock',
      'produtos': 'produtos',
      'finances': 'finances',
      'fiscal': 'fiscal',
      'clientes': 'clientes',
      'fornecedores': 'stock',
      'configuracoes': 'configuracoes',
      'dados_empresa': 'dados_empresa',
      'dashboard': 'dashboard',
      'relatorios': 'vendas', // Mapeia relatórios para o módulo de vendas/gestão
    };

    const targetModule = moduleMappings[module];
    if (targetModule) {
      // "stock" e "produtos" são módulos equivalentes — qualquer um habilita Produtos/Estoque/Compras
      const aliases: Record<string, string[]> = {
        stock: ["stock", "produtos"],
        produtos: ["stock", "produtos"],
      };
      const accepted = aliases[targetModule] ?? [targetModule];
      if (!accepted.some((k) => companyModules.includes(k))) {
        return false;
      }
    }

    if (roles.includes("admin")) return true;

    // Permissões padrão por Role caso não existam no banco
    if (roles.includes("operador_caixa")) {
      const cashierDefaults = ["pdv", "caixa", "comandas", "clientes", "vendas", "contas_pagar", "contas_receber", "finances"];
      if (cashierDefaults.includes(module)) return true;
    }

    if (roles.includes("estoquista")) {
      const stockDefaults = ["produtos", "estoque", "fornecedores"];
      if (stockDefaults.includes(module)) return true;
    }

    return permissions.includes(module);
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setSession(null);
    setRoles([]);
    setPermissions([]);
    setCompanyModules([]);
    setProfile(null);
    window.location.href = import.meta.env.BASE_URL + 'login';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, permissions, companyModules, profile, hasRole, hasPermission, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
