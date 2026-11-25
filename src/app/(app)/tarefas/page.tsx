import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { addDays } from "@/features/health/habits";
import { Kanban } from "@/features/tasks/components/kanban";
import { QuickAdd } from "@/features/tasks/components/quick-add";
import { TaskList } from "@/features/tasks/components/task-list";
import { TaskSearch } from "@/features/tasks/components/task-search";
import { getTaskItems } from "@/features/tasks/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Tarefas" };

const VIEWS = [
  ["hoje", "Hoje"],
  ["proximas", "Próximas"],
  ["entrada", "Sem data"],
  ["casa", "Casa"],
  ["quadro", "Quadro"],
  ["todas", "Todas"],
] as const;
type View = (typeof VIEWS)[number][0];

export default async function TasksPage({ searchParams }: PageProps<"/tarefas">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const view: View = VIEWS.some(([v]) => v === sp.v) ? (sp.v as View) : "hoje";
  const { today, items, spaces } = await getTaskItems(viewer, 30);

  const filtered = {
    hoje: items.filter((i) => i.date && i.date <= today),
    proximas: items.filter((i) => i.date && i.date > today && i.date <= addDays(today, 14)),
    entrada: items.filter((i) => !i.date),
    casa: items.filter((i) => i.category === "casa"),
    quadro: items,
    todas: items,
  }[view];
  const openToday = items.filter((i) => i.date && i.date <= today && i.status !== "done").length;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Tarefas" meta={openToday ? `${openToday} para hoje` : "dia livre"} />
      <QuickAdd today={today} spaces={spaces} />
      <nav aria-label="Visões" className="-mx-4 flex gap-1.5 overflow-x-auto px-4">
        {VIEWS.map(([v, label]) => (
          <Link
            key={v}
            href={v === "hoje" ? "/tarefas" : `/tarefas?v=${v}`}
            aria-current={view === v ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold ${view === v ? "bg-ink text-bg" : "bg-surface text-ink-2"}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      {view === "quadro" ? (
        <Kanban items={filtered} spaces={spaces} today={today} />
      ) : view === "todas" ? (
        <TaskSearch items={filtered} spaces={spaces} today={today} />
      ) : (
        <TaskList
          items={filtered}
          spaces={spaces}
          today={today}
          group={view !== "entrada"}
          empty={{ hoje: "Nada para hoje. Aproveite.", proximas: "Nada nas próximas duas semanas.", entrada: "Nenhuma tarefa sem data.", casa: "Nenhuma rotina da casa ainda. Tente: “lavar roupa toda quarta #casa @nós”." }[view]}
        />
      )}
    </main>
  );
}
