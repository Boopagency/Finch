"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { todayFor } from "@/features/health/server/queries";
import { parseQuickTask } from "@/features/tasks/quick-parse";
import type { Repeat } from "@/features/tasks/recurrence";
import { createClient, requireViewer } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string };

function plusHour(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${String(Math.min(23, h! + 1)).padStart(2, "0")}:${String(h! >= 23 ? 59 : m).padStart(2, "0")}`;
}

/** "Jantar com a Duda sexta 20h @nós" → evento de 1 h. Sem hora = dia inteiro. */
export async function createEventQuick(text: string, workspaceId: string | undefined, date: string): Promise<Result> {
  const viewer = await requireViewer();
  const raw = z.string().trim().min(1).max(300).safeParse(text);
  if (!raw.success) return { ok: false, message: "Escreva o compromisso." };
  const p = parseQuickTask(raw.data, todayFor(viewer));
  if (!p.title) return { ok: false, message: "Faltou o nome." };
  const supabase = await createClient();
  const { data: spaces } = await supabase.from("workspaces").select("id, kind");
  const shared = spaces?.find((s) => s.kind === "shared");
  const ws = p.shared && shared ? shared.id : spaces?.some((s) => s.id === workspaceId) ? workspaceId! : spaces?.find((s) => s.kind === "personal")?.id;
  if (!ws) return { ok: false, message: "Não encontrei seu espaço." };
  const day = p.due_date ?? z.iso.date().catch(todayFor(viewer)).parse(date);
  const { error } = await supabase.from("events").insert({
    workspace_id: ws,
    title: p.title,
    start_date: day,
    end_date: day,
    start_time: p.due_time ?? null,
    end_time: p.due_time ? plusHour(p.due_time) : null,
    repeat: p.repeat ?? null,
    category: p.category === "saude" ? "saude" : p.category === "trabalho" ? "trabalho" : p.category === "casa" ? "casa" : ws === shared?.id ? "nos" : "geral",
    remind_min: p.due_time ? 30 : null,
  });
  if (error) return { ok: false, message: "Não consegui criar." };
  revalidatePath("/", "layout");
  return { ok: true, message: `Na agenda: ${p.title}` };
}

const schema = z
  .object({
    id: z.uuid().optional().or(z.literal("")),
    title: z.string().trim().min(1, "Dê um nome.").max(200),
    workspace_id: z.uuid(),
    category: z.enum(["geral", "saude", "trabalho", "casa", "nos", "viagem", "contas", "treino"]),
    start_date: z.iso.date(),
    end_date: z.iso.date().optional().or(z.literal("")),
    all_day: z.literal("on").optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    end_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
    location: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
    freq: z.enum(["none", "daily", "weekly", "monthly"]),
    repeat_until: z.iso.date().optional().or(z.literal("")),
    remind_min: z.coerce.number().int().min(-1).max(10080),
  })
  .superRefine((v, ctx) => {
    const end = v.end_date || v.start_date;
    if (end < v.start_date) ctx.addIssue({ code: "custom", message: "O fim precisa ser depois do início." });
    if (!v.all_day && (!v.start_time || !v.end_time)) ctx.addIssue({ code: "custom", message: "Informe início e fim, ou marque dia inteiro." });
    if (!v.all_day && v.start_time && v.end_time && end === v.start_date && v.end_time <= v.start_time)
      ctx.addIssue({ code: "custom", message: "O fim precisa ser depois do início." });
  });

export async function saveEvent(_prev: Result | null, form: FormData): Promise<Result> {
  await requireViewer();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const v = parsed.data;
  const dow = new Date(`${v.start_date}T12:00:00Z`).getUTCDay();
  const repeat: Repeat | null =
    v.freq === "none" ? null : v.freq === "weekly" ? { freq: "weekly", days: [dow] } : v.freq === "monthly" ? { freq: "monthly", monthday: Number(v.start_date.slice(8, 10)) } : { freq: "daily" };
  const row = {
    title: v.title,
    workspace_id: v.workspace_id,
    category: v.category,
    start_date: v.start_date,
    end_date: v.end_date || v.start_date,
    start_time: v.all_day ? null : v.start_time!,
    end_time: v.all_day ? null : v.end_time!,
    location: v.location || null,
    notes: v.notes || null,
    repeat,
    repeat_until: repeat ? v.repeat_until || null : null,
    remind_min: v.remind_min < 0 || v.all_day ? null : v.remind_min,
  };
  const supabase = await createClient();
  const { error } = v.id ? await supabase.from("events").update(row).eq("id", v.id) : await supabase.from("events").insert(row);
  if (error) return { ok: false, message: "Não consegui salvar." };
  if (v.id) await supabase.from("notification_jobs").delete().eq("source_id", v.id).eq("status", "pending");
  revalidatePath("/", "layout");
  return { ok: true, message: v.id ? "Evento salvo." : "Evento criado." };
}

export async function deleteEvent(id: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("events").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/", "layout");
}
