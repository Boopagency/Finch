/** Relatório e exportação: funções puras (centavos inteiros). */

/** "1.200,50" | "1200.5" | "R$ 39,90" → centavos. */
export function parseMoneyBRL(input: string): number | null {
  const s = input.replace(/[^\d,.-]/g, "");
  if (!s || /-/.test(s)) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export type CatRow = { name: string; total: number };

/** Categorias do mês com o anterior ao lado; inclui as que sumiram (total 0 no mês). */
export function compareCategories(current: CatRow[], previous: CatRow[]) {
  const prev = new Map(previous.map((c) => [c.name, c.total]));
  const names = new Set([...current.map((c) => c.name), ...previous.map((c) => c.name)]);
  const cur = new Map(current.map((c) => [c.name, c.total]));
  return [...names]
    .map((name) => {
      const now = cur.get(name) ?? 0;
      const before = prev.get(name) ?? 0;
      return { name, total: now, previous: before, delta: now - before, pct: before ? Math.round(((now - before) / before) * 100) : null };
    })
    .sort((a, b) => b.total - a.total || b.previous - a.previous);
}

const csvCell = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV para Excel/Planilhas em pt-BR: ";" como separador, vírgula decimal, BOM para acentos. */
export function toCSV(header: string[], rows: (string | number)[][]): string {
  const fmt = (v: string | number) => (typeof v === "number" ? (v / 100).toFixed(2).replace(".", ",") : csvCell(v));
  return "﻿" + [header.map(csvCell).join(";"), ...rows.map((r) => r.map(fmt).join(";"))].join("\r\n") + "\r\n";
}
