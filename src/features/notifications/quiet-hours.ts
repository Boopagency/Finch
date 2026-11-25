import { TZDate } from "@date-fns/tz";

/** "HH:MM" ou "HH:MM:SS" → minutos do dia. */
export function toMinutes(time: string): number {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function localMinutes(now: Date, tz: string): number {
  const d = new TZDate(now.getTime(), tz);
  return d.getHours() * 60 + d.getMinutes();
}

/** Janela pode cruzar a meia-noite (22:00 → 07:30). start === end = sem silêncio. */
export function isQuiet(now: Date, tz: string, start: string, end: string): boolean {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s === e) return false;
  const m = localMinutes(now, tz);
  return s < e ? m >= s && m < e : m >= s || m < e;
}

/** Próximo instante em que o silêncio termina.
 *  ponytail: soma minutos ao instante atual; num dia de mudança de horário erra em até 1h. */
export function quietEndsAt(now: Date, tz: string, end: string): Date {
  const diff = (toMinutes(end) - localMinutes(now, tz) + 1440) % 1440 || 1440;
  const at = new Date(now.getTime() + diff * 60_000);
  at.setUTCSeconds(0, 0);
  return at;
}
