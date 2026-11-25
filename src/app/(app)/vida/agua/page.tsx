import { PageHeader } from "@/components/ui/page-header";
import { WaterLog } from "@/features/health/components/water-log";
import { WaterQuick } from "@/features/health/components/water-quick";
import { WaterSettingsForm } from "@/features/health/components/water-settings";
import { getWaterToday, getWaterWeek } from "@/features/health/server/queries";
import { formatWater } from "@/features/health/water";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Água" };

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" }).replace(".", "");

export default async function WaterPage() {
  const viewer = await requireViewer();
  const [water, week] = await Promise.all([getWaterToday(viewer), getWaterWeek(viewer)]);
  const goal = water.settings.water_goal_ml;
  const max = Math.max(goal, ...week.map((d) => d.total));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Água" meta={`meta ${formatWater(goal)}`} />
      <WaterQuick serverLogs={water.logs} goal={goal} presets={water.settings.water_presets} />

      <section aria-labelledby="semana" className="rounded-[22px] bg-surface p-4">
        <h2 id="semana" className="mb-4 text-[15px] font-semibold">Últimos 7 dias</h2>
        <div className="relative flex h-36 items-end gap-2">
          <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-ink-3" style={{ bottom: `${(goal / max) * 100}%` }} aria-hidden="true" />
          {week.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className={`w-full max-w-9 rounded-t-[8px] ${d.total >= goal ? "bg-cobalt" : "bg-cobalt/35"}`}
                style={{ height: `${Math.max(2, (d.total / max) * 100)}%` }}
                title={`${formatWater(d.total)}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          {week.map((d) => (
            <span key={d.date} className={`flex-1 text-center text-[11px] ${d.date === water.today ? "font-bold text-ink" : "text-ink-3"}`}>
              {dayLabel(d.date)}
            </span>
          ))}
        </div>
        <p className="sr-only">
          {week.map((d) => `${dayLabel(d.date)}: ${formatWater(d.total)}`).join("; ")}
        </p>
      </section>

      <WaterLog serverLogs={water.logs} />

      <section aria-labelledby="ajustes-agua" className="rounded-[22px] bg-surface p-4">
        <h2 id="ajustes-agua" className="mb-4 text-[15px] font-semibold">Meta e lembretes</h2>
        <WaterSettingsForm settings={water.settings} />
      </section>
    </main>
  );
}
