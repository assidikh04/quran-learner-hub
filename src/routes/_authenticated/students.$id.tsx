import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, UserCircle2 } from "lucide-react";
import { toast } from "sonner";
import { SURAHS } from "@/lib/quran-surahs";

export const Route = createFileRoute("/_authenticated/students/$id")({
  component: StudentDetail,
});

function StudentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: student } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("students").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const deleteStudent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Élève supprimé");
      qc.invalidateQueries({ queryKey: ["students"] });
      navigate({ to: "/students" });
    },
  });

  if (!student) return <div className="text-muted-foreground">Chargement...</div>;

  return (
    <div>
      <Link to="/students" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4">
        <ArrowLeft className="h-4 w-4" /> Retour aux élèves
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-secondary text-primary flex items-center justify-center">
            <UserCircle2 className="h-9 w-9" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{student.full_name}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              {student.level ?? "Niveau non défini"}{student.age ? ` · ${student.age} ans` : ""}
            </div>
            {student.notes && <div className="text-sm mt-2 max-w-xl text-foreground/80">{student.notes}</div>}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (confirm("Supprimer cet élève et toutes ses données ?")) deleteStudent.mutate();
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Supprimer
        </Button>
      </div>

      <Tabs defaultValue="memorization">
        <TabsList>
          <TabsTrigger value="memorization">Mémorisation</TabsTrigger>
          <TabsTrigger value="attendance">Présence</TabsTrigger>
          <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
          <TabsTrigger value="assignments">Devoirs</TabsTrigger>
        </TabsList>
        <TabsContent value="memorization" className="mt-6"><MemorizationTab studentId={id} teacherId={student.teacher_id} /></TabsContent>
        <TabsContent value="attendance" className="mt-6"><AttendanceTab studentId={id} teacherId={student.teacher_id} /></TabsContent>
        <TabsContent value="evaluations" className="mt-6"><EvaluationsTab studentId={id} teacherId={student.teacher_id} /></TabsContent>
        <TabsContent value="assignments" className="mt-6"><AssignmentsTab studentId={id} teacherId={student.teacher_id} /></TabsContent>
      </Tabs>
    </div>
  );
}

function SectionCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ---------------- Memorization ---------------- */
function MemorizationTab({ studentId, teacherId }: { studentId: string; teacherId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [surahNum, setSurahNum] = useState("");
  const [verseFrom, setVerseFrom] = useState("");
  const [verseTo, setVerseTo] = useState("");
  const [status, setStatus] = useState<"in_progress" | "memorized" | "review">("in_progress");
  const [notes, setNotes] = useState("");

  const { data } = useQuery({
    queryKey: ["memorization", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("memorization").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const surah = SURAHS.find((s) => s.number === parseInt(surahNum));
      if (!surah) throw new Error("Sourate invalide");
      const { error } = await supabase.from("memorization").insert({
        student_id: studentId,
        teacher_id: teacherId,
        surah_number: surah.number,
        surah_name: surah.name,
        verse_from: verseFrom ? parseInt(verseFrom) : null,
        verse_to: verseTo ? parseInt(verseTo) : null,
        status,
        date_completed: status === "memorized" ? new Date().toISOString().slice(0, 10) : null,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrée ajoutée");
      setSurahNum(""); setVerseFrom(""); setVerseTo(""); setNotes(""); setStatus("in_progress");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["memorization", studentId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ rowId, newStatus }: { rowId: string; newStatus: string }) => {
      const { error } = await supabase.from("memorization").update({
        status: newStatus,
        date_completed: newStatus === "memorized" ? new Date().toISOString().slice(0, 10) : null,
      }).eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["memorization", studentId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("memorization").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memorization", studentId] }),
  });

  const statusLabel = { in_progress: "En cours", memorized: "Mémorisée", review: "À réviser" } as const;
  const statusVariant = { in_progress: "secondary", memorized: "default", review: "outline" } as const;

  return (
    <SectionCard
      title="Progression de mémorisation"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvelle sourate</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-4 mt-2">
              <div>
                <Label>Sourate *</Label>
                <Select value={surahNum} onValueChange={setSurahNum} required>
                  <SelectTrigger><SelectValue placeholder="Choisir une sourate" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {SURAHS.map((s) => (
                      <SelectItem key={s.number} value={String(s.number)}>
                        {s.number}. {s.name} <span className="font-arabic ml-1">{s.arabic}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Verset (de)</Label><Input type="number" min={1} value={verseFrom} onChange={(e) => setVerseFrom(e.target.value)} /></div>
                <div><Label>Verset (à)</Label><Input type="number" min={1} value={verseTo} onChange={(e) => setVerseTo(e.target.value)} /></div>
              </div>
              <div>
                <Label>Statut</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="memorized">Mémorisée</SelectItem>
                    <SelectItem value="review">À réviser</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {data && data.length > 0 ? (
        <div className="divide-y divide-border">
          {data.map((m) => {
            const surah = SURAHS.find((s) => s.number === m.surah_number);
            return (
              <div key={m.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.surah_number}. {m.surah_name}</span>
                    {surah && <span className="font-arabic text-accent">{surah.arabic}</span>}
                    {m.verse_from && <span className="text-xs text-muted-foreground">v.{m.verse_from}{m.verse_to ? `-${m.verse_to}` : ""}</span>}
                  </div>
                  {m.notes && <div className="text-xs text-muted-foreground mt-1">{m.notes}</div>}
                </div>
                <Select value={m.status} onValueChange={(v) => updateStatus.mutate({ rowId: m.id, newStatus: v })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="memorized">Mémorisée</SelectItem>
                    <SelectItem value="review">À réviser</SelectItem>
                  </SelectContent>
                </Select>
                <Badge variant={statusVariant[m.status as keyof typeof statusVariant]}>{statusLabel[m.status as keyof typeof statusLabel]}</Badge>
                <button onClick={() => remove.mutate(m.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune entrée. Commencez par ajouter une sourate.</p>
      )}
    </SectionCard>
  );
}

/* ---------------- Attendance ---------------- */
function AttendanceTab({ studentId, teacherId }: { studentId: string; teacherId: string }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<"present" | "absent" | "late" | "excused">("present");
  const [notes, setNotes] = useState("");

  const { data } = useQuery({
    queryKey: ["attendance", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("attendance").select("*").eq("student_id", studentId).order("session_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance").insert({
        student_id: studentId, teacher_id: teacherId, session_date: date, status, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Présence enregistrée");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["attendance", studentId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("attendance").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attendance", studentId] }),
  });

  const statusLabel = { present: "Présent", absent: "Absent", late: "En retard", excused: "Excusé" } as const;
  const statusVariant = { present: "default", absent: "destructive", late: "outline", excused: "secondary" } as const;

  return (
    <SectionCard title="Présence et assiduité">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid sm:grid-cols-4 gap-3 mb-6 items-end">
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div>
          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="present">Présent</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">En retard</SelectItem>
              <SelectItem value="excused">Excusé</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} /></div>
        <Button type="submit" disabled={add.isPending}>Enregistrer</Button>
      </form>
      {data && data.length > 0 ? (
        <div className="divide-y divide-border">
          {data.map((a) => (
            <div key={a.id} className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{new Date(a.session_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
                {a.notes && <div className="text-xs text-muted-foreground">{a.notes}</div>}
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant[a.status as keyof typeof statusVariant]}>{statusLabel[a.status as keyof typeof statusLabel]}</Badge>
                <button onClick={() => remove.mutate(a.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune présence enregistrée.</p>
      )}
    </SectionCard>
  );
}

/* ---------------- Evaluations ---------------- */
function EvaluationsTab({ studentId, teacherId }: { studentId: string; teacherId: string }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<"tajwid" | "recitation" | "memorization_test" | "tafsir">("tajwid");
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");

  const { data } = useQuery({
    queryKey: ["evaluations", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("evaluations").select("*").eq("student_id", studentId).order("eval_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evaluations").insert({
        student_id: studentId, teacher_id: teacherId, eval_date: date, eval_type: type,
        score: score ? parseFloat(score) : null, notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Évaluation ajoutée");
      setScore(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["evaluations", studentId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const remove = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("evaluations").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evaluations", studentId] }),
  });

  const typeLabel = { tajwid: "Tajwid", recitation: "Récitation", memorization_test: "Test mémorisation", tafsir: "Tafsir" } as const;

  return (
    <SectionCard title="Évaluations">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="grid sm:grid-cols-5 gap-3 mb-6 items-end">
        <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div>
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tajwid">Tajwid</SelectItem>
              <SelectItem value="recitation">Récitation</SelectItem>
              <SelectItem value="memorization_test">Test mémorisation</SelectItem>
              <SelectItem value="tafsir">Tafsir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Note /20</Label><Input type="number" min={0} max={20} step={0.5} value={score} onChange={(e) => setScore(e.target.value)} /></div>
        <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} /></div>
        <Button type="submit" disabled={add.isPending}>Ajouter</Button>
      </form>
      {data && data.length > 0 ? (
        <div className="divide-y divide-border">
          {data.map((ev) => (
            <div key={ev.id} className="py-3 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{typeLabel[ev.eval_type as keyof typeof typeLabel]}</span>
                  <span className="text-sm text-muted-foreground">{new Date(ev.eval_date).toLocaleDateString("fr-FR")}</span>
                </div>
                {ev.notes && <div className="text-xs text-muted-foreground mt-1">{ev.notes}</div>}
              </div>
              {ev.score !== null && (
                <div className="text-xl font-bold tabular-nums" style={{ color: (ev.score ?? 0) >= 14 ? "var(--accent)" : (ev.score ?? 0) >= 10 ? "var(--gold)" : "var(--destructive)" }}>
                  {ev.score}<span className="text-xs text-muted-foreground font-normal">/20</span>
                </div>
              )}
              <button onClick={() => remove.mutate(ev.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucune évaluation.</p>
      )}
    </SectionCard>
  );
}

/* ---------------- Assignments ---------------- */
function AssignmentsTab({ studentId, teacherId }: { studentId: string; teacherId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const { data } = useQuery({
    queryKey: ["assignments", studentId],
    queryFn: async () => {
      const { data, error } = await supabase.from("assignments").select("*").eq("student_id", studentId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("assignments").insert({
        student_id: studentId, teacher_id: teacherId, title: title.trim(),
        description: description.trim() || null, due_date: dueDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Devoir ajouté");
      setTitle(""); setDescription(""); setDueDate("");
      qc.invalidateQueries({ queryKey: ["assignments", studentId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const toggle = useMutation({
    mutationFn: async ({ rowId, newStatus }: { rowId: string; newStatus: string }) => {
      const { error } = await supabase.from("assignments").update({ status: newStatus }).eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments", studentId] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });

  const remove = useMutation({
    mutationFn: async (rowId: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", rowId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments", studentId] }),
  });

  return (
    <SectionCard title="Devoirs et révisions">
      <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3 mb-6">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2"><Label>Titre *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} placeholder="Ex: Réviser Sourate Al-Mulk" /></div>
          <div><Label>Échéance</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        </div>
        <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={2} /></div>
        <Button type="submit" disabled={add.isPending}><Plus className="h-4 w-4 mr-1" /> Ajouter le devoir</Button>
      </form>
      {data && data.length > 0 ? (
        <div className="space-y-2">
          {data.map((a) => (
            <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <input
                type="checkbox"
                checked={a.status === "done"}
                onChange={(e) => toggle.mutate({ rowId: a.id, newStatus: e.target.checked ? "done" : "pending" })}
                className="mt-1 h-4 w-4 accent-[var(--primary)]"
              />
              <div className="flex-1">
                <div className={`font-medium ${a.status === "done" ? "line-through text-muted-foreground" : ""}`}>{a.title}</div>
                {a.description && <div className="text-sm text-muted-foreground mt-0.5">{a.description}</div>}
                {a.due_date && <div className="text-xs text-muted-foreground mt-1">Échéance : {new Date(a.due_date).toLocaleDateString("fr-FR")}</div>}
              </div>
              <button onClick={() => remove.mutate(a.id)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucun devoir.</p>
      )}
    </SectionCard>
  );
}