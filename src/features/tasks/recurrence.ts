import { addDays, weekday, weekStart } from "@/features/health/habits";

/** Recorrência simples e determinística. Datas locais YYYY-MM-DD; 0 = domingo. */
export type Repeat = {
  freq: "daily" | "weekly" | "monthly";
  interval?: number; // a cada N dias/semanas/meses (padrão 1)
  days?: number[]; // weekly
  monthday?: number; // monthly (1–31; meses curtos usam o último dia)
};

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

function ym(date: string) {
  return { y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) };
}
function lastDay(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

export function matches(r: Repeat, start: string, date: string): boolean {
  if (date < start) return false;
  const n = Math.max(1, r.interval ?? 1);
  switch (r.freq) {
    case "daily":
      return daysBetween(start, date) % n === 0;
    case "weekly": {
      const days = r.days?.length ? r.days : [weekday(start)];
      if (!days.includes(weekday(date))) return false;
      return (daysBetween(weekStart(start), weekStart(date)) / 7) % n === 0;
    }
    case "monthly": {
      const s = ym(start);
      const d = ym(date);
      const months = (d.y - s.y) * 12 + (d.m - s.m);
      if (months % n !== 0) return false;
      const want = Math.min(r.monthday ?? Number(start.slice(8, 10)), lastDay(d.y, d.m));
      return Number(date.slice(8, 10)) === want;
    }
  }
}

/** Datas de ocorrência em [from, to]. */
export function occurrencesBetween(r: Repeat, start: string, from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from < start ? start : from; d <= to; d = addDays(d, 1)) if (matches(r, start, d)) out.push(d);
  return out;
}

/** Posição da ocorrência na série (0, 1, 2…) — base do rodízio. */
export function occurrenceIndex(r: Repeat, start: string, date: string): number {
  return occurrencesBetween(r, start, start, date).length - 1;
}

export function rotationFor(rotation: string[] | null | undefined, r: Repeat, start: string, date: string): string | null {
  if (!rotation?.length) return null;
  return rotation[Math.max(0, occurrenceIndex(r, start, date)) % rotation.length] ?? null;
}

export function describeRepeat(r: Repeat): string {
  const n = Math.max(1, r.interval ?? 1);
  switch (r.freq) {
    case "daily":
      return n === 1 ? "Todo dia" : `A cada ${n} dias`;
    case "weekly": {
      const days = [...(r.days ?? [])].sort();
      if (n === 1 && days.length === 1) return `Toda ${WEEKDAYS[days[0]!]}`.replace("Toda sábado", "Todo sábado").replace("Toda domingo", "Todo domingo");
      const list = days.map((d) => SHORT[d]).join(", ");
      return n === 1 ? `Toda semana: ${list}` : `A cada ${n} semanas: ${list}`;
    }
    case "monthly":
      return n === 1 ? `Todo mês no dia ${r.monthday}` : `A cada ${n} meses no dia ${r.monthday}`;
  }
}
