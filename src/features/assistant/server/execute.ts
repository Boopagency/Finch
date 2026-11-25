import "server-only";
import { getAgenda } from "@/features/agenda/server/queries";
import { brl } from "@/features/finance/money";
import { parseExpense } from "@/features/finance/quick-parse";
import { getFinance } from "@/features/finance/server/queries";
import { habitStatus } from "@/features/health/habits";
import { getHabits, getWaterToday, todayFor } from "@/features/health/server/queries";
import { parseItems } from "@/features/shopping/parse";
import { getLists } from "@/features/shopping/server/queries";
import { createTaskQuick } from "@/features/tasks/server/actions";
import { getTaskItems } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";
import type { Proposal, ToolName } from "../tools";

type Out = { result: unknown; proposal?: Proposal; changed?: boolean };

/** Executa uma ferramenta já validada, sempre como a pessoa logada. */
export async function execute(viewer: Viewer, name: ToolName, input: Record<string, unknown>): Promise<Out> {
  switch (name) {
    case "get_today": {
      const today = todayFor(viewer);
      const [water, habits, tasks, agenda] = await Promise.all([getWaterToday(viewer), getHabits(viewer, 7), getTaskItems(viewer, 1), getAgenda(viewer, today, today)]);
      return {
        result: {
          today,
          tasks: tasks.items.filter((t) => t.date && t.date <= today).map((t) => ({ title: t.title, time: t.time, done: t.status === "done", overdue: t.date! < today })),
          events: agenda.events.map((e) => ({ title: e.event.title, start: e.start, end: e.end })),
          water_ml: water.logs.reduce((n, l) => n + l.amount_ml, 0),
          water_goal_ml: water.settings.water_goal_ml,
          habits_pending: habits.habits.filter((h) => { const s = habitStatus(h, habits.logs, today); return s.scheduled && !s.done; }).map((h) => h.name),
        },
      };
    }
    case "get_finances_month": {
      const f = await getFinance(viewer, `${todayFor(viewer).slice(0, 7)}-01`);
      return {
        result: {
          month: f.month.slice(0, 7),
          available_in_accounts: brl(f.totals.free),
          income: brl(f.totals.income),
          expenses: brl(f.totals.expense),
          planned_income: brl(f.totals.plannedIncome),
          planned_expenses: brl(f.totals.plannedExpense),
          top_categories: f.byCategory.slice(0, 5).map((c) => ({ name: c.name, total: brl(c.total) })),
          has_accounts: f.accounts.length > 0,
        },
      };
    }
    case "create_task": {
      const r = await createTaskQuick(String(input.text));
      return { result: r, changed: r.ok };
    }
    case "log_water": {
      const { error } = await (await createClient()).from("water_logs").insert({ amount_ml: Number(input.amount_ml) });
      return { result: error ? { ok: false } : { ok: true, logged_ml: input.amount_ml }, changed: !error };
    }
    case "add_shopping_items": {
      const items = parseItems(String(input.text));
      const { lists } = await getLists(viewer);
      const list = lists.find((l) => l.shared) ?? lists[0];
      if (!list || !items.length) return { result: { ok: false, message: "sem lista ou sem itens" } };
      const { error } = await (await createClient())
        .from("shopping_items")
        .insert(items.map((i) => ({ list_id: list.id, workspace_id: list.workspace_id, name: i.name, qty: i.qty, unit: i.unit, category: i.category })));
      return { result: error ? { ok: false } : { ok: true, list: list.name, added: items.map((i) => i.name) }, changed: !error };
    }
    case "propose_expense": {
      const text = String(input.text);
      const p = parseExpense(text);
      if (!p.amount) return { result: { ok: false, message: "não achei o valor no texto" } };
      const summary = `${p.income ? "Receita" : "Gasto"} de ${brl(p.amount)}${p.description ? ` · ${p.description}` : ""}${p.category ? ` · ${p.category}` : ""}${p.installments > 1 ? ` · ${p.installments}x` : ""}`;
      return { result: { ok: true, status: "aguardando confirmação da pessoa na tela", summary }, proposal: { kind: "expense", text, summary } };
    }
  }
}
