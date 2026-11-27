"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { homeSpace } from "@/features/core/server/home-space";
import { PHOTO_PATH, removePhoto } from "@/features/core/server/photos";
import { parseMoneyBRL } from "@/features/finance/report";
import { createClient, requireViewer } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string };
const date = z.iso.date().or(z.literal(""));
const refresh = () => {
  revalidatePath("/vida/casa");
  revalidatePath("/");
};

const itemSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Dê um nome (ex.: Geladeira).").max(80),
  kind: z.enum(["eletro", "movel", "veiculo", "eletronico", "imovel", "outro"]),
  bought_on: date,
  price: z.string().max(20),
  warranty_until: date,
  notes: z.string().trim().max(1000),
  photo_path: z.string().regex(PHOTO_PATH).or(z.literal("")),
  remove_photo: z.literal("on").optional(),
});

/** Cadastra ou, com `id`, salva a edição. Foto nova (ou "tirar a foto") apaga a antiga do bucket. */
export async function saveItem(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = itemSchema.safeParse({
    ...Object.fromEntries(["id", "name", "kind", "bought_on", "price", "warranty_until", "notes", "photo_path"].map((k) => [k, String(form.get(k) ?? "")])),
    remove_photo: form.get("remove_photo") ?? undefined,
  });
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira os dados." };
  const { id, remove_photo, ...v } = p.data;
  if (v.bought_on && v.warranty_until && v.warranty_until < v.bought_on) return { ok: false, message: "A garantia termina antes da compra?" };
  const price = v.price.trim() ? parseMoneyBRL(v.price) : null;
  if (v.price.trim() && price === null) return { ok: false, message: "Valor inválido (ex.: 3.499,00)." };
  const space = await homeSpace(viewer);
  if (v.photo_path && !v.photo_path.startsWith(`${space.id}/`)) return { ok: false, message: "Foto inválida." };
  const supabase = await createClient();
  const row = {
    name: v.name, kind: v.kind, bought_on: v.bought_on || null, price_cents: price,
    warranty_until: v.warranty_until || null, notes: v.notes || null,
  };
  if (!id) {
    const { error } = await supabase.from("home_items").insert({ ...row, workspace_id: space.id, photo_path: v.photo_path || null });
    if (error) return { ok: false, message: "Não consegui salvar." };
    refresh();
    return { ok: true, message: `${v.name} cadastrado.` };
  }
  const { data: before } = await supabase.from("home_items").select("photo_path").eq("id", id).maybeSingle();
  if (!before) return { ok: false, message: "Item não encontrado." };
  const photo = v.photo_path || (remove_photo === "on" ? null : (before.photo_path ?? null));
  const { error } = await supabase.from("home_items").update({ ...row, photo_path: photo }).eq("id", id);
  if (error) return { ok: false, message: "Não consegui salvar." };
  if (before.photo_path && before.photo_path !== photo) await removePhoto(before.photo_path);
  refresh();
  return { ok: true, message: `${v.name} atualizado.` };
}

export async function deleteItem(id: string) {
  await requireViewer();
  const { data } = await (await createClient()).from("home_items").delete().eq("id", z.uuid().parse(id)).select("photo_path").maybeSingle();
  await removePhoto(data?.photo_path);
  refresh();
}

const maintSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  item_id: z.uuid(),
  description: z.string().trim().min(1, "O que foi feito?").max(200),
  done_on: z.iso.date(),
  cost: z.string().max(20),
  next_on: date,
});

/** Registra a manutenção ou, com `id`, salva a edição. */
export async function addMaintenance(_prev: Result | null, form: FormData): Promise<Result> {
  await requireViewer();
  const p = maintSchema.safeParse(Object.fromEntries(["id", "item_id", "description", "done_on", "cost", "next_on"].map((k) => [k, String(form.get(k) ?? "")])));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira os dados." };
  const { id, ...v } = p.data;
  if (v.next_on && v.next_on <= v.done_on) return { ok: false, message: "A próxima precisa ser depois desta." };
  const cost = v.cost.trim() ? parseMoneyBRL(v.cost) : null;
  if (v.cost.trim() && cost === null) return { ok: false, message: "Valor inválido." };
  // workspace_id é preenchido pelo banco a partir do item
  const row = { item_id: v.item_id, description: v.description, done_on: v.done_on, cost_cents: cost, next_on: v.next_on || null };
  const supabase = await createClient();
  const { error } = id ? await supabase.from("home_maintenance").update(row).eq("id", id) : await supabase.from("home_maintenance").insert(row);
  if (error) return { ok: false, message: "Não consegui salvar." };
  refresh();
  return { ok: true, message: id ? "Manutenção atualizada." : "Manutenção registrada." };
}

export async function deleteMaintenance(id: string) {
  await requireViewer();
  await (await createClient()).from("home_maintenance").delete().eq("id", z.uuid().parse(id));
  refresh();
}
