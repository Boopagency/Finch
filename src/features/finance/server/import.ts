"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { guessExpenseCategory } from "../quick-parse";

const rowSchema = z.object({
  ref: z.string().min(1).max(200),
  date: z.iso.date(),
  description: z.string().max(200),
  amount: z.number().int().refine((n) => n !== 0 && Math.abs(n) <= 100_000_000_00),
});
const rowsSchema = z.array(rowSchema).min(1).max(500);
type Row = z.infer<typeof rowSchema>;

/** Id estável por (conta, código do banco): importar o mesmo arquivo de novo não duplica (fin_record é idempotente). */
function entryId(accountId: string, ref: string): string {
  const h = createHash("md5").update(`import:${accountId}:${ref}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function guessCategory(r: Row): string {
  if (r.amount > 0) return /sal[aá]rio|pagamento de sal|folha/i.test(r.description) ? "Salário" : /reembols|estorno/i.test(r.description) ? "Reembolso" : "Outros";
  return guessExpenseCategory(r.description) ?? "Outros";
}

async function account(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("fin_accounts").select("id, name, kind, workspace_id").eq("id", z.uuid().parse(id)).is("archived_at", null).single();
  return { supabase, acc: data };
}

export type Checked = Row & { status: "new" | "imported" | "duplicate" | "skip"; category: string; note?: string };

/** Pré-visualização: o que já foi importado, o que parece lançado à mão e o que não entra (ex.: pagamento no cartão). */
export async function checkStatement(accountId: string, input: Row[]): Promise<{ ok: boolean; message?: string; rows?: Checked[] }> {
  await requireViewer();
  const rows = rowsSchema.safeParse(input);
  if (!rows.success) return { ok: false, message: rows.error.issues[0]?.path.length ? "Arquivo com linhas inválidas." : "Nenhuma linha (máx. 500)." };
  const { supabase, acc } = await account(accountId);
  if (!acc) return { ok: false, message: "Conta não encontrada." };
  const ids = rows.data.map((r) => entryId(acc.id, r.ref));
  const dates = rows.data.map((r) => r.date).sort();
  const [{ data: imported }, { data: near }] = await Promise.all([
    supabase.from("fin_entries").select("id").in("id", ids),
    supabase
      .from("fin_postings")
      .select("amount_cents, fin_entries!inner(id, occurred_on, status)")
      .eq("account_id", acc.id)
      .gte("fin_entries.occurred_on", dates[0]!)
      .lte("fin_entries.occurred_on", dates.at(-1)!)
      .neq("fin_entries.status", "void"),
  ]);
  const done = new Set((imported ?? []).map((e) => e.id));
  const manual = (near ?? []).map((p) => ({ amount: Number(p.amount_cents), date: (p.fin_entries as { occurred_on: string; id: string }).occurred_on, id: (p.fin_entries as { id: string }).id }));
  return {
    ok: true,
    rows: rows.data.map((r) => {
      const id = entryId(acc.id, r.ref);
      const base = { ...r, category: guessCategory(r) };
      if (done.has(id)) return { ...base, status: "imported" as const };
      if (acc.kind === "credit_card" && r.amount > 0) return { ...base, status: "skip" as const, note: "pagamento/estorno do cartão: lance a fatura paga pela conta" };
      const dup = manual.some((m) => !done.has(m.id) && m.amount === r.amount && Math.abs(Date.parse(m.date) - Date.parse(r.date)) <= 2 * 864e5);
      return { ...base, status: dup ? ("duplicate" as const) : ("new" as const) };
    }),
  };
}

/** Grava as linhas escolhidas como realizadas, uma a uma pelo fin_record (transacional e idempotente). */
export async function importStatement(accountId: string, input: (Row & { category: string })[]): Promise<{ ok: boolean; message: string }> {
  await requireViewer();
  const rows = z.array(rowSchema.extend({ category: z.string().max(40) })).min(1).max(500).safeParse(input);
  if (!rows.success) return { ok: false, message: "Nada selecionado." };
  const { supabase, acc } = await account(accountId);
  if (!acc) return { ok: false, message: "Conta não encontrada." };
  await supabase.rpc("fin_ensure_categories", { p_workspace: acc.workspace_id });
  const { data: cats } = await supabase.from("fin_categories").select("id, name, kind").eq("workspace_id", acc.workspace_id);
  const catId = (kind: string, name: string) => cats?.find((c) => c.kind === kind && c.name === name)?.id ?? cats?.find((c) => c.kind === kind && c.name === "Outros")?.id ?? null;

  let created = 0, failed = 0;
  for (const r of rows.data) {
    if (acc.kind === "credit_card" && r.amount > 0) continue;
    const kind = r.amount < 0 ? "expense" : "income";
    const { error } = await supabase.rpc("fin_record", {
      p_id: entryId(acc.id, r.ref),
      p_kind: kind,
      p_workspace: acc.workspace_id,
      p_account: acc.id,
      p_amount_cents: Math.abs(r.amount),
      p_category: catId(kind, r.category),
      p_description: r.description,
      p_occurred_on: r.date,
    });
    if (error) failed++;
    else created++;
  }
  revalidatePath("/financas", "layout");
  return { ok: failed === 0, message: failed ? `${created} importados, ${failed} com erro.` : `${created} ${created === 1 ? "lançamento importado" : "lançamentos importados"} em ${acc.name}.` };
}
