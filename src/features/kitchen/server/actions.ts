"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guessCategory, type ParsedItem } from "@/features/shopping/parse";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { isLow, mergeItems, recipeItems, restockQty, splitOwned } from "../kitchen";
import { getKitchen, kitchenSpace } from "./queries";

type Result = { ok: boolean; message: string };
const uuid = z.uuid();
const refresh = () => {
  revalidatePath("/vida/cozinha");
  revalidatePath("/mercado", "layout");
};

/** Lista aberta do espaço da casa (cria "Mercado" se não houver) e insere os itens. */
async function addToList(workspaceId: string, items: ParsedItem[]): Promise<number> {
  if (!items.length) return 0;
  const supabase = await createClient();
  let { data: list } = await supabase.from("shopping_lists").select("id").eq("workspace_id", workspaceId).eq("status", "open").order("created_at").limit(1).maybeSingle();
  if (!list) ({ data: list } = await supabase.from("shopping_lists").insert({ workspace_id: workspaceId, name: "Mercado" }).select("id").single());
  if (!list) return 0;
  // não repete o que já está pendente na lista
  const { data: pending } = await supabase.from("shopping_items").select("name").eq("list_id", list.id).eq("checked", false);
  const there = new Set((pending ?? []).map((i) => i.name.toLowerCase()));
  const fresh = items.filter((i) => !there.has(i.name.toLowerCase()));
  if (!fresh.length) return 0;
  const { error } = await supabase
    .from("shopping_items")
    .insert(fresh.map((i) => ({ list_id: list.id, workspace_id: workspaceId, name: i.name, qty: i.qty, unit: i.unit, category: i.category })));
  return error ? 0 : fresh.length;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ---------- despensa ----------
const pantrySchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Dê um nome.").max(80),
  qty: z.coerce.number().min(0).max(9999),
  unit: z.string().trim().max(10),
  min_qty: z.coerce.number().min(0).max(9999),
  expires_on: z.iso.date().or(z.literal("")),
});

export async function savePantryItem(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const raw = Object.fromEntries(["id", "name", "qty", "unit", "min_qty", "expires_on"].map((k) => [k, String(form.get(k) ?? "").replace(",", ".")]));
  const p = pantrySchema.safeParse({ ...raw, name: String(form.get("name") ?? "") });
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira os dados." };
  const { id, ...v } = p.data;
  const row = { name: v.name, qty: v.qty, unit: v.unit || null, min_qty: v.min_qty, expires_on: v.expires_on || null, category: guessCategory(v.name), updated_at: new Date().toISOString() };
  const supabase = await createClient();
  const space = await kitchenSpace(viewer);
  const { error } = id
    ? await supabase.from("pantry_items").update(row).eq("id", id)
    : await supabase.from("pantry_items").insert({ ...row, workspace_id: space.id });
  if (error) return { ok: false, message: error.code === "23505" ? "Esse item já está na despensa." : "Não consegui salvar." };
  refresh();
  return { ok: true, message: id ? "Item atualizado." : "Na despensa." };
}

export async function adjustPantry(id: string, delta: number) {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("pantry_items").select("qty").eq("id", uuid.parse(id)).single();
  if (!data) return;
  const qty = Math.min(9999, Math.max(0, Math.round((Number(data.qty) + z.number().min(-100).max(100).parse(delta)) * 100) / 100));
  await supabase.from("pantry_items").update({ qty, updated_at: new Date().toISOString() }).eq("id", id);
  refresh();
}

export async function deletePantryItem(id: string) {
  await requireViewer();
  await (await createClient()).from("pantry_items").delete().eq("id", uuid.parse(id));
  refresh();
}

/** Tudo que está abaixo do mínimo vai para a lista. */
export async function restockLow(): Promise<Result> {
  const viewer = await requireViewer();
  const k = await getKitchen(viewer);
  const items = k.pantry.filter(isLow).map((p) => ({ name: p.name, qty: restockQty(p), unit: p.unit, category: p.category }));
  if (!items.length) return { ok: true, message: "Nada abaixo do mínimo." };
  const n = await addToList(k.space.id, items);
  refresh();
  return { ok: true, message: n ? `${plural(n, "item foi", "itens foram")} para a lista` : "Já estava tudo na lista." };
}

// ---------- receitas ----------
const recipeSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  title: z.string().trim().min(1, "Dê um nome à receita.").max(80),
  servings: z.coerce.number().int().min(1).max(50),
  prep_min: z.union([z.literal(""), z.coerce.number().int().min(1).max(1440)]),
  ingredients: z.string().max(4000),
  steps: z.string().max(8000),
});

export async function saveRecipe(_prev: Result | null, form: FormData): Promise<Result & { id?: string }> {
  const viewer = await requireViewer();
  const p = recipeSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira a receita." };
  const { id, prep_min, ...v } = p.data;
  const row = { ...v, prep_min: prep_min === "" ? null : prep_min };
  const supabase = await createClient();
  const space = await kitchenSpace(viewer);
  const res = id
    ? await supabase.from("recipes").update(row).eq("id", id).select("id").single()
    : await supabase.from("recipes").insert({ ...row, workspace_id: space.id }).select("id").single();
  if (res.error) return { ok: false, message: "Não consegui salvar a receita." };
  refresh();
  return { ok: true, message: id ? "Receita atualizada." : "Receita salva.", id: res.data.id };
}

export async function deleteRecipe(id: string) {
  await requireViewer();
  await (await createClient()).from("recipes").delete().eq("id", uuid.parse(id));
  refresh();
}

function report(n: number, have: number) {
  const parts = [n ? `${plural(n, "item foi", "itens foram")} para a lista` : "Nada novo para a lista"];
  if (have) parts.push(`${plural(have, "já tem", "já têm")} em casa`);
  return parts.join(" · ");
}

export async function recipeToList(id: string, servings: number): Promise<Result> {
  const viewer = await requireViewer();
  const k = await getKitchen(viewer);
  const r = k.recipes.find((x) => x.id === uuid.parse(id));
  if (!r) return { ok: false, message: "Receita não encontrada." };
  const factor = z.number().int().min(1).max(50).parse(servings) / r.servings;
  const { buy, have } = splitOwned(mergeItems(recipeItems(r.ingredients, factor)), k.pantry);
  const n = await addToList(k.space.id, buy);
  refresh();
  return { ok: true, message: report(n, have.length) };
}

// ---------- cardápio ----------
export async function planMeal(day: string, slot: string, value: string): Promise<Result> {
  const viewer = await requireViewer();
  const d = z.iso.date().parse(day);
  const s = z.enum(["cafe", "almoco", "jantar"]).parse(slot);
  const v = z.string().trim().max(80).parse(value);
  const supabase = await createClient();
  const space = await kitchenSpace(viewer);
  if (!v) {
    await supabase.from("meal_plan").delete().eq("workspace_id", space.id).eq("day", d).eq("slot", s);
    refresh();
    return { ok: true, message: "Refeição tirada." };
  }
  // "r:<id>" = receita salva; qualquer outro texto = refeição livre
  let recipe_id: string | null = null;
  let title = v;
  if (v.startsWith("r:")) {
    const { data: r } = await supabase.from("recipes").select("id, title").eq("id", uuid.parse(v.slice(2))).single();
    if (!r) return { ok: false, message: "Receita não encontrada." };
    recipe_id = r.id;
    title = r.title;
  }
  const { error } = await supabase.from("meal_plan").upsert({ workspace_id: space.id, day: d, slot: s, recipe_id, title }, { onConflict: "workspace_id,day,slot" });
  refresh();
  return error ? { ok: false, message: "Não consegui salvar." } : { ok: true, message: `${title} no cardápio` };
}

/** Ingredientes de todas as receitas da semana (somados), menos o que já tem em casa. */
export async function weekToList(): Promise<Result> {
  const viewer = await requireViewer();
  const k = await getKitchen(viewer);
  const byId = new Map(k.recipes.map((r) => [r.id, r]));
  const all = k.meals.flatMap((m) => (m.recipe_id && byId.get(m.recipe_id) ? recipeItems(byId.get(m.recipe_id)!.ingredients) : []));
  if (!all.length) return { ok: true, message: "Nenhuma receita no cardápio desta semana." };
  const { buy, have } = splitOwned(mergeItems(all), k.pantry);
  const n = await addToList(k.space.id, buy);
  refresh();
  return { ok: true, message: report(n, have.length) };
}
