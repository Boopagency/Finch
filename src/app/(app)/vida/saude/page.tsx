import { PageHeader } from "@/components/ui/page-header";
import { BodyForm } from "@/features/training/components/body-form";
import { BodyLogList } from "@/features/training/components/body-log-list";
import { getBodyLogs } from "@/features/training/server/queries";
import { formatKg, formatSleep } from "@/features/training/training";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Saúde" };

export default async function HealthPage() {
  await requireViewer();
  const logs = await getBodyLogs();
  const weights = logs.filter((l) => l.weight_g).slice(0, 30).reverse();
  const sleeps = logs.filter((l) => l.sleep_min != null).slice(0, 7);
  const avgSleep = sleeps.length ? Math.round(sleeps.reduce((n, l) => n + l.sleep_min!, 0) / sleeps.length) : null;
  const min = Math.min(...weights.map((w) => w.weight_g!));
  const max = Math.max(...weights.map((w) => w.weight_g!));
  const span = Math.max(1000, max - min);
  const pts = weights.map((w, i) => `${weights.length === 1 ? 50 : (i / (weights.length - 1)) * 100},${36 - ((w.weight_g! - min) / span) * 32}`).join(" ");
  const delta = weights.length > 1 ? weights.at(-1)!.weight_g! - weights[0].weight_g! : 0;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Saúde" meta="só você vê" />

      <div className="grid grid-cols-2 gap-3">
        <section aria-label="Peso" className="rounded-[22px] bg-surface p-4">
          <span className="text-[13px] font-semibold text-ink-3">Peso</span>
          <p className="tabular font-display text-[28px] font-bold leading-tight">{weights.length ? formatKg(weights.at(-1)!.weight_g!) : "—"}</p>
          {weights.length > 1 && (
            <>
              <svg viewBox="0 0 100 40" className="mt-2 h-12 w-full" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={pts} fill="none" stroke="var(--cobalt)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
              </svg>
              <p className="text-[12px] text-ink-3">{delta === 0 ? "estável" : `${delta > 0 ? "+" : "−"}${formatKg(Math.abs(delta))}`} em {weights.length} registros</p>
            </>
          )}
        </section>
        <section aria-label="Sono" className="rounded-[22px] bg-surface p-4">
          <span className="text-[13px] font-semibold text-ink-3">Sono médio</span>
          <p className="tabular font-display text-[28px] font-bold leading-tight">{avgSleep != null ? formatSleep(avgSleep) : "—"}</p>
          {sleeps.length > 0 && <p className="mt-1 text-[12px] text-ink-3">últimas {sleeps.length} noites</p>}
        </section>
      </div>

      <section aria-labelledby="registrar" className="rounded-[22px] bg-surface p-4">
        <h2 id="registrar" className="mb-4 text-[15px] font-semibold">Registrar</h2>
        <BodyForm />
      </section>

      <BodyLogList logs={logs} />
      <p className="px-1 text-[13px] text-ink-3">Dados de saúde ficam só no seu espaço pessoal e nunca vão em notificações.</p>
    </main>
  );
}
