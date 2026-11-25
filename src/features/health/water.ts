import { TZDate } from "@date-fns/tz";
import { toMinutes } from "@/features/notifications/quiet-hours";

/** 1200 → "1,2 L"; 300 → "300 ml". */
export function formatWater(ml: number): string {
  if (ml < 1000) return `${ml} ml`;
  const l = ml / 1000;
  return `${l.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} L`;
}

/** Horários (HH:MM) de lembrete do dia: from, from+every, … até to (inclusive). */
export function waterSlots(from: string, to: string, everyMin: number): string[] {
  const start = toMinutes(from);
  const end = toMinutes(to);
  const out: string[] = [];
  if (everyMin <= 0 || end < start) return out;
  for (let m = start; m <= end; m += everyMin) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

/** "2026-11-25" + "09:30" no fuso → instante. */
export function localToInstant(date: string, time: string, tz: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(new TZDate(y!, mo! - 1, d!, h!, mi!, 0, tz).getTime());
}

/** Data local (YYYY-MM-DD) de um instante no fuso. */
export function localDate(at: Date, tz: string): string {
  const d = new TZDate(at.getTime(), tz);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
