import "server-only";
import { todayFor } from "@/features/health/server/queries";
import { getSpaces, type Space } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { coupleBalance, dueDate, statementMonth } from "../money";

export type Account = {
  id: string; name: string; kind: string; workspace_id: string; balance: number;
  card_limit_cents: number | null; closing_day: number | null; due_day: number | null; archived: boolean;
};
export type Entry = {
  id: string; kind: string; description: string; occurred_on: string; month: string; status: string; workspace_id: string;
  category: string | null; category_id: string | null; amount: number; account_id: string | null; to_account_id: string | null;
  installment_no: number | null; installments: number | null; group_id: string | null; split: { paid_by: string; shares: Record<string, number> } | null;
};

const FREE = new Set(["checking", "savings", "cash", "wallet"]);
const BENEFIT = new Set(["meal", "food"]);

export async function getFinance(viewer: Viewer, month: string) {
  const supabase = await createClient();
  const spaces = await getSpaces(viewer);
  await Promise.all(spaces.map((s) => supabase.rpc("fin_ensure_categories", { p_workspace: s.id })));
  const shared = spaces.find((s) => s.kind === "shared") ?? null;

  const [acc, bal, cats, entries, splits, setts, budgets, members] = await Promise.all([
    supabase.from("fin_accounts").select("id, name, kind, workspace_id, card_limit_cents, closing_day, due_day, archived_at").order("created_at"),
    supabase.from("fin_account_balances").select("account_id, balance_cents"),
    supabase.from("fin_categories").select("id, name, kind, workspace_id").is("archived_at", null).order("name"),
    supabase
      .from("fin_entries")
      .select("id, kind, description, occurred_on, month, status, workspace_id, category_id, installment_no, installments, group_id, fin_categories(name), fin_postings(account_id, amount_cents)")
      .eq("month", month)
      .neq("status", "void")
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    shared ? supabase.from("fin_splits").select("entry_id, paid_by, total_cents, shares, fin_entries!inner(status)").eq("workspace_id", shared.id) : Promise.resolve({ data: [] }),
    shared ? supabase.from("fin_settlements").select("from_user, to_user, amount_cents").eq("workspace_id", shared.id).is("voided_at", null) : Promise.resolve({ data: [] }),
    supabase.from("fin_budgets").select("workspace_id, category_id, limit_cents"),
    shared ? supabase.from("workspace_members").select("user_id, reference_income_cents").eq("workspace_id", shared.id) : Promise.resolve({ data: [] }),
  ]);

  const balOf = new Map((bal.data ?? []).map((b) => [b.account_id, Number(b.balance_cents)]));
  const accounts: Account[] = (acc.data ?? []).map((a) => ({
    id: a.id, name: a.name, kind: a.kind, workspace_id: a.workspace_id, balance: balOf.get(a.id) ?? 0,
    card_limit_cents: a.card_limit_cents, closing_day: a.closing_day, due_day: a.due_day, archived: !!a.archived_at,
  }));
  const splitOf = new Map(
    (splits.data ?? []).map((s) => [s.entry_id, { paid_by: s.paid_by, shares: s.shares as Record<string, number> }]),
  );
  const list: Entry[] = (entries.data ?? []).map((e) => {
    const ps = e.fin_postings ?? [];
    const from = ps.find((p) => p.amount_cents < 0) ?? ps[0];
    const to = ps.find((p) => p.amount_cents > 0 && p !== from);
    return {
      id: e.id, kind: e.kind, description: e.description, occurred_on: e.occurred_on, month: e.month, status: e.status, workspace_id: e.workspace_id,
      category: (e.fin_categories as { name: string } | null)?.name ?? null, category_id: e.category_id,
      amount: Math.abs(Number(from?.amount_cents ?? 0)), account_id: from?.account_id ?? null, to_account_id: to?.account_id ?? null,
      installment_no: e.installment_no, installments: e.installments, group_id: e.group_id, split: splitOf.get(e.group_id ?? e.id) ?? null,
    };
  });

  const today = todayFor(viewer);
  const live = accounts.filter((a) => !a.archived);
  const cards = live
    .filter((a) => a.kind === "credit_card")
    .map((c) => {
      const current = statementMonth(today, c.closing_day!);
      const statement = list.filter((e) => e.account_id === c.id && e.kind === "expense" && e.month === month).reduce((n, e) => n + e.amount, 0);
      const used = Math.max(0, -c.balance);
      return { ...c, used, available: (c.card_limit_cents ?? 0) - used, currentStatement: current, statement, due: dueDate(month, c.closing_day!, c.due_day!) };
    });
  const flows = list.filter((e) => e.status === "posted" || e.status === "planned");
  const sum = (k: string, st?: string) => flows.filter((e) => e.kind === k && (!st || e.status === st)).reduce((n, e) => n + e.amount, 0);
  const byCategory = new Map<string, { id: string | null; name: string; total: number }>();
  for (const e of flows.filter((x) => x.kind === "expense" && x.status === "posted")) {
    const k = e.category_id ?? "none";
    const cur = byCategory.get(k) ?? { id: e.category_id, name: e.category ?? "Sem categoria", total: 0 };
    cur.total += e.amount;
    byCategory.set(k, cur);
  }
  const allSplits = (splits.data ?? []).filter((s) => (s.fin_entries as { status: string } | null)?.status !== "void");
  const balance = shared
    ? coupleBalance(
        allSplits.map((s) => ({ paid_by: s.paid_by, total: Number(s.total_cents), shares: s.shares as Record<string, number> })),
        (setts.data ?? []).map((t) => ({ from_user: t.from_user, to_user: t.to_user, amount: Number(t.amount_cents) })),
      )
    : {};

  return {
    today,
    month,
    spaces,
    shared,
    accounts,
    categories: cats.data ?? [],
    entries: list,
    budgets: budgets.data ?? [],
    incomes: (members.data ?? []) as { user_id: string; reference_income_cents: number | null }[],
    totals: {
      free: live.filter((a) => FREE.has(a.kind)).reduce((n, a) => n + a.balance, 0),
      benefits: live.filter((a) => BENEFIT.has(a.kind)).reduce((n, a) => n + a.balance, 0),
      invested: live.filter((a) => a.kind === "investment").reduce((n, a) => n + a.balance, 0),
      income: sum("income", "posted"),
      expense: sum("expense", "posted") - sum("refund", "posted"),
      plannedIncome: sum("income", "planned"),
      plannedExpense: sum("expense", "planned"),
    },
    cards,
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
    couple: shared ? { balance, members: shared.members as Space["members"] } : null,
  };
}
export type FinanceData = Awaited<ReturnType<typeof getFinance>>;
