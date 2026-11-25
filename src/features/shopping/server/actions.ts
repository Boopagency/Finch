"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayFor } from "@/features/health/server/queries";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { parseMoney } from "../parse";

type Result = { ok: boolean; message: string };

export async function createList(name: string, workspaceId: string): Promise<Result> {
  await requireViewer();
  const n = z.string().trim().min(1).max(60).safeParse(name);
  if (!n.success) return { ok: false, message: "Dê um nome à lista." };
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_lists").insert({ name: n.data, workspace_id: z.uuid().parse(workspaceId) });
  revalidatePath("/mercado");
  return error ? { ok: false, message: "Não consegui criar." } : { ok: true, message: "Lista criada." };
}

export async function deleteList(id: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("shopping_lists").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/mercado");
}

const itemSchema = z.object({
  id: z.uuid(),
  qty: z.coerce.number().positive().max(9999),
  unit: z.string().max(10).optional(),
  price: z.string().max(20).optional(),
  category: z.string().max(20),
  note: z.string().max(200).optional(),
});

export async function updateItem(_prev: Result | null, form: FormData): Promise<Result> {
  await requireViewer();
  const p = itemSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: "Confira os dados." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_items")
    .update({ qty: p.data.qty, unit: p.data.unit || null, est_price_cents: p.data.price ? parseMoney(p.data.price) : null, category: p.data.category, note: p.data.note || null })
    .eq("id", p.data.id);
  revalidatePath("/mercado", "layout");
  return error ? { ok: false, message: "Não consegui salvar." } : { ok: true, message: "Item salvo." };
}

export async function toggleFavorite(productId: string, favorite: boolean) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("products").update({ favorite }).eq("id", z.uuid().parse(productId));
  revalidatePath("/mercado", "layout");
}

const finishSchema = z.object({
  list_id: z.uuid(),
  store: z.string().trim().max(80).optional(),
  total: z.string().min(1, "Informe o valor total."),
  purchased_on: z.iso.date(),
  paid_by: z.uuid().optional().or(z.literal("")),
  payment: z.enum(["pix", "debito", "credito", "dinheiro", "vr", "va", "outro"]),
  carry_over: z.literal("on").optional(),
});

const PAY_ACCOUNT: Record<string, string[]> = {
  credito: ["credit_card"], pix: ["checking", "wallet", "savings"], debito: ["checking", "savings"], dinheiro: ["cash"], vr: ["meal"], va: ["food"], outro: [],
};

/**
 * Finaliza a compra (função SQL atômica e idempotente) e, se quem pagou foi você e há conta compatível,
 * lança a despesa com id = id da compra (repetir não duplica; despesa do casal dividida ao meio).
 */
export async function finishShopping(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = finishSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira os dados." };
  const cents = parseMoney(p.data.total);
  if (cents == null || cents <= 0) return { ok: false, message: "Valor inválido." };
  const supabase = await createClient();
  const { data: purchaseId, error } = await supabase.rpc("finish_shopping", {
    p_list_id: p.data.list_id,
    p_store: p.data.store ?? "",
    p_total_cents: cents,
    p_purchased_on: p.data.purchased_on || todayFor(viewer),
    p_paid_by: p.data.paid_by || viewer.id,
    p_payment: p.data.payment,
    p_carry_over: p.data.carry_over === "on",
  });
  if (error || !purchaseId) return { ok: false, message: "Não consegui finalizar." };

  let note = "";
  if ((p.data.paid_by || viewer.id) === viewer.id) {
    const { data: list } = await supabase.from("shopping_lists").select("workspace_id").eq("id", p.data.list_id).single();
    const { data: spaces } = await supabase.from("workspaces").select("id, kind");
    const personal = spaces?.find((s) => s.kind === "personal")?.id;
    const ws = list!.workspace_id;
    const { data: accounts } = await supabase.from("fin_accounts").select("id, kind, workspace_id").is("archived_at", null).order("created_at");
    const acc = (accounts ?? []).find((a) => (a.workspace_id === ws || a.workspace_id === personal) && PAY_ACCOUNT[p.data.payment]!.includes(a.kind));
    if (acc) {
      await supabase.rpc("fin_ensure_categories", { p_workspace: ws });
      const { data: cat } = await supabase.from("fin_categories").select("id").eq("workspace_id", ws).eq("kind", "expense").eq("name", "Mercado").maybeSingle();
      const shared = spaces?.find((s) => s.id === ws)?.kind === "shared";
      const { error: finError } = await supabase.rpc("fin_record", {
        p_id: purchaseId,
        p_kind: "expense",
        p_workspace: ws,
        p_account: acc.id,
        p_amount_cents: cents,
        p_category: cat?.id ?? null,
        p_description: p.data.store ? `Mercado · ${p.data.store}` : "Mercado",
        p_occurred_on: p.data.purchased_on || todayFor(viewer),
        p_split_method: shared ? "equal" : null,
        p_purchase: purchaseId,
      });
      note = finError ? " (não virou despesa: confira a conta em Finanças)" : " e lançada em Finanças";
    } else {
      note = ". Cadastre a conta/cartão em Finanças para ela virar despesa sozinha";
    }
  }
  revalidatePath("/", "layout");
  return { ok: true, message: `Compra registrada${note}.` };
}
