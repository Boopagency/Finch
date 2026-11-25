"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient, requireViewer } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string };

/**
 * Apaga lembretes pendentes do próprio usuário para o planejador recriar com a configuração nova.
 * Apagar (não cancelar) libera a chave única do horário. Service role, sempre filtrado pelo usuário.
 */
async function dropPendingReminders(userId: string, by: { category?: string; sourceId?: string }) {
  let q = createServiceClient().from("notification_jobs").delete().eq("user_id", userId).eq("status", "pending");
  if (by.category) q = q.eq("category", by.category);
  if (by.sourceId) q = q.eq("source_id", by.sourceId);
  await q;
}
const time = z.string().regex(/^\d{2}:\d{2}$/);

const waterSchema = z
  .object({
    water_goal_ml: z.coerce.number().int().min(500, "Meta mínima: 500 ml.").max(5000, "Meta máxima: 5 L por dia."),
    presets: z.string(),
    water_reminders: z.literal("on").optional(),
    water_from: time,
    water_to: time,
    water_every_min: z.coerce.number().int().min(30).max(240),
  })
  .transform((v) => ({
    water_goal_ml: v.water_goal_ml,
    water_presets: v.presets
      .split(/[,\s]+/)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 10 && n <= 1500)
      .slice(0, 4),
    water_reminders: v.water_reminders === "on",
    water_from: v.water_from,
    water_to: v.water_to,
    water_every_min: v.water_every_min,
  }));

export async function updateWaterSettings(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const parsed = waterSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os dados." };
  if (parsed.data.water_presets.length === 0) return { ok: false, message: "Informe ao menos um copo (ex.: 200, 300, 500)." };
  if (parsed.data.water_to <= parsed.data.water_from) return { ok: false, message: "O fim precisa ser depois do início." };

  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").update(parsed.data).eq("user_id", viewer.id);
  if (error) return { ok: false, message: "Não consegui salvar." };
  await dropPendingReminders(viewer.id, { category: "water" });
  revalidatePath("/", "layout");
  return { ok: true, message: "Salvo." };
}

const habitSchema = z
  .object({
    id: z.uuid().optional().or(z.literal("")),
    name: z.string().trim().min(1, "Dê um nome ao hábito.").max(60),
    kind: z.enum(["check", "quantity"]),
    period: z.enum(["day", "week"]),
    target: z.coerce.number().int().min(1).max(1000),
    unit: z.string().trim().max(12).optional(),
    days: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Escolha ao menos um dia."),
    reminder_time: time.optional().or(z.literal("")),
    tone: z.enum(["coral", "sunflower", "tangerine", "cobalt", "lavender", "frog"]),
  })
  .transform((v) => ({
    id: v.id || undefined,
    name: v.name,
    kind: v.kind,
    period: v.period,
    target: v.kind === "check" && v.period === "day" ? 1 : v.target,
    unit: v.kind === "quantity" ? v.unit || null : null,
    days: v.period === "day" ? [...new Set(v.days)].sort() : [0, 1, 2, 3, 4, 5, 6],
    reminder_time: v.reminder_time || null,
    tone: v.tone,
  }));

export async function saveHabit(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const raw = { ...Object.fromEntries(form), days: form.getAll("days") };
  const parsed = habitSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const { id, ...data } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("habits").update(data).eq("id", id)
    : await supabase.from("habits").insert(data);
  if (error) return { ok: false, message: "Não consegui salvar o hábito." };
  if (id) await dropPendingReminders(viewer.id, { sourceId: id });
  revalidatePath("/", "layout");
  return { ok: true, message: id ? "Hábito atualizado." : "Hábito criado." };
}

export async function archiveHabit(id: string) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const habitId = z.uuid().parse(id);
  await supabase.from("habits").update({ archived_at: new Date().toISOString() }).eq("id", habitId);
  await dropPendingReminders(viewer.id, { sourceId: habitId });
  revalidatePath("/", "layout");
}
