/**
 * Frase-resumo do Hoje, montada por regras (sem IA).
 * Cada módulo contribui com itens; a frase mostra até 3 e resume o resto.
 */
export type Tone = "coral" | "sunflower" | "tangerine" | "cobalt" | "lavender" | "frog";
export type DayItem = { lead: string; highlight: string; tail?: string; tone: Tone; icon: string; priority: number };
export type Segment = { text: string; strong?: boolean; sticker?: { tone: Tone; icon: string } };

export function greeting(hour: number): string {
  if (hour < 5) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function buildSentence(name: string, hour: number, items: DayItem[], max = 3): Segment[] {
  const out: Segment[] = [{ text: `${greeting(hour)}, ${name}! ` }];
  const sorted = [...items].sort((a, b) => b.priority - a.priority);
  const shown = sorted.slice(0, max);
  const rest = sorted.length - shown.length;

  if (shown.length === 0) {
    out.push({ text: "Seu dia está " }, { text: "em branco", strong: true }, { text: " por enquanto. Toque no + para começar." });
    return out;
  }

  out.push({ text: "Hoje " });
  shown.forEach((item, i) => {
    if (i > 0) out.push({ text: i === shown.length - 1 && rest === 0 ? " e " : ", " });
    out.push({ text: `${item.lead} ` }, { text: item.highlight, strong: true }, { text: "", sticker: { tone: item.tone, icon: item.icon } });
    if (item.tail) out.push({ text: ` ${item.tail}` });
  });
  if (rest > 0) out.push({ text: ` e mais ${rest} ${rest === 1 ? "coisa" : "coisas"}` });
  out.push({ text: "." });
  return out;
}
