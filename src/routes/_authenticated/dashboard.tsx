import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, CalendarCheck, ClipboardList, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [students, mem, att, asg] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("memorization").select("id", { count: "exact", head: true }).eq("status", "memorized"),
        supabase.from("attendance").select("id", { count: "exact", head: true })
          .gte("session_date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
        supabase.from("assignments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        students: students.count ?? 0,
        surahs: mem.count ?? 0,
        sessions: att.count ?? 0,
        pending: asg.count ?? 0,
      };
    },
  });

  const { data: recentStudents } = useQuery({
    queryKey: ["recent-students"],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const cards = [
    { label: "Élèves", value: stats?.students ?? 0, icon: Users, ar: "الطلاب" },
    { label: "Sourates mémorisées", value: stats?.surahs ?? 0, icon: BookOpen, ar: "السور المحفوظة" },
    { label: "Présences (7j)", value: stats?.sessions ?? 0, icon: CalendarCheck, ar: "الحضور" },
    { label: "Devoirs en cours", value: stats?.pending ?? 0, icon: ClipboardList, ar: "الواجبات" },
  ];

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="font-arabic text-accent">السلام عليكم</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Tableau de bord</h1>
        </div>
        <Link to="/students" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
          Gérer les élèves <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between">
              <div className="h-9 w-9 rounded-lg bg-secondary text-primary flex items-center justify-center">
                <c.icon className="h-4 w-4" />
              </div>
              <span className="font-arabic text-xs text-muted-foreground">{c.ar}</span>
            </div>
            <div className="mt-4 text-3xl font-bold tracking-tight">{c.value}</div>
            <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <h2 className="font-semibold text-lg mb-4">Élèves récents</h2>
        {recentStudents && recentStudents.length > 0 ? (
          <div className="divide-y divide-border">
            {recentStudents.map((s) => (
              <Link
                key={s.id}
                to="/students/$id"
                params={{ id: s.id }}
                className="flex items-center justify-between py-3 hover:bg-muted/40 rounded px-2 -mx-2 transition"
              >
                <div>
                  <div className="font-medium">{s.full_name}</div>
                  <div className="text-xs text-muted-foreground">{s.level ?? "Niveau non défini"}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Aucun élève pour le moment</p>
            <Link to="/students" className="text-primary font-medium hover:underline">
              Ajouter votre premier élève →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}