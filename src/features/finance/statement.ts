/** Extrato do banco → linhas para importar. Sem IA. Valores em centavos; negativo = saída. */
export type StatementRow = { ref: string; date: string; description: string; amount: number };

const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>([^<\\r\\n]*)`, "i"))?.[1]?.trim() ?? "";

function cents(raw: string): number | null {
  const s = raw.trim().replace(/\s|R\$/g, "");
  if (!/^[-+]?[\d.,]+$/.test(s)) return null;
  // "1.234,56" (BR) ou "1234.56" / "-45.9" (OFX/EN)
  const n = /,\d{1,2}$/.test(s) ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** OFX (SGML ou XML), como o exportado por Itaú, Bradesco, Nubank, Inter, BB, Caixa. */
export function parseOFX(text: string): StatementRow[] {
  const rows: StatementRow[] = [];
  for (const m of text.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi)) {
    const b = m[1]!;
    const d = tag(b, "DTPOSTED").slice(0, 8);
    const amount = cents(tag(b, "TRNAMT"));
    if (!/^\d{8}$/.test(d) || amount === null || amount === 0) continue;
    const description = (tag(b, "MEMO") || tag(b, "NAME") || "Lançamento").replace(/\s+/g, " ").slice(0, 200);
    const date = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
    rows.push({ ref: tag(b, "FITID") || `${date}|${amount}|${description}`, date, description, amount });
  }
  return rows;
}

function splitCSV(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (c === '"' && q && line[i + 1] === '"') {
      cur += '"'; // aspas escapadas dentro de campo
      i++;
    } else if (c === '"') {
      q = !q;
    } else if (c === sep && !q) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toISO(raw: string): string | null {
  let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/**
 * CSV com cabeçalho: acha as colunas de data, descrição e valor pelo nome (Nubank: date,title,amount;
 * Nubank conta: Data,Valor,Identificador,Descrição; genérico: data;descrição;valor).
 * Fatura de cartão (Nubank) vem com compra positiva: `invertCard` deixa compras negativas.
 */
export function parseCSV(text: string, invertCard = false): StatementRow[] {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0]!.match(/;/g)?.length ?? 0) > (lines[0]!.match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitCSV(lines[0]!, sep).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n || h.startsWith(n)));
  const di = col("data", "date"), ti = col("descricao", "title", "historico", "description", "lancamento"), vi = col("valor", "amount", "value"), ii = col("identificador", "id");
  if (di < 0 || vi < 0) return [];
  const rows: StatementRow[] = [];
  for (const line of lines.slice(1)) {
    const c = splitCSV(line, sep);
    const date = toISO(c[di] ?? "");
    let amount = cents(c[vi] ?? "");
    if (!date || amount === null || amount === 0) continue;
    if (invertCard) amount = -amount;
    const description = ((ti >= 0 ? c[ti] : "") || "Lançamento").replace(/\s+/g, " ").slice(0, 200);
    rows.push({ ref: (ii >= 0 && c[ii]) || `${date}|${amount}|${description}`, date, description, amount });
  }
  return rows;
}

export function parseStatement(fileName: string, text: string, isCard: boolean): StatementRow[] {
  if (/<OFX>|OFXHEADER/i.test(text) || /\.ofx$/i.test(fileName)) return parseOFX(text);
  // fatura do Nubank (date,title,amount) traz compras positivas; extrato de conta já vem com sinal
  const nubankCard = /^﻿?date,title,amount/i.test(text.trim());
  return parseCSV(text, isCard && nubankCard);
}
