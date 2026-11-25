"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { homeSpace } from "@/features/core/server/home-space";
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
  title: z.string().trim().min(1, "Dê um nome à data.").max(60),
  on_date: z.iso.date({ error: "Escolha a data." }),
  yearly: z.literal("on").optional(),
});

export async function saveDate(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = dateSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: issue(p.error) };
  const space = await homeSpace(viewer);
  const { error } = await (await createClient())
    .from("special_dates")
    .insert({ workspace_id: space.id, title: p.data.title, on_date: p.data.on_date, yearly: p.data.yearly === "on" });
  return error ? { ok: false, message: "Não consegui salvar." } : done("/vida/nos", "Data guardada.");
}

export async function deleteDate(id: string) {
  await requireViewer();
  await (await createClient()).from("special_dates").delete().eq("id", uuid.parse(id));
  revalidatePath("/vida/nos");
}

// ---------- lugares ----------
const placeSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao lugar.").max(80),
  kind: z.enum(["restaurante", "viagem", "passeio", "outro"]),
  note: z.string().trim().max(500),
});

export async function savePlace(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = placeSchema.safeParse({ name: form.get("name"), kind: form.get("kind"), note: form.get("note") ?? "" });
  if (!p.success) return { ok: false, message: issue(p.error) };
  const space = await homeSpace(viewer);
  const { error } = await (await createClient()).from("places").insert({ workspace_id: space.id, ...p.data, note: p.data.note || null });
  return error ? { ok: false, message: "Não consegui salvar." } : done("/vida/nos", "Na lista de vocês.");
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
  title: z.string().trim().min(1, "Dê um título.").max(80),
  body: z.string().trim().max(4000),
  happened_on: z.iso.date(),
});

export async function saveMemory(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const p = memorySchema.safeParse({ title: form.get("title"), body: form.get("body") ?? "", happened_on: form.get("happened_on") });
  if (!p.success) return { ok: false, message: issue(p.error) };
  const space = await homeSpace(viewer);
  const { error } = await (await createClient()).from("memories").insert({ workspace_id: space.id, ...p.data });
  return error ? { ok: false, message: "Não consegui salvar." } : done("/vida/nos", "Memória guardada.");
}

export async function deleteMemory(id: string) {
  await requireViewer();
  await (await createClient()).from("memories").delete().eq("id", uuid.parse(id));
  revalidatePath("/vida/nos");
}

// ---------- metas ----------
const num = z.string().trim().transform((s) => Number(s.replace(/\./g, "").replace(",", ".")));
const goalSchema = z.object({
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
  const { error } = await (await createClient()).from("goals").insert({ ...p.data, unit: p.data.unit || null, due_on: p.data.due_on || null });
  return error ? { ok: false, message: "Não consegui criar a meta." } : done("/vida/metas", "Meta criada.");
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
