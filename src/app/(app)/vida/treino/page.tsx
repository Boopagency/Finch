import { PageHeader } from "@/components/ui/page-header";
import { TrainingHome } from "@/features/training/components/training-home";
import { getTraining } from "@/features/training/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Treino" };

export default async function TrainingPage() {
  const viewer = await requireViewer();
  const t = await getTraining(viewer);
  const week = t.history.filter((s) => s.finished_at && Date.parse(s.logged_at) > Date.parse(`${t.today}T00:00:00Z`) - 6 * 864e5).length;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader back="/vida" title="Treino" meta={week ? `${week} nos últimos 7 dias` : undefined} />
      <TrainingHome workouts={t.workouts} exercises={t.exercises} open={t.open} history={t.history} prs={t.prs} />
    </main>
  );
}
