/** Regras de hábito, puras. Datas locais no formato YYYY-MM-DD. */
export type Habit = {
  id: string;
  name: string;
  kind: "check" | "quantity";
  period: "day" | "week";
  target: number;
  unit: string | null;
  days: number[]; // 0 = domingo
  reminder_time: string | null;
  tone: string;
  /** data local de criação; consistência não conta dias antes disso */
  since?: string;
};
export type HabitLog = { id: string; habit_id: string; value: number; local_date: string };

function parse(date: string): Date {
  return new Date(`${date}T12:00:00Z`); // meio-dia UTC evita virar o dia
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}
export function weekday(date: string): number {
  return parse(date).getUTCDay();
}
/** Semana começa na segunda. */
export function weekStart(date: string): string {
  return addDays(date, -((weekday(date) + 6) % 7));
}

export function isScheduled(h: Habit, date: string): boolean {
  return h.period === "week" || h.days.includes(weekday(date));
}

export type HabitStatus = { progress: number; target: number; done: boolean; scheduled: boolean };

export function habitStatus(h: Habit, logs: HabitLog[], today: string): HabitStatus {
  const from = h.period === "week" ? weekStart(today) : today;
  const progress = logs
    .filter((l) => l.habit_id === h.id && l.local_date >= from && l.local_date <= today)
    .reduce((sum, l) => sum + l.value, 0);
  return { progress, target: h.target, done: progress >= h.target, scheduled: isScheduled(h, today) };
}

/**
 * Consistência sem punição: quantos períodos foram cumpridos entre os agendados.
 * Diário: últimos `days` dias agendados (hoje só conta se já cumprido). Semanal: últimas 4 semanas fechadas + a atual se cumprida.
 */
export function consistency(h: Habit, logs: HabitLog[], today: string, days = 28): { done: number; of: number } {
  const byDate = new Map<string, number>();
  for (const l of logs) if (l.habit_id === h.id) byDate.set(l.local_date, (byDate.get(l.local_date) ?? 0) + l.value);

  if (h.period === "week") {
    let done = 0;
    let of = 0;
    const current = weekStart(today);
    for (let w = 0; w <= 4; w++) {
      const start = addDays(current, -7 * w);
      if (h.since && addDays(start, 6) < h.since) break; // semana inteira antes do hábito existir
      let sum = 0;
      for (let i = 0; i < 7; i++) sum += byDate.get(addDays(start, i)) ?? 0;
      const ok = sum >= h.target;
      if (w === 0 && !ok) continue; // semana em andamento não conta contra
      of++;
      if (ok) done++;
    }
    return { done, of };
  }

  let done = 0;
  let of = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(today, -i);
    if (h.since && d < h.since) break;
    if (!isScheduled(h, d)) continue;
    const ok = (byDate.get(d) ?? 0) >= h.target;
    if (i === 0 && !ok) continue; // hoje ainda dá tempo
    of++;
    if (ok) done++;
  }
  return { done, of };
}
