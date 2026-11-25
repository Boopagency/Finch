"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { PHOTO_PATH, removePhoto } from "@/features/core/server/photos";
import { parseKg, parseSleep } from "../training";

type Result = { ok: boolean; message: string };

const workoutSchema = z.object({
  id: z.uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Dê um nome à ficha.").max(40),
  items: z
    .array(
      z.object({
        exercise_id: z.uuid(),
        sets: z.coerce.number().int().min(1).max(20),
        reps: z.coerce.number().int().min(1).max(100),
        rest_s: z.coerce.number().int().min(0).max(600),
      }),
    )
    .min(1, "Escolha ao menos um exercício.")
    .max(30),
});

/** Cria ou reescreve a ficha (a lista de exercícios é substituída por inteiro). */
export async function saveWorkout(input: z.input<typeof workoutSchema>): Promise<Result> {
  await requireViewer();
  const parsed = workoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira a ficha." };
  const supabase = await createClient();
  const { id, name, items } = parsed.data;
  let workoutId = id || "";
  if (workoutId) {
    const { error } = await supabase.from("workouts").update({ name }).eq("id", workoutId);
    if (error) return { ok: false, message: "Não consegui salvar a ficha." };
    await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
  } else {
    const { data, error } = await supabase.from("workouts").insert({ name }).select("id").single();
    if (error || !data) return { ok: false, message: "Não consegui criar a ficha." };
    workoutId = data.id;
  }
  const { error } = await supabase
    .from("workout_exercises")
    .insert(items.map((it, position) => ({ ...it, workout_id: workoutId, position })));
  if (error) return { ok: false, message: "Não consegui salvar os exercícios." };
  revalidatePath("/vida/treino");
  return { ok: true, message: id ? "Ficha atualizada." : "Ficha criada." };
}

export async function archiveWorkout(id: string) {
  await requireViewer();
  await (await createClient()).from("workouts").update({ archived_at: new Date().toISOString() }).eq("id", z.uuid().parse(id));
  revalidatePath("/vida/treino");
}

export async function addExercise(name: string, muscle: string): Promise<{ ok: boolean; message: string; id?: string }> {
  await requireViewer();
  const p = z.object({ name: z.string().trim().min(1).max(60), muscle: z.enum(["peito", "costas", "pernas", "ombros", "bracos", "core", "cardio", "outro"]) }).safeParse({ name, muscle });
  if (!p.success) return { ok: false, message: "Nome inválido." };
  const { data, error } = await (await createClient()).from("exercises").insert(p.data).select("id").single();
  if (error) return { ok: false, message: error.code === "23505" ? "Esse exercício já existe." : "Não consegui criar." };
  revalidatePath("/vida/treino");
  return { ok: true, message: "Exercício criado.", id: data.id };
}

/** Começa uma sessão (precisa de rede; as séries depois vão pela fila offline). Reaproveita a aberta. */
export async function startSession(workoutId: string | null): Promise<{ ok: boolean; id?: string; message?: string }> {
  await requireViewer();
  const supabase = await createClient();
  const { data: open } = await supabase.from("workout_sessions").select("id").is("finished_at", null).limit(1).maybeSingle();
  if (open) return { ok: true, id: open.id };
  let name = "Treino livre";
  if (workoutId) {
    const { data: w } = await supabase.from("workouts").select("name").eq("id", z.uuid().parse(workoutId)).single();
    if (!w) return { ok: false, message: "Ficha não encontrada." };
    name = w.name;
  }
  const { data, error } = await supabase.from("workout_sessions").insert({ workout_id: workoutId, name }).select("id").single();
  if (error || !data) return { ok: false, message: "Não consegui começar o treino." };
  revalidatePath("/vida/treino");
  return { ok: true, id: data.id };
}

export async function deleteSession(id: string) {
  await requireViewer();
  await (await createClient()).from("workout_sessions").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/vida/treino");
}

const bodySchema = z.object({
  weight: z.string().trim().max(10),
  waist: z.string().trim().max(6),
  sleep: z.string().trim().max(10),
  mood: z.string().regex(/^[1-5]?$/),
  note: z.string().trim().max(280),
});

export async function saveBodyLog(_prev: Result | null, form: FormData): Promise<Result> {
  await requireViewer();
  const p = bodySchema.safeParse({
    weight: form.get("weight") ?? "", waist: form.get("waist") ?? "", sleep: form.get("sleep") ?? "", mood: form.get("mood") ?? "", note: form.get("note") ?? "",
  });
  if (!p.success) return { ok: false, message: "Confira os dados." };
  const v = p.data;
  const weight_g = v.weight ? parseKg(v.weight) : null;
  if (v.weight && (weight_g === null || weight_g < 20000 || weight_g > 400000)) return { ok: false, message: "Peso entre 20 e 400 kg (ex.: 82,5)." };
  const waistCm = v.waist ? Number(v.waist.replace(",", ".")) : null;
  if (waistCm !== null && !(waistCm >= 30 && waistCm <= 250)) return { ok: false, message: "Cintura em cm, entre 30 e 250." };
  const sleep_min = v.sleep ? parseSleep(v.sleep) : null;
  if (v.sleep && sleep_min === null) return { ok: false, message: "Sono como 7h30 ou 7,5." };
  const mood = v.mood ? Number(v.mood) : null;
  if (weight_g === null && waistCm === null && sleep_min === null && mood === null) return { ok: false, message: "Preencha ao menos uma medida." };
  const { error } = await (await createClient()).from("body_logs").insert({
    weight_g, waist_mm: waistCm === null ? null : Math.round(waistCm * 10), sleep_min, mood, note: v.note || null,
  });
  if (error) return { ok: false, message: "Não consegui salvar." };
  revalidatePath("/vida/saude");
  return { ok: true, message: "Registrado." };
}

export async function deleteBodyLog(id: string) {
  await requireViewer();
  await (await createClient()).from("body_logs").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/vida/saude");
}

// ---------- fotos de evolução (sempre no espaço pessoal) ----------
export async function addBodyPhoto(path: string, takenOn: string): Promise<Result> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: ws } = await supabase.from("workspaces").select("id").eq("kind", "personal").eq("created_by", viewer.id).single();
  if (!ws || !PHOTO_PATH.test(path) || !path.startsWith(`${ws.id}/`)) return { ok: false, message: "Foto inválida." };
  const { error } = await supabase.from("body_photos").insert({ path, taken_on: z.iso.date().parse(takenOn) });
  if (error) {
    await removePhoto(path);
    return { ok: false, message: "Não consegui salvar a foto." };
  }
  revalidatePath("/vida/saude");
  return { ok: true, message: "Foto guardada (só você vê)." };
}

export async function deleteBodyPhoto(id: string) {
  await requireViewer();
  const { data } = await (await createClient()).from("body_photos").delete().eq("id", z.uuid().parse(id)).select("path").maybeSingle();
  await removePhoto(data?.path);
  revalidatePath("/vida/saude");
}
