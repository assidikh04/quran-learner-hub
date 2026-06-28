import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const GREEN = "hsl(var(--primary))";
const ACCENT = "hsl(var(--accent))";
const COLORS = ["#16a34a", "#eab308", "#94a3b8"];
const ATT_COLORS: Record<string, string> = {
  present: "#16a34a", late: "#eab308", excused: "#94a3b8", absent: "#dc2626",
};
const ATT_LABELS: Record<string, string> = {
  present: "Présent", late: "En retard", excused: "Excusé", absent: "Absent",
};

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="h-56">{children}</div>
    </div>
  );
}

export function StudentCharts({ studentId }: { studentId: string }) {
  const { data: memo } = useQuery({
    queryKey: ["chart-memo", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memorization").select("status").eq("student_id", studentId);
      if (error) throw error;
      return data;
    },
  });

  const { data: att } = useQuery({
    queryKey: ["chart-att", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance").select("status,session_date")
        .eq("student_id", studentId).order("session_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: evals } = useQuery({
    queryKey: ["chart-eval", studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evaluations").select("score,eval_date,eval_type")
        .eq("student_id", studentId).order("eval_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Memorization pie data
  const memoData = (() => {
    const counts = { memorized: 0, in_progress: 0, review: 0 } as Record<string, number>;
    (memo ?? []).forEach((m) => { counts[m.status] = (counts[m.status] ?? 0) + 1; });
    return [
      { name: "Mémorisée", value: counts.memorized },
      { name: "En cours", value: counts.in_progress },
      { name: "À réviser", value: counts.review },
    ];
  })();
  const memoTotal = memoData.reduce((s, d) => s + d.value, 0);

  // Attendance counts
  const attData = (() => {
    const counts: Record<string, number> = { present: 0, late: 0, excused: 0, absent: 0 };
    (att ?? []).forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return Object.keys(counts).map((k) => ({
      name: ATT_LABELS[k], value: counts[k], fill: ATT_COLORS[k],
    }));
  })();
  const attTotal = (att ?? []).length;
  const presentRate = attTotal
    ? Math.round(((att ?? []).filter((a) => a.status === "present" || a.status === "late").length / attTotal) * 100)
    : 0;

  // Evaluations line
  const evalData = (evals ?? [])
    .filter((e) => e.score !== null)
    .map((e) => ({
      date: new Date(e.eval_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      score: Number(e.score),
    }));
  const avg = evalData.length
    ? (evalData.reduce((s, d) => s + d.score, 0) / evalData.length).toFixed(1)
    : null;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Mémorisation" subtitle={`${memoTotal} sourate${memoTotal > 1 ? "s" : ""} suivie${memoTotal > 1 ? "s" : ""}`}>
        {memoTotal === 0 ? (
          <Empty>Aucune donnée</Empty>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={memoData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                {memoData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Présence" subtitle={attTotal ? `${presentRate}% d'assiduité (${attTotal} séances)` : "0 séance"}>
        {attTotal === 0 ? (
          <Empty>Aucune donnée</Empty>
        ) : (
          <ResponsiveContainer>
            <BarChart data={attData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis allowDecimals={false} fontSize={11} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Évaluations" subtitle={avg ? `Moyenne : ${avg}/20` : "Aucune note"}>
        {evalData.length === 0 ? (
          <Empty>Aucune donnée</Empty>
        ) : (
          <ResponsiveContainer>
            <LineChart data={evalData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis domain={[0, 20]} fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke={GREEN} strokeWidth={2} dot={{ r: 3, fill: ACCENT }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="h-full flex items-center justify-center text-xs text-muted-foreground">{children}</div>;
}