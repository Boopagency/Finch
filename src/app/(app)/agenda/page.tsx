import { PageHeader } from "@/components/ui/page-header";
import { AgendaView } from "@/features/agenda/components/agenda-view";
import { monthGrid } from "@/features/agenda/expand";
import { getAgenda } from "@/features/agenda/server/queries";
import { addDays } from "@/features/health/habits";
import { todayFor } from "@/features/health/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Agenda" };

export default async function AgendaPage({ searchParams }: PageProps<"/agenda">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const today = todayFor(viewer);
  const view = sp.v === "semana" || sp.v === "mes" ? sp.v : "dia";
  const date = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;
  const weekStart = addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
  const grid = monthGrid(date);
  const [from, to] = view === "mes" ? [grid[0]![0]!, grid.at(-1)!.at(-1)!] : [weekStart, addDays(weekStart, 6)];
  const agenda = await getAgenda(viewer, from, to);
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2 px-gutter pt-safe">
      <PageHeader title="Agenda" meta={label} />
      <AgendaView view={view} date={date} today={agenda.today} events={agenda.events} tasks={agenda.tasks} spaces={agenda.spaces} />
    </main>
  );
}
