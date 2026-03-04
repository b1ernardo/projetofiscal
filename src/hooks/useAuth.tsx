import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AppRole = "admin" | "operador_caixa" | "estoquista";

interface User {
  id: string;
  email: string;
  full_name?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  roles: AppRole[];
  permissions: string[];
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
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          setSession({ access_token: token });
          if (data.user.roles) setRoles(data.user.roles);
          if (data.user.permissions) setPermissions(data.user.permissions);
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
    if (roles.includes("admin")) return true;
    return permissions.includes(module);
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setSession(null);
    setRoles([]);
    setPermissions([]);
    setProfile(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, permissions, profile, hasRole, hasPermission, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
