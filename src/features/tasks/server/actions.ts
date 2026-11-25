"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { addDays } from "@/features/health/habits";
import { todayFor } from "@/features/health/server/queries";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { parseQuickTask } from "../quick-parse";
import type { Repeat } from "../recurrence";
import { ensureOccurrences } from "./queries";

type Result = { ok: boolean; message: string };

async function spacesOf(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.from("workspaces").select("id, kind");
  return data ?? [];
}

/** Adição rápida: "Lavar roupa toda quarta #casa @nós". */
export async function createTaskQuick(text: string, workspaceId?: string): Promise<Result> {
  const viewer = await requireViewer();
  const raw = z.string().trim().min(1).max(300).safeParse(text);
  if (!raw.success) return { ok: false, message: "Escreva a tarefa." };
  const today = todayFor(viewer);
  const p = parseQuickTask(raw.data, today);
  if (!p.title) return { ok: false, message: "Faltou o nome da tarefa." };

  const supabase = await createClient();
  const spaces = await spacesOf(supabase);
  const shared = spaces.find((s) => s.kind === "shared");
  const personal = spaces.find((s) => s.kind === "personal");
  const chosen = p.shared && shared ? shared.id : spaces.some((s) => s.id === workspaceId) ? workspaceId! : personal?.id;
  if (!chosen) return { ok: false, message: "Não encontrei seu espaço." };

  const isShared = chosen === shared?.id;
  const { data: members } = isShared ? await supabase.from("workspace_members").select("user_id").eq("workspace_id", chosen) : { data: null };
  const start = p.due_date ?? today;
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: chosen,
      title: p.title,
      category: p.category ?? (isShared ? "casa" : "geral"),
      priority: p.priority ?? 0,
      due_date: p.repeat ? null : (p.due_date ?? null),
      due_time: p.due_time ?? null,
      repeat: p.repeat ?? null,
      repeat_start: p.repeat ? start : null,
      // tarefa recorrente da casa alterna entre os dois por padrão
      rotation: p.repeat && isShared && (members?.length ?? 0) > 1 ? members!.map((m) => m.user_id) : null,
    })
    .select("id, repeat, repeat_start, rotation, assignee_id")
    .single();
  if (error || !task) return { ok: false, message: "Não consegui criar a tarefa." };
  if (task.repeat) await ensureOccurrences(supabase, [task], today, addDays(today, 14));
  revalidatePath("/", "layout");
  return { ok: true, message: p.repeat ? `Criada: ${p.title} (recorrente)` : `Criada: ${p.title}` };
}

const saveSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "Dê um nome.").max(200),
  notes: z.string().max(2000).optional(),
  workspace_id: z.uuid(),
  category: z.enum(["geral", "casa", "contas", "trabalho", "saude", "compras", "nos"]),
  priority: z.coerce.number().int().min(0).max(3),
  assignee_id: z.uuid().optional().or(z.literal("")),
  due_date: z.iso.date().optional().or(z.literal("")),
  due_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  freq: z.enum(["none", "daily", "weekly", "monthly"]),
  interval: z.coerce.number().int().min(1).max(12).default(1),
  days: z.array(z.coerce.number().int().min(0).max(6)).default([]),
  monthday: z.coerce.number().int().min(1).max(31).optional(),
  rotation: z.literal("on").optional(),
  remind: z.literal("on").optional(),
});

export async function saveTask(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const parsed = saveSchema.safeParse({ ...Object.fromEntries(form), days: form.getAll("days") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const v = parsed.data;
  const today = todayFor(viewer);
  const supabase = await createClient();

  let repeat: Repeat | null = null;
  if (v.freq === "daily") repeat = { freq: "daily", interval: v.interval };
  if (v.freq === "weekly") {
    if (!v.days.length) return { ok: false, message: "Escolha os dias da semana." };
    repeat = { freq: "weekly", interval: v.interval, days: [...new Set(v.days)].sort() };
  }
  if (v.freq === "monthly") repeat = { freq: "monthly", interval: v.interval, monthday: v.monthday ?? Number(today.slice(8, 10)) };

  const { data: before } = await supabase.from("tasks").select("repeat, repeat_start, workspace_id").eq("id", v.id).single();
  if (!before) return { ok: false, message: "Tarefa não encontrada." };
  const { data: members } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", v.workspace_id);
  const repeatChanged = JSON.stringify(before.repeat) !== JSON.stringify(repeat);
  const start = repeat ? (repeatChanged ? v.due_date || today : (before.repeat_start ?? today)) : null;

  const { data: task, error } = await supabase
    .from("tasks")
    .update({
      title: v.title,
      notes: v.notes || null,
      workspace_id: v.workspace_id,
      category: v.category,
      priority: v.priority,
      assignee_id: v.assignee_id || null,
      due_date: repeat ? null : v.due_date || null,
      due_time: v.due_time || null,
      repeat,
      repeat_start: start,
      rotation: repeat && v.rotation === "on" && (members?.length ?? 0) > 1 ? members!.map((m) => m.user_id) : null,
      remind: v.remind === "on",
    })
    .eq("id", v.id)
    .select("id, repeat, repeat_start, rotation, assignee_id")
    .single();
  if (error || !task) return { ok: false, message: error?.message.includes("member") ? "Responsável precisa ser do espaço." : "Não consegui salvar." };

  // regra mudou: ocorrências futuras abertas são refeitas (passadas e concluídas ficam no histórico)
  await supabase.from("task_occurrences").delete().eq("task_id", v.id).eq("status", "open").gte("occurs_on", today);
  if (repeat) await ensureOccurrences(supabase, [task], today, addDays(today, 14));
  await supabase.from("notification_jobs").delete().eq("source_id", v.id).eq("status", "pending");
  revalidatePath("/", "layout");
  return { ok: true, message: "Tarefa salva." };
}

export async function deleteTask(id: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/", "layout");
}

/** Adiar: tarefa única muda a data; ocorrência ganha snoozed_to. */
export async function snoozeTask(taskId: string, occurrenceId: string | null, to: string) {
  await requireViewer();
  const supabase = await createClient();
  const date = z.iso.date().parse(to);
  if (occurrenceId) await supabase.from("task_occurrences").update({ snoozed_to: date }).eq("id", z.uuid().parse(occurrenceId));
  else await supabase.from("tasks").update({ due_date: date }).eq("id", z.uuid().parse(taskId));
  await supabase.from("notification_jobs").delete().eq("source_id", taskId).eq("status", "pending");
  revalidatePath("/", "layout");
}

/** Kanban: a fazer / fazendo / feito (tarefas únicas). */
export async function setTaskStatus(taskId: string, status: "open" | "doing" | "done") {
  const viewer = await requireViewer();
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null, completed_by: status === "done" ? viewer.id : null })
    .eq("id", z.uuid().parse(taskId));
  revalidatePath("/", "layout");
}

export async function addSubtask(taskId: string, title: string) {
  await requireViewer();
  const t = z.string().trim().min(1).max(200).parse(title);
  const supabase = await createClient();
  await supabase.from("subtasks").insert({ task_id: z.uuid().parse(taskId), title: t, position: Date.now() % 1_000_000_000 });
  revalidatePath("/", "layout");
}

export async function toggleSubtask(id: string, done: boolean) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("subtasks").update({ done }).eq("id", z.uuid().parse(id));
  revalidatePath("/", "layout");
}

export async function deleteSubtask(id: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("subtasks").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/", "layout");
}
