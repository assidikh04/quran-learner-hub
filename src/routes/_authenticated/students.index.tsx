import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ArrowRight, UserCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/students/")({
  component: StudentsList,
});

function StudentsList() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", age: "", level: "", notes: "" });

  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const { error } = await supabase.from("students").insert({
        teacher_id: u.user.id,
        full_name: form.full_name.trim(),
        age: form.age ? parseInt(form.age) : null,
        level: form.level.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Élève ajouté");
      setForm({ full_name: "", age: "", level: "", notes: "" });
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["students"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["recent-students"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="font-arabic text-accent">الطلاب</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Élèves</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Nouvel élève</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un élève</DialogTitle></DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
              className="space-y-4 mt-2"
            >
              <div>
                <Label htmlFor="name">Nom complet *</Label>
                <Input id="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required maxLength={100} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="age">Âge</Label>
                  <Input id="age" type="number" min={3} max={99} value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="level">Niveau</Label>
                  <Input id="level" placeholder="ex: Juz 30" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} maxLength={50} />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={500} />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "..." : "Ajouter"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Chargement...</div>
      ) : students && students.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => (
            <Link
              key={s.id}
              to="/students/$id"
              params={{ id: s.id }}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] hover:border-primary/40 transition group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-12 w-12 rounded-full bg-secondary text-primary flex items-center justify-center">
                  <UserCircle2 className="h-7 w-7" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
              </div>
              <div className="font-semibold">{s.full_name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {s.level ?? "Niveau non défini"}{s.age ? ` · ${s.age} ans` : ""}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-muted-foreground mb-4">Aucun élève pour le moment</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" /> Ajouter votre premier élève</Button>
        </div>
      )}
    </div>
  );
}