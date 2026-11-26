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
  // mês anterior, atual e próximo: trocar dia/semana/mês ali dentro não volta ao servidor
  const from = [monthGrid(addDays(`${date.slice(0, 7)}-01`, -1))[0]![0]!, weekStart].sort()[0]!;
  const to = [monthGrid(addDays(`${date.slice(0, 7)}-28`, 7)).at(-1)!.at(-1)!, addDays(weekStart, 6)].sort().at(-1)!;
  const agenda = await getAgenda(viewer, from, to);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2 px-gutter pt-safe">
      <PageHeader title="Agenda" />
      <AgendaView view={view} date={date} from={from} to={to} today={agenda.today} events={agenda.events} tasks={agenda.tasks} spaces={agenda.spaces} />
    </main>
  );
}
