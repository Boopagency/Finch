import { TZDate } from "@date-fns/tz";

/** Agora, no fuso do usuário. Fora dos componentes para manter o render puro. */
export function nowIn(tz: string): TZDate {
  return new TZDate(Date.now(), tz);
}

export function isFuture(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}
