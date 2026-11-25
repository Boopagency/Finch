import { addDays } from "@/features/health/habits";
import { toMinutes } from "@/features/notifications/quiet-hours";
import { matches, type Repeat } from "@/features/tasks/recurrence";

export type EventRow = {
  id: string;
  title: string;
  workspace_id: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  repeat: Repeat | null;
  repeat_until: string | null;
  location: string | null;
  notes: string | null;
  category: string;
  remind_min: number | null;
};

export type EventInstance = {
  key: string;
  event: EventRow;
  date: string; // dia em que aparece
  start: string | null; // HH:MM no dia (nulo = dia inteiro / dia do meio)
  end: string | null;
  day: number; // 1..span
  span: number;
};

function span(e: EventRow) {
  return Math.round((Date.parse(`${e.end_date}T12:00:00Z`) - Date.parse(`${e.start_date}T12:00:00Z`)) / 86_400_000) + 1;
}

/** Instâncias visíveis em [from, to]: cada dia de eventos longos e cada repetição. */
export function expandEvents(events: EventRow[], from: string, to: string): EventInstance[] {
  const out: EventInstance[] = [];
  for (const e of events) {
    const n = span(e);
    const starts: string[] = [];
    if (e.repeat) {
      const last = e.repeat_until && e.repeat_until < to ? e.repeat_until : to;
      for (let d = addDays(from, -(n - 1)) < e.start_date ? e.start_date : addDays(from, -(n - 1)); d <= last; d = addDays(d, 1)) {
        if (matches(e.repeat, e.start_date, d)) starts.push(d);
      }
    } else starts.push(e.start_date);
    for (const s of starts) {
      for (let i = 0; i < n; i++) {
        const d = addDays(s, i);
        if (d < from || d > to) continue;
        const timed = !!e.start_time;
        out.push({
          key: `${e.id}:${d}`,
          event: e,
          date: d,
          start: timed && i === 0 ? e.start_time!.slice(0, 5) : timed && i > 0 ? "00:00" : null,
          end: timed && i === n - 1 ? e.end_time!.slice(0, 5) : timed ? "24:00" : null,
          day: i + 1,
          span: n,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? "").localeCompare(b.start ?? ""));
}

/** Chaves de instâncias com horário que se sobrepõem no mesmo dia. */
export function conflicts(items: { key: string; date: string; start: string | null; end: string | null }[]): Set<string> {
  const out = new Set<string>();
  const timed = items.filter((i) => i.start && i.end);
  for (let a = 0; a < timed.length; a++) {
    for (let b = a + 1; b < timed.length; b++) {
      const x = timed[a]!;
      const y = timed[b]!;
      if (x.date !== y.date) continue;
      if (toMinutes(x.start!) < toMinutes(y.end!) && toMinutes(y.start!) < toMinutes(x.end!)) {
        out.add(x.key);
        out.add(y.key);
      }
    }
  }
  return out;
}

/** Grade do mês (semanas começando na segunda), com dias de fora do mês para completar. */
export function monthGrid(anyDay: string): string[][] {
  const first = `${anyDay.slice(0, 7)}-01`;
  const startDow = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  let d = addDays(first, -startDow);
  const weeks: string[][] = [];
  do {
    const w: string[] = [];
    for (let i = 0; i < 7; i++, d = addDays(d, 1)) w.push(d);
    weeks.push(w);
  } while (d.slice(0, 7) === first.slice(0, 7));
  return weeks;
}
