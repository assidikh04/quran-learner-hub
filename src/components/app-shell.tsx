import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Users, LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const nav = [
    { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { to: "/students", label: "Élèves", icon: Users },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="px-6 py-6 border-b border-sidebar-border flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-sidebar-primary text-sidebar-primary-foreground font-arabic text-lg">ت</div>
          <div>
            <div className="font-semibold tracking-tight">Tilāwa</div>
            <div className="text-xs opacity-70 font-arabic">تلاوة</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-sidebar-accent/50"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="text-xs opacity-70 mb-2 truncate">{email}</div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm hover:text-sidebar-primary transition"
          >
            <LogOut className="h-4 w-4" /> Se déconnecter
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-8 py-8 max-w-6xl">{children}</div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}