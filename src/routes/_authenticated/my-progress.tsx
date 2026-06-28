import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserCircle2, BookOpen } from "lucide-react";
import { StudentCharts } from "@/components/student-charts";
import { SURAHS } from "@/lib/quran-surahs";

export const Route = createFileRoute("/_authenticated/my-progress")({
  component: MyProgress,
});

function MyProgress() {
  const { data: students, isLoading } = useQuery({
    queryKey: ["my-linked-students"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("linked_user_id", u.user.id)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <div className="mb-8">
        <p className="font-arabic text-accent">تقدمي</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Ma progression</h1>
        <p className="text-muted-foreground text-sm mt-2">
          Suivez votre mémorisation, votre assiduité et vos évaluations.
        </p>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : students && students.length > 0 ? (
        <div className="space-y-10">
          {students.map((s) => (
            <StudentBlock key={s.id} studentId={s.id} name={s.full_name} level={s.level} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground">
            Aucune fiche élève n'est encore liée à votre compte. Demandez à votre enseignant de vous donner accès avec votre email.
          </p>
        </div>
      )}
    </div>
  );
}

function StudentBlock({ studentId, name, level }: { studentId: string; name: string; level: string | null }) {
  const { data: memo } = useQuery({
    queryKey: ["my-memo", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorization").select("*").eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["my-assign", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments").select("*").eq("student_id", studentId)
        .order("due_date", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-full bg-secondary text-primary flex items-center justify-center">
          <UserCircle2 className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">{name}</h2>
          {level && <div className="text-xs text-muted-foreground">{level}</div>}
        </div>
      </div>

      <StudentCharts studentId={studentId} />

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="h-4 w-4" /> Sourates récentes</h3>
          {memo && memo.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {memo.slice(0, 6).map((m) => {
                const surah = SURAHS.find((s) => s.number === m.surah_number);
                const label = { memorized: "Mémorisée", in_progress: "En cours", review: "À réviser" }[m.status as string] ?? m.status;
                return (
                  <li key={m.id} className="py-2 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{m.surah_number}. {m.surah_name}</span>
                      {surah && <span className="font-arabic text-accent ml-2">{surah.arabic}</span>}
                      {m.verse_from && <span className="text-xs text-muted-foreground ml-2">v.{m.verse_from}{m.verse_to ? `-${m.verse_to}` : ""}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune sourate enregistrée.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <h3 className="font-semibold mb-3">Devoirs</h3>
          {assignments && assignments.length > 0 ? (
            <ul className="divide-y divide-border text-sm">
              {assignments.slice(0, 6).map((a) => (
                <li key={a.id} className="py-2 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    {a.description && <div className="text-xs text-muted-foreground">{a.description}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {a.due_date && <div>{new Date(a.due_date).toLocaleDateString("fr-FR")}</div>}
                    <div className="capitalize">{a.status}</div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun devoir.</p>
          )}
        </div>
      </div>
    </section>
  );
}