/** Regras financeiras puras e determinísticas. Tudo em centavos inteiros. */

/** 10000 em 3 → [3334, 3333, 3333]: a sobra vai para a primeira parcela. */
export function splitInstallments(total: number, n: number): number[] {
  if (!Number.isInteger(total) || total < 0 || !Number.isInteger(n) || n < 1) throw new Error("parcelamento inválido");
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i === 0 ? rest : 0));
}

/** Mês da fatura (YYYY-MM-01). Compra no dia do fechamento ou depois cai na fatura seguinte. */
export function statementMonth(purchaseDate: string, closingDay: number): string {
  const y = Number(purchaseDate.slice(0, 4));
  const m = Number(purchaseDate.slice(5, 7));
  const d = Number(purchaseDate.slice(8, 10));
  const next = d >= closingDay;
  const ny = next && m === 12 ? y + 1 : y;
  const nm = next ? (m % 12) + 1 : m;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export function addMonths(month: string, n: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + n;
  const ny = y + Math.floor(m / 12);
  const nm = ((m % 12) + 12) % 12;
  return `${ny}-${String(nm + 1).padStart(2, "0")}-01`;
}

/** Vencimento da fatura do mês: se vence antes (ou no) dia de fechar, é no mês seguinte. */
export function dueDate(month: string, closingDay: number, dueDay: number): string {
  const target = dueDay <= closingDay ? addMonths(month, 1) : month;
  const last = new Date(Date.UTC(Number(target.slice(0, 4)), Number(target.slice(5, 7)), 0)).getUTCDate();
  return `${target.slice(0, 8)}${String(Math.min(dueDay, last)).padStart(2, "0")}`;
}

export type SplitMethod = "equal" | "income" | "percent" | "fixed";

/**
 * Quanto cada um DEVE de uma despesa compartilhada. Soma sempre bate com o total
 * (centavos de arredondamento vão para quem pagou, sem ninguém pagar a mais por erro de conta).
 */
export function shares(total: number, method: SplitMethod, people: { id: string; weight?: number; fixed?: number }[], payerId: string): Record<string, number> {
  if (!people.length) return {};
  let raw: number[];
  if (method === "fixed") {
    raw = people.map((p) => p.fixed ?? 0);
    const sum = raw.reduce((a, b) => a + b, 0);
    if (sum !== total) throw new Error("os valores fixos precisam somar o total");
  } else {
    const w = people.map((p) => (method === "equal" ? 1 : Math.max(0, p.weight ?? 0)));
    const sw = w.reduce((a, b) => a + b, 0);
    if (sw <= 0) throw new Error(method === "income" ? "informe as rendas de referência" : "percentuais inválidos");
    raw = w.map((x) => Math.floor((total * x) / sw));
    const diff = total - raw.reduce((a, b) => a + b, 0);
    const payerIdx = Math.max(0, people.findIndex((p) => p.id === payerId));
    raw[payerIdx]! += diff;
  }
  return Object.fromEntries(people.map((p, i) => [p.id, raw[i]!]));
}

/** Saldo do casal: positivo = tem a receber. Pagou − devia, menos acertos. */
export function coupleBalance(
  splits: { paid_by: string; total: number; shares: Record<string, number> }[],
  settlements: { from_user: string; to_user: string; amount: number }[],
): Record<string, number> {
  const bal: Record<string, number> = {};
  const add = (id: string, v: number) => (bal[id] = (bal[id] ?? 0) + v);
  for (const s of splits) {
    add(s.paid_by, s.total);
    for (const [id, v] of Object.entries(s.shares)) add(id, -v);
  }
  for (const t of settlements) {
    add(t.from_user, t.amount);
    add(t.to_user, -t.amount);
  }
  return bal;
}

/** "R$ 1.234,56" sem depender do locale do navegador. */
export function brl(cents: number): string {
  const neg = cents < 0;
  const v = Math.abs(cents);
  const int = Math.floor(v / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${neg ? "−" : ""}R$ ${int},${String(v % 100).padStart(2, "0")}`;
}
