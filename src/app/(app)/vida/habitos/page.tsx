import { PageHeader } from "@/components/ui/page-header";
import { HabitManager } from "@/features/health/components/habit-manager";
import { getHabits } from "@/features/health/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Hábitos" };

export default async function HabitsPage() {
  const viewer = await requireViewer();
  const { habits, logs, today } = await getHabits(viewer);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader back="/vida" title="Hábitos" meta={habits.length ? `${habits.length} ativos` : undefined} />
      <HabitManager habits={habits} logs={logs} today={today} />
    </main>
  );
}
