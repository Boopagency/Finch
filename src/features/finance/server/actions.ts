"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayFor } from "@/features/health/server/queries";
import { parseMoney } from "@/features/shopping/parse";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { parseExpense } from "../quick-parse";

type Result = { ok: boolean; message: string };
const ERR: [RegExp, string][] = [
  [/account not allowed/, "Essa conta não pode ser usada aqui."],
  [/installments only/, "Parcelar só no cartão de crédito."],
  [/income cannot go to a card/, "Receita não entra em cartão de crédito."],
  [/card payment/, "Pagamento de fatura: de uma conta para um cartão."],
  [/invalid destination/, "Escolha a conta de destino."],
  [/split weights|rendas/, "Para dividir pela renda, informem as rendas de referência em Finanças → Contas."],
  [/fixed shares/, "Os valores fixos precisam somar o total."],
  [/always posted/, "Compra no cartão não pode ficar como prevista."],
];
const friendly = (m: string) => ERR.find(([re]) => re.test(m))?.[1] ?? "Não consegui registrar.";
const done = (error: { message: string } | null, ok: string): Result => {
  revalidatePath("/", "layout");
  return error ? { ok: false, message: friendly(error.message) } : { ok: true, message: ok };
};

const entrySchema = z.object({
  id: z.uuid(),
  kind: z.enum(["expense", "income", "transfer", "card_payment", "refund"]),
  workspace_id: z.uuid(),
  account_id: z.uuid("Escolha a conta."),
  to_account_id: z.uuid().optional().or(z.literal("")),
  amount: z.string().min(1, "Informe o valor."),
  category_id: z.uuid().optional().or(z.literal("")),
  description: z.string().max(200).optional(),
  occurred_on: z.iso.date(),
  planned: z.literal("on").optional(),
  installments: z.coerce.number().int().min(1).max(36).default(1),
  split: z.enum(["", "equal", "income", "percent"]).default(""),
  my_percent: z.coerce.number().min(0).max(100).optional(),
});

export async function recordEntry(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = entrySchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira os dados." };
  const v = p.data;
  const cents = parseMoney(v.amount);
  if (!cents || cents <= 0) return { ok: false, message: "Valor inválido." };
  const supabase = await createClient();
  let weights: Record<string, number> | null = null;
  if (v.split === "percent") {
    const { data: m } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", v.workspace_id);
    const mine = v.my_percent ?? 50;
    weights = Object.fromEntries((m ?? []).map((x) => [x.user_id, x.user_id === viewer.id ? mine : (100 - mine) / Math.max(1, (m?.length ?? 2) - 1)]));
  }
  const { error } = await supabase.rpc("fin_record", {
    p_id: v.id,
    p_kind: v.kind,
    p_workspace: v.workspace_id,
    p_account: v.account_id,
    p_amount_cents: cents,
    p_category: v.category_id || null,
    p_description: v.description ?? "",
    p_occurred_on: v.occurred_on,
    p_status: v.planned ? "planned" : "posted",
    p_to_account: v.to_account_id || null,
    p_installments: v.installments,
    p_split_method: v.kind === "expense" && v.split ? v.split : null,
    p_split_weights: weights,
  });
  return done(error, v.kind === "income" ? "Receita registrada." : v.kind === "expense" ? "Despesa registrada." : "Registrado.");
}

/** "180 mercado crédito" → despesa na conta certa, com categoria. */
export async function quickExpense(text: string, workspaceId?: string): Promise<Result> {
  const viewer = await requireViewer();
  const p = parseExpense(z.string().max(200).parse(text));
  if (!p.amount) return { ok: false, message: "Faltou o valor. Ex.: 180 mercado crédito" };
  const supabase = await createClient();
  const { data: spaces } = await supabase.from("workspaces").select("id, kind");
  const personal = spaces?.find((s) => s.kind === "personal")?.id;
  const ws = spaces?.some((s) => s.id === workspaceId) ? workspaceId! : personal!;
  await supabase.rpc("fin_ensure_categories", { p_workspace: ws });
  const { data: accounts } = await supabase.from("fin_accounts").select("id, kind, workspace_id").is("archived_at", null).order("created_at");
  const mineOrHere = (accounts ?? []).filter((a) => a.workspace_id === ws || a.workspace_id === personal);
  const want = { card: ["credit_card"], checking: ["checking", "wallet", "savings"], cash: ["cash"], benefit: ["meal", "food"] }[p.payment ?? "checking"] ?? ["checking"];
  const account = mineOrHere.find((a) => want.includes(a.kind)) ?? (p.payment ? null : mineOrHere.find((a) => a.kind !== "credit_card"));
  if (!account) return { ok: false, message: p.payment === "card" ? "Cadastre um cartão em Finanças → Contas." : "Cadastre uma conta em Finanças → Contas." };
  const { data: cats } = await supabase.from("fin_categories").select("id, name").eq("workspace_id", ws).eq("kind", p.income ? "income" : "expense");
  const cat = cats?.find((c) => c.name === (p.income ? "Salário" : p.category)) ?? cats?.find((c) => c.name === "Outros");
  const shared = spaces?.find((s) => s.id === ws)?.kind === "shared";
  const { error } = await supabase.rpc("fin_record", {
    p_id: crypto.randomUUID(),
    p_kind: p.income ? "income" : "expense",
    p_workspace: ws,
    p_account: account.id,
    p_amount_cents: p.amount,
    p_category: cat?.id ?? null,
    p_description: p.description,
    p_occurred_on: todayFor(viewer),
    p_installments: p.installments,
    p_split_method: shared && !p.income ? "equal" : null,
  });
  return done(error, `${p.income ? "Receita" : "Despesa"} de ${(p.amount / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${p.installments > 1 ? ` em ${p.installments}x` : ""}${p.category ? ` · ${p.category}` : ""}`);
}

export async function voidEntry(id: string): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("fin_void", { p_id: z.uuid().parse(id) });
  return done(error, "Lançamento cancelado (fica no histórico).");
}

export async function confirmEntry(id: string): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("fin_confirm", { p_id: z.uuid().parse(id) });
  return done(error, "Confirmado.");
}

export async function settle(workspaceId: string, to: string, amountCents: number): Promise<Result> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("fin_settle", {
    p_workspace: z.uuid().parse(workspaceId), p_to: z.uuid().parse(to), p_amount: z.number().int().positive().parse(amountCents), p_on: todayFor(viewer),
  });
  return done(error, "Acerto registrado.");
}

const accountSchema = z.object({
  workspace_id: z.uuid(),
  name: z.string().trim().min(1, "Dê um nome.").max(60),
  kind: z.enum(["checking", "savings", "cash", "wallet", "investment", "meal", "food", "credit_card"]),
  opening: z.string().optional(),
  limit: z.string().optional(),
  closing_day: z.coerce.number().int().min(1).max(31).optional(),
  due_day: z.coerce.number().int().min(1).max(31).optional(),
});

export async function createAccount(_prev: Result | null, form: FormData): Promise<Result> {
  await requireViewer();
  const p = accountSchema.safeParse(Object.fromEntries([...form].filter(([, v]) => v !== "")));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira os dados." };
  const v = p.data;
  const card = v.kind === "credit_card";
  if (card && (!v.limit || !v.closing_day || !v.due_day)) return { ok: false, message: "Cartão precisa de limite, dia de fechamento e vencimento." };
  const supabase = await createClient();
  const { error } = await supabase.from("fin_accounts").insert({
    workspace_id: v.workspace_id, name: v.name, kind: v.kind,
    opening_balance_cents: card ? 0 : (parseMoney(v.opening ?? "") ?? 0),
    card_limit_cents: card ? parseMoney(v.limit!) : null, closing_day: card ? v.closing_day : null, due_day: card ? v.due_day : null,
  });
  return done(error, card ? "Cartão cadastrado." : "Conta cadastrada.");
}

export async function archiveAccount(id: string): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.from("fin_accounts").update({ archived_at: new Date().toISOString() }).eq("id", z.uuid().parse(id));
  return done(error, "Conta arquivada (o histórico fica).");
}

export async function setReferenceIncome(workspaceId: string, value: string): Promise<Result> {
  const viewer = await requireViewer();
  const cents = parseMoney(value);
  if (cents == null || cents < 0) return { ok: false, message: "Valor inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_members").update({ reference_income_cents: cents }).eq("workspace_id", z.uuid().parse(workspaceId)).eq("user_id", viewer.id);
  return done(error, "Renda de referência salva. Só o valor é compartilhado, nada das suas contas.");
}

export async function setBudget(workspaceId: string, categoryId: string, value: string): Promise<Result> {
  await requireViewer();
  const cents = parseMoney(value);
  const supabase = await createClient();
  const { error } = cents
    ? await supabase.from("fin_budgets").upsert({ workspace_id: z.uuid().parse(workspaceId), category_id: z.uuid().parse(categoryId), limit_cents: cents })
    : await supabase.from("fin_budgets").delete().eq("workspace_id", workspaceId).eq("category_id", categoryId);
  return done(error, cents ? "Orçamento salvo." : "Orçamento removido.");
}
