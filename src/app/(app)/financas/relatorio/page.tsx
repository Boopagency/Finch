import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { addMonths, brl } from "@/features/finance/money";
import { getReport } from "@/features/finance/server/report-queries";
import { todayFor } from "@/features/health/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Relatório" };

const label = (m: string, opts: Intl.DateTimeFormatOptions) => new Date(`${m}T12:00:00Z`).toLocaleDateString("pt-BR", { ...opts, timeZone: "UTC" }).replace(".", "");

export default async function ReportPage({ searchParams }: PageProps<"/financas/relatorio">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : `${todayFor(viewer).slice(0, 7)}-01`;
  const r = await getReport(month);
  const max = Math.max(1, ...r.series.flatMap((s) => [s.income, s.expense]));
  const cur = r.series.at(-1)!;
  const topCat = Math.max(1, ...r.categories.map((c) => Math.max(c.total, c.previous)));

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Relatório" meta="só realizado" />
      <div className="flex items-center justify-between">
        <Link prefetch href={`/financas/relatorio?m=${addMonths(month, -1).slice(0, 7)}`} aria-label="Mês anterior" className="grid size-11 place-items-center rounded-full bg-surface"><ChevronLeft className="size-5" /></Link>
        <span className="text-[15px] font-bold first-letter:uppercase">{label(month, { month: "long", year: "numeric" })}</span>
        <Link prefetch href={`/financas/relatorio?m=${addMonths(month, 1).slice(0, 7)}`} aria-label="Próximo mês" className="grid size-11 place-items-center rounded-full bg-surface"><ChevronRight className="size-5" /></Link>
      </div>

      <section aria-label="Resultado do mês" className="grid grid-cols-3 gap-2">
        <div className="rounded-[20px] bg-surface p-3"><span className="block text-[12px] text-ink-3">Receitas</span><span className="tabular text-[16px] font-bold">{brl(cur.income)}</span></div>
        <div className="rounded-[20px] bg-surface p-3"><span className="block text-[12px] text-ink-3">Despesas</span><span className="tabular text-[16px] font-bold">{brl(cur.expense)}</span></div>
        <div className={`rounded-[20px] p-3 ${cur.income - cur.expense >= 0 ? "bg-frog text-on-color" : "bg-coral text-on-color"}`}><span className="block text-[12px] opacity-80">Sobrou</span><span className="tabular text-[16px] font-bold">{brl(cur.income - cur.expense)}</span></div>
      </section>

      <section aria-labelledby="seis-meses" className="rounded-[22px] bg-surface p-4">
        <h2 id="seis-meses" className="mb-4 text-[15px] font-semibold">Últimos 6 meses</h2>
        <div className="flex h-36 items-end gap-3" aria-hidden="true">
          {r.series.map((s) => (
            <div key={s.month} className="flex h-full flex-1 items-end justify-center gap-1">
              <div className="w-1/2 max-w-4 rounded-t-[6px] bg-frog" style={{ height: `${Math.max(2, (s.income / max) * 100)}%` }} />
              <div className={`w-1/2 max-w-4 rounded-t-[6px] ${s.month === month ? "bg-coral" : "bg-coral/40"}`} style={{ height: `${Math.max(2, (s.expense / max) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3">{r.series.map((s) => <span key={s.month} className={`flex-1 text-center text-[11px] ${s.month === month ? "font-bold" : "text-ink-3"}`}>{label(s.month, { month: "short" })}</span>)}</div>
        <ul className="sr-only">{r.series.map((s) => <li key={s.month}>{label(s.month, { month: "long" })}: receitas {brl(s.income)}, despesas {brl(s.expense)}</li>)}</ul>
        <p className="mt-3 flex gap-4 text-[12px] text-ink-3"><span><span className="mr-1 inline-block size-2.5 rounded-full bg-frog" />receitas</span><span><span className="mr-1 inline-block size-2.5 rounded-full bg-coral" />despesas</span></p>
      </section>

      <section aria-labelledby="por-categoria" className="rounded-[22px] bg-surface p-4">
        <h2 id="por-categoria" className="mb-3 text-[15px] font-semibold">Despesas por categoria · vs. mês anterior</h2>
        {r.categories.length === 0 ? <p className="text-[15px] text-ink-2">Nenhuma despesa realizada neste mês.</p> : (
          <ul className="flex flex-col gap-3">
            {r.categories.map((c) => (
              <li key={c.name}>
                <div className="flex items-baseline justify-between text-[15px]">
                  <span className="font-semibold">{c.name}</span>
                  <span className="tabular">
                    {brl(c.total)}
                    <span className={`ml-2 text-[12px] font-semibold ${c.delta > 0 ? "text-danger" : c.delta < 0 ? "text-success" : "text-ink-3"}`}>
                      {c.pct === null ? "novo" : c.delta === 0 ? "=" : `${c.delta > 0 ? "+" : ""}${c.pct}%`}
                    </span>
                  </span>
                </div>
                <div className="relative mt-1 h-2 rounded-full bg-surface-2">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-coral" style={{ width: `${(c.total / topCat) * 100}%` }} />
                  <div className="absolute -top-0.5 h-3 w-0.5 bg-ink" style={{ left: `${(c.previous / topCat) * 100}%` }} title="mês anterior" />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[12px] text-ink-3">O tracinho marca quanto foi no mês anterior.</p>
      </section>
      <a href={`/api/financas/csv?m=${month.slice(0, 7)}`} download className="self-start rounded-full bg-surface px-5 py-3 text-[15px] font-semibold">Exportar CSV do mês</a>
    </main>
  );
}
