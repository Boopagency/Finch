import { parseItems, type ParsedItem } from "@/features/shopping/parse";

export type PantryItem = { id: string; name: string; qty: number; unit: string | null; min_qty: number; category: string; expires_on: string | null };

export const SLOTS = [["cafe", "Café"], ["almoco", "Almoço"], ["jantar", "Jantar"]] as const;
export type Slot = (typeof SLOTS)[number][0];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Abaixo do mínimo (só para itens com mínimo definido). */
export const isLow = (p: PantryItem) => p.min_qty > 0 && p.qty < p.min_qty;

/** Quanto comprar para voltar ao mínimo (nunca menos que 1). */
export const restockQty = (p: PantryItem) => Math.max(1, round2(p.min_qty - p.qty));

/** Vence em até `days` dias (inclui vencidos). Datas ISO comparam como texto. */
export function expiringSoon(items: PantryItem[], today: string, days = 3): PantryItem[] {
  const limit = new Date(`${today}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + days);
  const max = limit.toISOString().slice(0, 10);
  return items.filter((p) => p.expires_on && p.expires_on <= max).sort((a, b) => a.expires_on!.localeCompare(b.expires_on!));
}

/** Ingredientes da receita (um por linha) → itens de mercado, escalados para as porções. */
export function recipeItems(ingredients: string, factor = 1): ParsedItem[] {
  return ingredients
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean)
    .flatMap((l) => parseItems(l))
    .map((i) => ({ ...i, qty: Math.min(9999, Math.max(0.01, round2(i.qty * factor))) }));
}

/** Junta itens iguais (mesmo nome e unidade) somando quantidades. */
export function mergeItems(items: ParsedItem[]): ParsedItem[] {
  const m = new Map<string, ParsedItem>();
  for (const i of items) {
    const k = `${i.name.toLowerCase()}|${i.unit ?? ""}`;
    const cur = m.get(k);
    m.set(k, cur ? { ...cur, qty: round2(cur.qty + i.qty) } : { ...i });
  }
  return [...m.values()];
}

/** Tira o que já tem em casa acima do mínimo. Devolve o que comprar e o que foi pulado. */
export function splitOwned(items: ParsedItem[], pantry: PantryItem[]): { buy: ParsedItem[]; have: ParsedItem[] } {
  const by = new Map(pantry.map((p) => [p.name.toLowerCase(), p]));
  const buy: ParsedItem[] = [];
  const have: ParsedItem[] = [];
  for (const i of items) {
    const p = by.get(i.name.toLowerCase());
    const enough = p && p.qty > p.min_qty && (p.unit !== i.unit || p.qty >= i.qty);
    (enough ? have : buy).push(i);
  }
  return { buy, have };
}

export function weekFrom(today: string, n = 7): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", timeZone: "UTC" }).replace(".", "");

export const formatQty = (q: number, unit: string | null) => `${Number(q).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ""}`;
