/**
 * O bichinho de vocês. Regras puras (sem banco), para dar para testar.
 * Princípio do app (D-017): nada de punição. O bichinho nunca morre, nunca perde amor e nunca cobra —
 * ficar sem carinho só muda o humor, e um cuidado já traz ele de volta.
 */

export const SPECIES = {
  gato: { label: "Gatinho", hint: "dorme muito, ama colo" },
  cachorro: { label: "Cachorrinho", hint: "feliz com qualquer coisa" },
  coelho: { label: "Coelhinho", hint: "quietinho e macio" },
  passarinho: { label: "Passarinho", hint: "canta quando vocês chegam" },
  monstrinho: { label: "Monstrinho", hint: "feio, fofo e caótico" },
  dragao: { label: "Draguinho", hint: "solta fumacinha quando ri" },
} as const;
export type Species = keyof typeof SPECIES;

export const CARES = {
  comida: { label: "Comidinha", love: 10, emoji: "🍓" },
  carinho: { label: "Carinho", love: 10, emoji: "🫶" },
  brincar: { label: "Brincar", love: 15, emoji: "🧶" },
  mimo: { label: "Mimo", love: 20, emoji: "🎁" },
} as const;
export type Care = keyof typeof CARES;

/** Nível: cada 100 de amor sobe um. Só sobe. */
export const level = (love: number) => Math.floor(Math.max(0, love) / 100) + 1;
/** Quanto falta, em amor, para o próximo nível (0–99 já feito). */
export const levelProgress = (love: number) => Math.max(0, love) % 100;

export type Mood = "radiante" | "feliz" | "de boa" | "com saudade" | "com muita saudade";

/** Dias inteiros entre o último cuidado e agora (nunca negativo). */
export function daysSince(caredAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(caredAt)) / 86_400_000));
}

/**
 * Humor pelo tempo desde o último cuidado (de qualquer um dos dois).
 * `todayCares`: quantos cuidados o casal já deu hoje — dois ou mais deixam ele radiante.
 */
export function mood(caredAt: string, todayCares = 0, now: Date = new Date()): Mood {
  const d = daysSince(caredAt, now);
  if (d === 0 && todayCares >= 2) return "radiante";
  if (d === 0) return "feliz";
  if (d <= 2) return "de boa";
  if (d <= 6) return "com saudade";
  return "com muita saudade";
}

/** Frase do bichinho para o humor (fala em primeira pessoa, nunca cobra). */
export function moodLine(name: string, m: Mood): string {
  return {
    radiante: `${name} está radiante com vocês dois hoje!`,
    feliz: `${name} está feliz — já recebeu carinho hoje.`,
    "de boa": `${name} está de boa, esperando vocês.`,
    "com saudade": `${name} está com saudade de vocês.`,
    "com muita saudade": `${name} sente muita saudade. Um carinho já alegra ele.`,
  }[m];
}

/** Cor do balão por humor (tokens do design). */
export const moodTone = (m: Mood): string =>
  ({ radiante: "sunflower", feliz: "frog", "de boa": "lavender", "com saudade": "tangerine", "com muita saudade": "coral" })[m];
