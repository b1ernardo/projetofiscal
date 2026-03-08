import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AppRole = "super_admin" | "admin" | "operador_caixa" | "estoquista";

interface User {
  id: string;
  email: string;
  full_name?: string;
  permissions?: string[];
  company_modules?: string[];
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
        const apiBase = (import.meta.env.VITE_API_URL || '/projetofiscal/api').replace(/\/$/, '');
        const response = await fetch(`${apiBase}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setSession({ access_token: token });
          if (data.user.roles) setRoles(Array.isArray(data.user.roles) ? data.user.roles : [data.user.roles]);
          if (data.user.permissions) setPermissions(Array.isArray(data.user.permissions) ? data.user.permissions : []);
          if (data.user.company_modules) setCompanyModules(Array.isArray(data.user.company_modules) ? data.user.company_modules : []);
          if (data.user.profile) setProfile(data.user.profile);
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
      'finances': 'finances',
      'fiscal': 'fiscal',
    };

    const targetModule = moduleMappings[module];
    if (targetModule && !companyModules.includes(targetModule)) {
      return false;
    }

    if (roles.includes("admin")) return true;
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
