"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { homeSpace } from "@/features/core/server/home-space";
import { PHOTO_PATH, removePhoto } from "@/features/core/server/photos";
import { SPECIES, type Care } from "../pet";
import { createClient, requireViewer } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string };
const uuid = z.uuid();
const issue = (e: z.ZodError) => e.issues[0]?.message ?? "Confira os dados.";
const done = (path: string, message: string): Result => {
  revalidatePath(path);
  revalidatePath("/");
  return { ok: true, message };
};

// ---------- datas ----------
const dateSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  title: z.string().trim().min(1, "Dê um nome à data.").max(60),
  on_date: z.iso.date({ error: "Escolha a data." }),
  yearly: z.literal("on").optional(),
});

/** Guarda uma data nova ou, com `id`, salva a edição (o espaço nunca muda). */
export async function saveDate(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = dateSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: issue(p.error) };
  const { id, ...v } = p.data;
  const row = { title: v.title, on_date: v.on_date, yearly: v.yearly === "on" };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("special_dates").update(row).eq("id", id)
    : await supabase.from("special_dates").insert({ ...row, workspace_id: (await homeSpace(viewer)).id });
  return error ? { ok: false, message: "Não consegui salvar." } : done("/vida/nos", id ? "Data atualizada." : "Data guardada.");
}

export async function deleteDate(id: string) {
  await requireViewer();
  await (await createClient()).from("special_dates").delete().eq("id", uuid.parse(id));
  revalidatePath("/vida/nos");
}

// ---------- lugares ----------
const placeSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Dê um nome ao lugar.").max(80),
  kind: z.enum(["restaurante", "viagem", "passeio", "outro"]),
  note: z.string().trim().max(500),
});

export async function savePlace(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = placeSchema.safeParse({ id: form.get("id") ?? "", name: form.get("name"), kind: form.get("kind"), note: form.get("note") ?? "" });
  if (!p.success) return { ok: false, message: issue(p.error) };
  const { id, ...v } = p.data;
  const row = { name: v.name, kind: v.kind, note: v.note || null };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("places").update(row).eq("id", id)
    : await supabase.from("places").insert({ ...row, workspace_id: (await homeSpace(viewer)).id });
  return error ? { ok: false, message: "Não consegui salvar." } : done("/vida/nos", id ? "Lugar atualizado." : "Na lista de vocês.");
}

/** Marca como visitado (com nota 1–5) ou volta para "queremos ir". */
export async function markVisited(id: string, rating: number | null) {
  await requireViewer();
  const r = rating === null ? null : z.number().int().min(1).max(5).parse(rating);
  await (await createClient())
    .from("places")
    .update(r === null ? { status: "quero", rating: null, visited_on: null } : { status: "fomos", rating: r, visited_on: new Date().toISOString().slice(0, 10) })
    .eq("id", uuid.parse(id));
  revalidatePath("/vida/nos");
}

export async function deletePlace(id: string) {
  await requireViewer();
  await (await createClient()).from("places").delete().eq("id", uuid.parse(id));
  revalidatePath("/vida/nos");
}

// ---------- memórias ----------
const memorySchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  title: z.string().trim().min(1, "Dê um título.").max(80),
  body: z.string().trim().max(4000),
  happened_on: z.iso.date(),
  photo_path: z.string().regex(PHOTO_PATH).or(z.literal("")),
  remove_photo: z.literal("on").optional(),
});

/**
 * Guarda ou edita a memória. Na edição: sem foto nova, a de antes fica; com foto nova ou com "tirar a foto",
 * a antiga sai do bucket (nada de arquivo órfão).
 */
export async function saveMemory(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = memorySchema.safeParse({
    id: form.get("id") ?? "", title: form.get("title"), body: form.get("body") ?? "",
    happened_on: form.get("happened_on"), photo_path: form.get("photo_path") ?? "", remove_photo: form.get("remove_photo") ?? undefined,
  });
  if (!p.success) return { ok: false, message: issue(p.error) };
  const { id, remove_photo, ...v } = p.data;
  const space = await homeSpace(viewer);
  if (v.photo_path && !v.photo_path.startsWith(`${space.id}/`)) return { ok: false, message: "Foto inválida." };
  const supabase = await createClient();
  if (!id) {
    const { error } = await supabase.from("memories").insert({ workspace_id: space.id, ...v, photo_path: v.photo_path || null });
    return error ? { ok: false, message: "Não consegui salvar." } : done("/vida/nos", "Memória guardada.");
  }
  const { data: before } = await supabase.from("memories").select("photo_path").eq("id", id).maybeSingle();
  if (!before) return { ok: false, message: "Memória não encontrada." };
  const photo = v.photo_path || (remove_photo === "on" ? null : (before.photo_path ?? null));
  const { error } = await supabase.from("memories").update({ title: v.title, body: v.body, happened_on: v.happened_on, photo_path: photo }).eq("id", id);
  if (error) return { ok: false, message: "Não consegui salvar." };
  if (before.photo_path && before.photo_path !== photo) await removePhoto(before.photo_path);
  return done("/vida/nos", "Memória atualizada.");
}

export async function deleteMemory(id: string) {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("memories").delete().eq("id", uuid.parse(id)).select("photo_path").maybeSingle();
  await removePhoto(data?.photo_path);
  revalidatePath("/vida/nos");
}

// ---------- metas ----------
const num = z.string().trim().transform((s) => Number(s.replace(/\./g, "").replace(",", ".")));
const goalSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  workspace_id: z.uuid(),
  title: z.string().trim().min(1, "Dê um nome à meta.").max(80),
  target: num.pipe(z.number({ error: "Alvo inválido." }).positive("O alvo precisa ser maior que zero.").max(1e12)),
  unit: z.string().trim().max(12),
  due_on: z.iso.date().or(z.literal("")),
});

export async function saveGoal(_prev: Result | null, form: FormData): Promise<Result> {
  await requireViewer();
  const p = goalSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: issue(p.error) };
  const { id, workspace_id, ...v } = p.data;
  const row = { title: v.title, target: v.target, unit: v.unit || null, due_on: v.due_on || null };
  const supabase = await createClient();
  // o progresso já somado não muda ao editar a meta
  const { error } = id ? await supabase.from("goals").update(row).eq("id", id) : await supabase.from("goals").insert({ ...row, workspace_id });
  return error ? { ok: false, message: "Não consegui salvar a meta." } : done("/vida/metas", id ? "Meta atualizada." : "Meta criada.");
}

export async function addToGoal(id: string, raw: string): Promise<Result> {
  await requireViewer();
  const delta = Number(raw.trim().replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(delta) || delta === 0 || Math.abs(delta) > 1e9) return { ok: false, message: "Valor inválido." };
  const { data, error } = await (await createClient()).rpc("goal_add", { p_goal: uuid.parse(id), p_delta: delta });
  if (error || !data) return { ok: false, message: "Não consegui atualizar." };
  return done("/vida/metas", data.done_at ? `Meta batida: ${data.title}!` : "Progresso salvo.");
}

export async function deleteGoal(id: string) {
  await requireViewer();
  await (await createClient()).from("goals").delete().eq("id", uuid.parse(id));
  revalidatePath("/vida/metas");
}

// ---------- recados ----------
const messageSchema = z.object({
  body: z.string().trim().max(2000),
  photo_path: z.string().regex(PHOTO_PATH).or(z.literal("")),
});

/** Manda um recado para a outra pessoa (texto, foto, ou os dois). */
export async function sendMessage(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = messageSchema.safeParse({ body: form.get("body") ?? "", photo_path: form.get("photo_path") ?? "" });
  if (!p.success) return { ok: false, message: issue(p.error) };
  if (!p.data.body && !p.data.photo_path) return { ok: false, message: "Escreva alguma coisa ou mande uma foto." };
  const space = await homeSpace(viewer);
  if (space.kind !== "shared") return { ok: false, message: "Convide a outra pessoa em Ajustes para usar os recados." };
  if (p.data.photo_path && !p.data.photo_path.startsWith(`${space.id}/`)) return { ok: false, message: "Foto inválida." };
  const supabase = await createClient();
  const { data: msg, error } = await supabase
    .from("couple_messages")
    .insert({ workspace_id: space.id, body: p.data.body || null, photo_path: p.data.photo_path || null })
    .select("id")
    .single();
  if (error || !msg) return { ok: false, message: "Não consegui enviar." };
  // avisa no celular da outra pessoa (o texto do recado não vai no push)
  await supabase.rpc("notify_partner_message", { p_message: msg.id });
  revalidatePath("/vida/nos");
  revalidatePath("/");
  return { ok: true, message: "Recado enviado." };
}

export async function editMessage(id: string, body: string): Promise<Result> {
  await requireViewer();
  const t = z.string().trim().min(1).max(2000).safeParse(body);
  if (!t.success) return { ok: false, message: "O recado não pode ficar vazio." };
  // a RLS deixa só o autor editar
  const { error } = await (await createClient()).from("couple_messages").update({ body: t.data, edited_at: new Date().toISOString() }).eq("id", uuid.parse(id));
  if (error) return { ok: false, message: "Não consegui salvar." };
  revalidatePath("/vida/nos");
  return { ok: true, message: "Recado editado." };
}

export async function deleteMessage(id: string) {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("couple_messages").delete().eq("id", uuid.parse(id)).select("photo_path").maybeSingle();
  await removePhoto(data?.photo_path);
  revalidatePath("/vida/nos");
}

/** Marca como lidos os recados do outro (a tela chama ao abrir a aba). */
export async function markRead(): Promise<number> {
  const viewer = await requireViewer();
  const space = await homeSpace(viewer);
  if (space.kind !== "shared") return 0;
  const { data } = await (await createClient()).rpc("mark_messages_read", { p_workspace: space.id });
  if (data) revalidatePath("/");
  return data ?? 0;
}

// ---------- bichinho ----------
/** Adota (ou renomeia/troca a espécie, se já existir): um bichinho por espaço. */
export async function savePet(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = z
    .object({ species: z.enum(Object.keys(SPECIES) as [string, ...string[]]), name: z.string().trim().min(1, "Dê um nome ao bichinho.").max(30) })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: issue(p.error) };
  const space = await homeSpace(viewer);
  const supabase = await createClient();
  const { data: has } = await supabase.from("pets").select("id").eq("workspace_id", space.id).maybeSingle();
  const { error } = has
    ? await supabase.from("pets").update({ species: p.data.species, name: p.data.name }).eq("id", has.id)
    : await supabase.from("pets").insert({ workspace_id: space.id, species: p.data.species, name: p.data.name });
  if (error) return { ok: false, message: "Não consegui salvar o bichinho." };
  revalidatePath("/vida/nos");
  revalidatePath("/");
  return { ok: true, message: has ? `${p.data.name} está de cara nova!` : `${p.data.name} chegou!` };
}

/** Cuida do bichinho (função SQL: soma o amor e marca a hora de uma vez; uma vez por dia por tipo e por pessoa). */
export async function carePet(petId: string, kind: Care, note?: string): Promise<Result & { love?: number; gained?: number }> {
  await requireViewer();
  const { data, error } = await (await createClient()).rpc("pet_care", {
    p_pet: uuid.parse(petId),
    p_kind: z.enum(["comida", "carinho", "brincar", "mimo"]).parse(kind),
    p_note: z.string().trim().max(140).optional().parse(note) || undefined,
  });
  const r = data?.[0];
  if (error || !r) return { ok: false, message: "Não consegui agora." };
  revalidatePath("/vida/nos");
  revalidatePath("/");
  return { ok: true, message: r.already ? "Ele já ganhou esse mimo hoje — e ficou feliz de novo." : `+${r.gained} de amor!`, love: r.love, gained: r.gained };
}
