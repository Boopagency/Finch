/** Treinos: peso em gramas inteiras (sem ponto flutuante no banco), tempos por timestamp. */

/** "62,5" | "62.5" | "62" → 62500 g. Inválido → null. */
export function parseKg(input: string): number | null {
  const t = input.trim().replace(",", ".");
  if (!/^\d{1,4}(\.\d{1,3})?$/.test(t)) return null;
  const g = Math.round(Number(t) * 1000);
  return g <= 1_000_000 ? g : null;
}

export function formatKg(g: number): string {
  return `${(g / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kg`;
}

/** 1RM estimado (Epley). Só faz sentido até ~12 repetições; acima disso, a carga manda. */
export function e1rm(weight_g: number, reps: number): number {
  if (reps <= 0) return 0;
  if (reps === 1) return weight_g;
  return Math.round(weight_g * (1 + Math.min(reps, 12) / 30));
}

export type SetLike = { exercise_id: string; weight_g: number | null; reps: number | null; duration_s: number | null };
export type Best = { weight_g: number; reps: number; e1rm: number };

/** Melhor série por exercício (maior 1RM estimado). Exercícios sem carga ficam de fora. */
export function bestByExercise(sets: SetLike[]): Map<string, Best> {
  const m = new Map<string, Best>();
  for (const s of sets) {
    if (!s.weight_g || !s.reps) continue;
    const v = e1rm(s.weight_g, s.reps);
    const cur = m.get(s.exercise_id);
    if (!cur || v > cur.e1rm) m.set(s.exercise_id, { weight_g: s.weight_g, reps: s.reps, e1rm: v });
  }
  return m;
}

/** A série nova bate o recorde anterior? (empate não conta) */
export function isPR(set: SetLike, previous: Best | undefined): boolean {
  if (!set.weight_g || !set.reps) return false;
  return !previous || e1rm(set.weight_g, set.reps) > previous.e1rm;
}

/** Volume (kg × reps) em gramas. */
export function volume(sets: SetLike[]): number {
  return sets.reduce((n, s) => n + (s.weight_g ?? 0) * (s.reps ?? 0), 0);
}

/** Segundos restantes até `until` (ms epoch). Baseado em relógio: sobrevive a tela bloqueada e app em segundo plano. */
export function secondsLeft(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}

export function formatClock(totalS: number): string {
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** Sono "7h30" | "7:30" | "7,5" | "7" → minutos. */
export function parseSleep(input: string): number | null {
  const t = input.trim().toLowerCase();
  let m = t.match(/^(\d{1,2})\s*[h:]\s*(\d{1,2})?\s*(min)?$/);
  if (m) {
    const v = Number(m[1]) * 60 + Number(m[2] ?? 0);
    return Number(m[2] ?? 0) < 60 && v <= 1440 ? v : null;
  }
  m = t.replace(",", ".").match(/^(\d{1,2}(\.\d+)?)$/);
  if (m) {
    const v = Math.round(Number(m[1]) * 60);
    return v <= 1440 ? v : null;
  }
  return null;
}

export function formatSleep(min: number): string {
  return `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
}

export const MOODS = ["", "Péssimo", "Ruim", "Ok", "Bem", "Ótimo"] as const;

export const MUSCLES: Record<string, string> = {
  peito: "Peito", costas: "Costas", pernas: "Pernas", ombros: "Ombros", bracos: "Braços", core: "Core", cardio: "Cardio", outro: "Outro",
};
