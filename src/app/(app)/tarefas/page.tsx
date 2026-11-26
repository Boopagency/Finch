import { PageHeader } from "@/components/ui/page-header";
import { TaskViews } from "@/features/tasks/components/task-views";
import { VIEWS, type View } from "@/features/tasks/views";
import { getTaskItems } from "@/features/tasks/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Tarefas" };

export default async function TasksPage({ searchParams }: PageProps<"/tarefas">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const view: View = VIEWS.some(([v]) => v === sp.v) ? (sp.v as View) : "hoje";
  const { today, items, spaces } = await getTaskItems(viewer, 30);

  const openToday = items.filter((i) => i.date && i.date <= today && i.status !== "done").length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader back="/vida" title="Tarefas" meta={openToday ? `${openToday} para hoje` : "dia livre"} />
      <TaskViews initial={view} items={items} spaces={spaces} today={today} />
    </main>
  );
}
