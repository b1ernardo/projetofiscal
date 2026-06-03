import { ReactNode, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Menu, X } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { profile } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const now = new Date();
  const day = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile as drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0 transition-transform duration-200
          ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <AppSidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted md:hidden"
              onClick={() => setMobileSidebarOpen((o) => !o)}
            >
              {mobileSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <div className="hidden sm:block">
              <p className="text-sm text-muted-foreground">
                Dados de <span className="font-medium text-foreground">{day}</span> às{" "}
                <span className="font-medium text-foreground">{time}h.</span>{" "}
                <button className="text-primary hover:underline text-xs font-medium">Atualizar agora</button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <button className="relative flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1">
                4
              </span>
            </button>

            {/* User chip */}
            <div className="flex items-center gap-2 rounded-full bg-muted pl-1 pr-3 py-1 cursor-pointer hover:bg-accent transition-colors">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shadow-sm">
                {profile?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="hidden sm:block text-sm font-medium leading-none">
                {profile?.full_name?.split(" ").slice(0, 2).join(" ") || "Usuário"}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
