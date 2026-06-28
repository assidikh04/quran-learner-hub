import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { BookOpen, CalendarCheck, GraduationCap, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tilāwa — Suivi des élèves du Coran" },
      { name: "description", content: "Tableau de bord pour enseignants : mémorisation, présence, évaluations tajwid et devoirs." },
      { property: "og:title", content: "Tilāwa — Suivi des élèves du Coran" },
      { property: "og:description", content: "Tableau de bord pour enseignants du Coran." },
    ],
  }),
  component: Index,
});

function Index() {
  const features = [
    { icon: BookOpen, title: "Mémorisation", ar: "الحفظ", desc: "Suivez les sourates apprises, en cours et à réviser pour chaque élève." },
    { icon: CalendarCheck, title: "Présence", ar: "الحضور", desc: "Marquez l'assiduité à chaque séance et visualisez les tendances." },
    { icon: GraduationCap, title: "Évaluations", ar: "التقييم", desc: "Notez le tajwid, la récitation et les tests de mémorisation." },
    { icon: ClipboardList, title: "Devoirs", ar: "الواجبات", desc: "Assignez les révisions hebdomadaires à chaque élève." },
  ];
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-sm sticky top-0 z-10 bg-background/80">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center bg-primary text-primary-foreground font-arabic text-lg">ت</div>
            <span className="font-semibold tracking-tight text-lg">Tilāwa</span>
          </div>
          <Link to="/auth" className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition">
            Se connecter
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-20 pb-16 text-center">
        <p className="font-arabic text-2xl text-accent mb-4">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-3xl mx-auto">
          Suivez l'apprentissage du Coran de vos élèves
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Une application pensée pour les enseignants du Coran : mémorisation, présence, évaluations tajwid et devoirs réunis dans un seul tableau de bord.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link to="/auth" className="rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium shadow-[var(--shadow-soft)] hover:opacity-90 transition">
            Commencer gratuitement
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-secondary text-primary flex items-center justify-center">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="font-arabic text-accent">{f.ar}</span>
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-sm text-muted-foreground">
        Tilāwa · Un outil au service de l'enseignement du Coran
      </footer>
    </div>
  );
}

