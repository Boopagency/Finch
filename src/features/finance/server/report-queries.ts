import "server-only";
import { getSpaces } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { addMonths } from "../money";
import { compareCategories, type CatRow } from "../report";

const ENTRY = "id, kind, description, occurred_on, month, status, workspace_id, fin_categories(name), fin_postings(amount_cents, fin_accounts(name))";

/** Lançamentos de um intervalo de competências (sem cancelados). */
async function entriesBetween(from: string, to: string) {
  const { data } = await (await createClient())
    .from("fin_entries")
    .select(ENTRY)
    .gte("month", from)
    .lte("month", to)
    .neq("status", "void")
    .order("occurred_on");
  return (data ?? []).map((e) => {
    const ps = e.fin_postings ?? [];
    const main = ps.find((p) => p.amount_cents < 0) ?? ps[0];
    return {
      ...e,
      category: (e.fin_categories as { name: string } | null)?.name ?? "Sem categoria",
      account: (main?.fin_accounts as { name: string } | null)?.name ?? "",
      amount: Math.abs(Number(main?.amount_cents ?? 0)),
    };
  });
}

/** Mês pedido + 5 anteriores: totais por mês e categorias do mês vs. o anterior. Só realizados. */
export async function getReport(month: string) {
  const from = addMonths(month, -5);
  const all = (await entriesBetween(from, month)).filter((e) => e.status === "posted");
  const months = Array.from({ length: 6 }, (_, i) => addMonths(from, i));
  const series = months.map((m) => {
    const es = all.filter((e) => e.month === m);
    const sum = (k: string) => es.filter((e) => e.kind === k).reduce((n, e) => n + e.amount, 0);
    return { month: m, income: sum("income"), expense: sum("expense") - sum("refund") };
  });
  const cats = (m: string): CatRow[] => {
    const map = new Map<string, number>();
    for (const e of all.filter((x) => x.month === m && x.kind === "expense")) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    return [...map].map(([name, total]) => ({ name, total }));
  };
  return { month, series, categories: compareCategories(cats(month), cats(addMonths(month, -1))) };
}

const KIND: Record<string, string> = { expense: "Despesa", income: "Receita", transfer: "Transferência", card_payment: "Pagamento de fatura", refund: "Estorno" };
const STATUS: Record<string, string> = { posted: "Realizado", planned: "Previsto" };

/** Linhas do CSV de um mês (todas as contas que o usuário pode ver). */
export async function getCsvRows(viewer: Viewer, month: string) {
  const [spaces, entries] = await Promise.all([getSpaces(viewer), entriesBetween(month, month)]);
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  return entries.map((e) => [
    e.occurred_on, e.description, KIND[e.kind] ?? e.kind, e.kind === "expense" || e.kind === "income" ? e.category : "", e.account,
    STATUS[e.status] ?? e.status, spaceName.get(e.workspace_id) ?? "", e.kind === "expense" ? -e.amount : e.amount,
  ]);
}
