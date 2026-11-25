import { PageHeader } from "@/components/ui/page-header";
import { GoalsView } from "@/features/couple/components/goals-view";
import { getGoals } from "@/features/couple/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Metas" };

export default async function GoalsPage() {
  const viewer = await requireViewer();
  const { goals, spaces, today } = await getGoals(viewer);
  const open = goals.filter((g) => !g.done_at).length;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Metas" meta={goals.length ? `${open} em andamento` : undefined} />
      <GoalsView goals={goals} spaces={spaces} today={today} />
    </main>
  );
}
