"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, MapPin, Plus, Repeat2 } from "lucide-react";
import Link from "next/link";
import { Segmented } from "@/components/ui/segmented";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { addDays } from "@/features/health/habits";
import { TaskList } from "@/features/tasks/components/task-list";
import type { Space, TaskItem } from "@/features/tasks/server/queries";
import { conflicts, monthGrid, type EventInstance, type EventRow } from "../expand";
import { createEventQuick } from "../server/actions";
import { EventSheet } from "./event-sheet";

type View = "dia" | "semana" | "mes";
const TONE: Record<string, string> = {
  geral: "bg-cobalt", saude: "bg-frog", trabalho: "bg-ink", casa: "bg-tangerine", nos: "bg-lavender", viagem: "bg-sunflower", contas: "bg-coral", treino: "bg-frog",
};
const WD = ["S", "T", "Q", "Q", "S", "S", "D"];
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { ...o, timeZone: "UTC" });
const href = (v: View, d: string) => `/agenda?v=${v}&d=${d}`;

export function AgendaView({ view, date, today, events, tasks, spaces }: { view: View; date: string; today: string; events: EventInstance[]; tasks: TaskItem[]; spaces: Space[] }) {
  const [sheet, setSheet] = useState<{ event?: EventRow; date: string } | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const clash = conflicts(events.map((e) => ({ key: e.key, date: e.date, start: e.start, end: e.end })));
  const step = view === "dia" ? 1 : view === "semana" ? 7 : 0;
  const prev = view === "mes" ? `${addDays(`${date.slice(0, 7)}-01`, -1).slice(0, 7)}-01` : addDays(date, -step);
  const next = view === "mes" ? `${addDays(`${date.slice(0, 7)}-28`, 7).slice(0, 7)}-01` : addDays(date, step);
  const weekStart = addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const count = (d: string) => events.filter((e) => e.date === d).length + tasks.filter((t) => t.date === d && t.status !== "done").length;

  const dayBlock = (d: string, compact = false) => {
    const evs = events.filter((e) => e.date === d);
    const ts = tasks.filter((t) => t.date === d);
    if (!evs.length && !ts.length) return compact ? null : <p className="px-2 py-6 text-center text-[15px] text-ink-3">Nada marcado. Dia livre.</p>;
    return (
      <div className="flex flex-col gap-1.5">
        {evs.map((e) => (
          <button key={e.key} onClick={() => setSheet({ event: e.event, date: e.date })} className="flex items-stretch gap-3 rounded-[18px] bg-surface p-3 text-left">
            <span className={`w-1.5 shrink-0 rounded-full ${TONE[e.event.category] ?? "bg-cobalt"}`} />
            <span className="tabular w-12 shrink-0 text-[13px] font-semibold leading-tight text-ink-2">
              {e.start && e.start !== "00:00" ? e.start : "dia todo"}
              {e.end && e.end !== "24:00" && <span className="block font-normal text-ink-3">{e.end}</span>}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[15px] font-semibold">{e.event.title}</span>
              <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
                {e.span > 1 && <span>dia {e.day} de {e.span}</span>}
                {e.event.repeat && <Repeat2 className="size-3.5" />}
                {e.event.location && <span className="flex items-center gap-0.5"><MapPin className="size-3" />{e.event.location}</span>}
                {spaces.find((s) => s.id === e.event.workspace_id)?.kind === "shared" && <span className="rounded-full bg-lavender px-2 font-semibold text-on-color">Nós</span>}
                {clash.has(e.key) && <span className="flex items-center gap-0.5 font-semibold text-warning"><AlertTriangle className="size-3" />conflito</span>}
              </span>
            </span>
          </button>
        ))}
        {ts.length > 0 && <TaskList items={ts} spaces={spaces} today={today} group={false} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          start(async () => {
            const r = await createEventQuick(text, spaces[0]?.id, date);
            toast(r.message);
            if (r.ok) setText("");
          });
        }}
        className="field-shell flex items-center gap-2 rounded-[22px] bg-surface p-2 pl-4 transition-shadow"
      >
        <label htmlFor="quick-event" className="sr-only">Novo compromisso</label>
        <input id="quick-event" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: jantar sexta 20h @nós" maxLength={300} enterKeyHint="send" className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] field-inline" />
        <button type="submit" disabled={pending || !text.trim()} aria-label="Adicionar compromisso" className="grid size-11 place-items-center rounded-full bg-ink text-bg disabled:opacity-30">
          <Plus className="size-5" />
        </button>
      </form>

      <div className="flex items-center gap-2">
        <Segmented
          label="Visão"
          className="min-w-0 flex-1"
          value={view}
          options={(["dia", "semana", "mes"] as const).map((v) => ({ value: v, label: v === "mes" ? "Mês" : v === "dia" ? "Dia" : "Semana", href: href(v, date) }))}
        />
        <div className="flex shrink-0 items-center gap-1">
          <Link href={href(view, prev)} prefetch={false} aria-label="Anterior" className="press grid size-11 place-items-center rounded-full bg-surface"><ChevronLeft className="size-5" /></Link>
          <Link href={href(view, today)} prefetch={false} aria-label="Ir para hoje" className="press grid min-h-11 place-items-center rounded-full bg-surface px-3 text-[13px] font-semibold">Hoje</Link>
          <Link href={href(view, next)} prefetch={false} aria-label="Próximo" className="press grid size-11 place-items-center rounded-full bg-surface"><ChevronRight className="size-5" /></Link>
        </div>
      </div>

      {view !== "mes" && (
        <ol className="grid grid-cols-7 gap-1" aria-label="Semana">
          {week.map((d, i) => (
            <li key={d}>
              <Link href={href("dia", d)} prefetch={false} aria-current={d === date && view === "dia" ? "date" : undefined} className={`flex flex-col items-center gap-0.5 rounded-[14px] py-2 ${d === date && view === "dia" ? "bg-ink text-bg" : d === today ? "bg-coral/15" : "bg-surface"}`}>
                <span className="text-[11px] font-semibold opacity-70">{WD[i]}</span>
                <span className="tabular text-[17px] font-bold">{Number(d.slice(8))}</span>
                <span className={`size-1.5 rounded-full ${count(d) ? (d === date && view === "dia" ? "bg-bg" : "bg-coral") : "bg-transparent"}`} />
              </Link>
            </li>
          ))}
        </ol>
      )}

      {view === "dia" && (
        <section aria-label={fmt(date, { weekday: "long", day: "numeric", month: "long" })} className="flex flex-col gap-2">
          <h2 className="px-2 text-[15px] font-bold first-letter:uppercase">{fmt(date, { weekday: "long", day: "numeric", month: "long" })}</h2>
          {dayBlock(date)}
        </section>
      )}

      {view === "semana" &&
        week.map((d) => (
          <section key={d} aria-label={fmt(d, { weekday: "long", day: "numeric" })} className="flex flex-col gap-1.5">
            <h2 className={`px-2 text-[13px] font-semibold first-letter:uppercase ${d === today ? "text-coral" : "text-ink-2"}`}>{fmt(d, { weekday: "long", day: "numeric", month: "short" })}</h2>
            {dayBlock(d, true) ?? <p className="px-2 text-[13px] text-ink-3">livre</p>}
          </section>
        ))}

      {view === "mes" && (
        <div className="rounded-[22px] bg-surface p-2">
          <h2 className="px-2 pb-2 text-[15px] font-bold first-letter:uppercase">{fmt(date, { month: "long", year: "numeric" })}</h2>
          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-ink-3">{WD.map((w, i) => <span key={i}>{w}</span>)}</div>
          {monthGrid(date).map((w) => (
            <div key={w[0]} className="grid grid-cols-7">
              {w.map((d) => {
                const evs = events.filter((e) => e.date === d);
                const n = count(d);
                return (
                  <Link key={d} href={href("dia", d)} prefetch={false} aria-label={`${fmt(d, { day: "numeric", month: "long" })}: ${n} itens`} className={`flex min-h-14 flex-col items-center gap-1 rounded-[12px] pt-1.5 ${d.slice(0, 7) !== date.slice(0, 7) ? "opacity-30" : ""} ${d === today ? "bg-coral/15" : ""}`}>
                    <span className={`tabular text-[14px] ${d === today ? "font-bold text-coral" : "font-semibold"}`}>{Number(d.slice(8))}</span>
                    <span className="flex flex-wrap justify-center gap-0.5 px-1">
                      {evs.slice(0, 3).map((e) => <span key={e.key} className={`size-1.5 rounded-full ${TONE[e.event.category] ?? "bg-cobalt"}`} />)}
                      {n > evs.length && <span className="size-1.5 rounded-full bg-sunflower" />}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <button onClick={() => setSheet({ date })} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-surface text-[15px] font-semibold">
        <Plus className="size-4" /> Novo evento com detalhes
      </button>
      {sheet && <EventSheet event={sheet.event} date={sheet.date} spaces={spaces} onClose={() => setSheet(null)} />}
    </div>
  );
}
