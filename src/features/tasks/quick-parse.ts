import { addDays, weekday } from "@/features/health/habits";
import type { Repeat } from "./recurrence";

/**
 * Entende frases curtas em português, sem IA:
 * "Lavar roupa toda quarta #casa @nós", "Pagar luz dia 10 !", "Médico amanhã 14h30".
 */
export type Parsed = {
  title: string;
  due_date?: string;
  due_time?: string;
  repeat?: Repeat;
  category?: string;
  priority?: number;
  shared?: boolean;
};

const DAY_WORDS: [RegExp, number][] = [
  [/domingos?/, 0],
  [/segundas?(?:-feiras?)?/, 1],
  [/ter[cç]as?(?:-feiras?)?/, 2],
  [/quartas?(?:-feiras?)?/, 3],
  [/quintas?(?:-feiras?)?/, 4],
  [/sextas?(?:-feiras?)?/, 5],
  [/s[aá]bados?/, 6],
];
const DAY_RE = "(?:domingos?|segundas?(?:-feiras?)?|ter[cç]as?(?:-feiras?)?|quartas?(?:-feiras?)?|quintas?(?:-feiras?)?|sextas?(?:-feiras?)?|s[aá]bados?)";
const CATEGORIES: Record<string, string> = {
  casa: "casa", contas: "contas", conta: "contas", trabalho: "trabalho", saude: "saude", "saúde": "saude", compras: "compras", nos: "nos", "nós": "nos",
};

function dayNum(word: string): number {
  return DAY_WORDS.find(([re]) => re.test(word))![1];
}
function nextWeekday(today: string, d: number): string {
  return addDays(today, (d - weekday(today) + 7) % 7);
}
function nextMonthday(today: string, n: number): string {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const thisMonth = `${y}-${String(m).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
  if (Number(today.slice(8, 10)) <= n) return thisMonth;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
}

export function parseQuickTask(input: string, today: string): Parsed {
  let s = ` ${input.trim()} `;
  const out: Parsed = { title: "" };
  const take = (re: RegExp, fn: (m: RegExpMatchArray) => void) => {
    const m = s.match(re);
    if (m) {
      fn(m);
      s = s.replace(m[0], " ");
    }
  };

  take(/\s#([\p{L}]+)/u, (m) => {
    const c = CATEGORIES[m[1]!.toLowerCase()];
    if (c) out.category = c;
  });
  take(/\s@n[oó]s\b/i, () => (out.shared = true));
  take(/\s(!{1,3})(?=\s)/, (m) => (out.priority = m[1]!.length));

  // hora: 19h, 19h30, 19:30, às 7
  take(/\s(?:[àa]s\s+)?(\d{1,2})(?:h(\d{2})?|:(\d{2}))(?=\s)|\s[àa]s\s+(\d{1,2})(?=\s)/i, (m) => {
    const h = Number(m[1] ?? m[4]);
    const min = Number(m[2] ?? m[3] ?? 0);
    if (h <= 23 && min <= 59) out.due_time = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  });

  // recorrência
  take(/\s(?:todo dia|todos os dias|diariamente)(?!\s+\d)/i, () => (out.repeat = { freq: "daily" }));
  take(new RegExp(`\\s(?:tod[oa]s?\\s+(?:as\\s+|os\\s+)?)(${DAY_RE}(?:\\s*(?:,|e)\\s*${DAY_RE})*)`, "i"), (m) => {
    const days = [...m[1]!.toLowerCase().matchAll(new RegExp(DAY_RE, "gi"))].map((x) => dayNum(x[0]));
    out.repeat = { freq: "weekly", days: [...new Set(days)].sort() };
  });
  // "aos sábados", "às quartas e sextas": plural = toda semana
  const PLURAL = "(?:domingos|segundas(?:-feiras)?|ter[cç]as(?:-feiras)?|quartas(?:-feiras)?|quintas(?:-feiras)?|sextas(?:-feiras)?|s[aá]bados)";
  if (!out.repeat) {
    take(new RegExp(`\\s(?:aos|[àa]s|nas|nos)\\s+(${PLURAL}(?:\\s*(?:,|e)\\s*${PLURAL})*)`, "i"), (m) => {
      const days = [...m[1]!.toLowerCase().matchAll(new RegExp(DAY_RE, "gi"))].map((x) => dayNum(x[0]));
      out.repeat = { freq: "weekly", days: [...new Set(days)].sort() };
    });
  }
  take(/\s(?:toda semana|semanalmente)/i, () => (out.repeat = { freq: "weekly", days: [weekday(today)] }));
  take(/\s(?:todo m[eê]s(?:\s+(?:no\s+)?dia)?|todo dia|mensalmente(?:\s+(?:no\s+)?dia)?)\s+(\d{1,2})\b/i, (m) => {
    const n = Number(m[1]);
    if (n >= 1 && n <= 31) out.repeat = { freq: "monthly", monthday: n };
  });
  take(/\s(?:todo m[eê]s|mensalmente)/i, () => (out.repeat = { freq: "monthly", monthday: Number(today.slice(8, 10)) }));

  // data única
  if (!out.repeat) {
    take(/\sdepois de amanh[aã]/i, () => (out.due_date = addDays(today, 2)));
    take(/\samanh[aã]/i, () => (out.due_date = addDays(today, 1)));
    take(/\shoje/i, () => (out.due_date = today));
    take(/\s(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?=\s)/, (m) => {
      const d = Number(m[1]);
      const mo = Number(m[2]);
      let y = m[3] ? Number(m[3]) : Number(today.slice(0, 4));
      if (y < 100) y += 2000;
      const iso = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (!m[3] && iso < today) y += 1;
      if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) out.due_date = `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    });
    take(/\s(?:no\s+)?dia\s+(\d{1,2})\b/i, (m) => {
      const n = Number(m[1]);
      if (n >= 1 && n <= 31) out.due_date = nextMonthday(today, n);
    });
    take(new RegExp(`\\s(?:n[ao]\\s+|(?:nesta|nessa|essa|esta|pr[oó]xim[ao])\\s+)?(${DAY_RE})`, "i"), (m) => {
      out.due_date = nextWeekday(today, dayNum(m[1]!.toLowerCase()));
    });
    if (out.due_time && !out.due_date) out.due_date = today;
  }

  out.title = s
    .replace(/\s+(?:[àa]s|de|no|na|em|para|pra)\s*$/i, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (out.title) out.title = out.title[0]!.toUpperCase() + out.title.slice(1);
  return out;
}
