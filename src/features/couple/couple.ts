/** Datas especiais e metas. Datas como "aaaa-mm-dd", contas em UTC ao meio-dia (sem fuso no meio). */

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);
const daysBetween = (a: string, b: string) => Math.round((+at(b) - +at(a)) / 864e5);
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** Próxima ocorrência (hoje conta). 29/02 vira 28/02 em ano não bissexto. Datas únicas passadas → null. */
export function nextOccurrence(onDate: string, yearly: boolean, today: string): { date: string; days: number; years: number } | null {
  if (!yearly) {
    const days = daysBetween(today, onDate);
    return days >= 0 ? { date: onDate, days, years: 0 } : null;
  }
  const [y0, m, d] = onDate.split("-").map(Number) as [number, number, number];
  const ty = Number(today.slice(0, 4));
  for (const y of [ty, ty + 1]) {
    const day = m === 2 && d === 29 && !isLeap(y) ? 28 : d;
    const date = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (date >= today) return { date, days: daysBetween(today, date), years: y - y0 };
  }
  return null;
}

export function countdownLabel(days: number): string {
  if (days === 0) return "é hoje";
  if (days === 1) return "amanhã";
  return `em ${days} dias`;
}

/** Tempo desde a data original ("3 anos", "8 meses", "12 dias"). */
export function sinceLabel(onDate: string, today: string): string {
  const a = at(onDate), b = at(today);
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
  if (b.getUTCDate() < a.getUTCDate()) months--;
  if (months >= 12) return `${Math.floor(months / 12)} ${Math.floor(months / 12) === 1 ? "ano" : "anos"}`;
  if (months >= 1) return `${months} ${months === 1 ? "mês" : "meses"}`;
  const days = daysBetween(onDate, today);
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}

export function goalPct(current: number, target: number): number {
  return Math.max(0, Math.min(100, Math.floor((current / target) * 100)));
}

/** Ritmo para chegar no prazo: quanto por semana falta (null sem prazo ou já batida). */
export function perWeekNeeded(current: number, target: number, dueOn: string | null, today: string): number | null {
  if (!dueOn || current >= target) return null;
  const weeks = Math.max(1, Math.ceil(daysBetween(today, dueOn) / 7));
  return Math.ceil(((target - current) / weeks) * 100) / 100;
}

export const PLACE_KINDS: Record<string, string> = { restaurante: "Restaurante", viagem: "Viagem", passeio: "Passeio", outro: "Outro" };

export const fmtNum = (n: number, unit: string | null) =>
  unit === "R$"
    ? Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : `${Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;

