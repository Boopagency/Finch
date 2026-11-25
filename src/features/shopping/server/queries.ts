import "server-only";
import type { ShopItem } from "@/features/sync/ops";
import { getSpaces, type Space } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";

export type ListSummary = { id: string; name: string; workspace_id: string; shared: boolean; total: number; pending: number; budget_cents: number | null };

/** Listas abertas; cria "Mercado" (no espaço Nós, se houver) quando não existe nenhuma. */
export async function getLists(viewer: Viewer): Promise<{ lists: ListSummary[]; spaces: Space[] }> {
  const supabase = await createClient();
  const spaces = await getSpaces(viewer);
  const read = () =>
    supabase.from("shopping_lists").select("id, name, workspace_id, budget_cents, shopping_items(checked)").eq("status", "open").order("created_at");
  let { data } = await read();
  if (!data?.length) {
    const target = spaces.find((s) => s.kind === "shared") ?? spaces.find((s) => s.kind === "personal");
    if (target) {
      await supabase.from("shopping_lists").insert({ workspace_id: target.id, name: "Mercado" });
      ({ data } = await read());
    }
  }
  const shared = new Set(spaces.filter((s) => s.kind === "shared").map((s) => s.id));
  return {
    spaces,
    lists: (data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      workspace_id: l.workspace_id,
      shared: shared.has(l.workspace_id),
      budget_cents: l.budget_cents,
      total: l.shopping_items.length,
      pending: l.shopping_items.filter((i) => !i.checked).length,
    })),
  };
}

export async function getList(viewer: Viewer, id: string) {
  const supabase = await createClient();
  const [{ data: list }, { data: items }, spaces] = await Promise.all([
    supabase.from("shopping_lists").select("id, name, workspace_id, status, budget_cents").eq("id", id).maybeSingle(),
    supabase.from("shopping_items").select("id, name, qty, unit, category, checked, est_price_cents, note").eq("list_id", id).order("created_at"),
    getSpaces(viewer),
  ]);
  if (!list) return null;
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, unit, favorite, times_bought, last_price_cents")
    .eq("workspace_id", list.workspace_id)
    .order("favorite", { ascending: false })
    .order("times_bought", { ascending: false })
    .limit(40);
  const members = spaces.find((s) => s.id === list.workspace_id)?.members ?? [];
  return { list, items: (items ?? []).map((i) => ({ ...i, qty: Number(i.qty) })) as ShopItem[], products: products ?? [], members };
}

export async function getRecentPurchases(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("purchases")
    .select("id, store, total_cents, purchased_on, payment, items_count, paid_by")
    .order("purchased_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
