import "server-only";
import { cache } from "react";
import { addDays } from "@/features/health/habits";
import { todayFor } from "@/features/health/server/queries";
import { localDate } from "@/features/health/water";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { describeRepeat, occurrencesBetween, rotationFor, type Repeat } from "../recurrence";

export type Member = { id: string; name: string };
export type Space = { id: string; kind: "personal" | "shared"; name: string; members: Member[] };

export type TaskItem = {
  key: string;
  task_id: string;
  occurrence_id: string | null;
  title: string;
  notes: string | null;
  date: string | null;
  time: string | null;
  status: "open" | "doing" | "done";
  category: string;
  priority: number;
  space: { id: string; kind: "personal" | "shared"; name: string };
  assignee: Member | null;
  repeat: Repeat | null;
  repeatLabel: string | null;
  rotation: string[] | null;
  remind: boolean;
  subtasks: { id: string; title: string; done: boolean }[];
};

/** Uma busca por requisição (várias telas e o layout pedem os espaços). */
export const getSpaces = cache(async (viewer: Viewer): Promise<Space[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workspaces")
    .select("id, kind, name, workspace_members(user_id, profiles(display_name))")
    .order("kind", { ascending: true });
  return (data ?? []).map((w) => ({
    id: w.id,
    kind: w.kind as Space["kind"],
    name: w.kind === "personal" ? "Só eu" : w.name,
    members: w.workspace_members.map((m) => ({
      id: m.user_id,
      name: m.user_id === viewer.id ? "Você" : ((m.profiles as { display_name: string } | null)?.display_name ?? ""),
    })),
  }));
});

type SupabaseClient = Pick<Awaited<ReturnType<typeof createClient>>, "from">;
type RecurringTask = { id: string; repeat: unknown; repeat_start: string | null; rotation: string[] | null; assignee_id: string | null };

/** Garante as ocorrências da janela (idempotente: unique task_id + occurs_on). */
export async function ensureOccurrences(supabase: SupabaseClient, tasks: RecurringTask[], from: string, to: string) {
  const rows = tasks.flatMap((t) => {
    if (!t.repeat || !t.repeat_start) return [];
    const r = t.repeat as Repeat;
    return occurrencesBetween(r, t.repeat_start, from, to).map((d) => ({
      task_id: t.id,
      occurs_on: d,
      assignee_id: rotationFor(t.rotation, r, t.repeat_start!, d) ?? t.assignee_id,
    }));
  });
  if (rows.length) await supabase.from("task_occurrences").upsert(rows, { onConflict: "task_id,occurs_on", ignoreDuplicates: true });
}

const TASK_FIELDS =
  "id, title, notes, due_date, due_time, status, category, priority, assignee_id, repeat, repeat_start, rotation, remind, completed_at, workspace_id, subtasks(id, title, done, position)";

/**
 * Itens de tarefa visíveis: únicas (abertas, ou concluídas hoje) + ocorrências na janela
 * (abertas até `horizon` dias, atrasadas dos últimos 30 dias, concluídas hoje).
 */
export const getTaskItems = cache(async (viewer: Viewer, horizon = 14): Promise<{ today: string; items: TaskItem[]; spaces: Space[] }> => {
  const supabase = await createClient();
  const today = todayFor(viewer);
  const until = addDays(today, horizon);
  const [spaces, { data: tasks }] = await Promise.all([getSpaces(viewer), supabase.from("tasks").select(TASK_FIELDS).is("archived_at", null)]);
  const spaceOf = new Map(spaces.map((s) => [s.id, s]));
  const nameOf = new Map(spaces.flatMap((s) => s.members.map((m) => [m.id, m] as const)));

  const all = tasks ?? [];
  const recurring = all.filter((t) => t.repeat);
  const recurringIds = recurring.map((t) => t.id);
  const readOccs = () =>
    supabase
      .from("task_occurrences")
      .select("id, task_id, occurs_on, snoozed_to, status, assignee_id, completed_at")
      .in("task_id", recurringIds)
      .gte("occurs_on", addDays(today, -30))
      .lte("occurs_on", until);
  let { data: occs } = recurringIds.length ? await readOccs() : { data: [] as NonNullable<Awaited<ReturnType<typeof readOccs>>["data"]> };
  // só grava ocorrências que faltam na janela (normalmente nenhuma: o cron já materializa)
  const have = new Set((occs ?? []).map((o) => `${o.task_id}:${o.occurs_on}`));
  const missing = recurring.filter((t) =>
    occurrencesBetween(t.repeat as Repeat, t.repeat_start!, today, until).some((d) => !have.has(`${t.id}:${d}`)),
  );
  if (missing.length) {
    await ensureOccurrences(supabase, missing, today, until);
    ({ data: occs } = await readOccs());
  }

  const doneToday = (completedAt: string | null) => !!completedAt && localDate(new Date(completedAt), viewer.tz) === today;

  const base = (t: (typeof all)[number]) => {
    const space = spaceOf.get(t.workspace_id)!;
    const repeat = (t.repeat as Repeat | null) ?? null;
    return {
      task_id: t.id,
      title: t.title,
      notes: t.notes,
      time: t.due_time?.slice(0, 5) ?? null,
      category: t.category,
      priority: t.priority,
      space: { id: space.id, kind: space.kind, name: space.name },
      repeat,
      repeatLabel: repeat ? describeRepeat(repeat) : null,
      rotation: t.rotation,
      remind: t.remind,
      subtasks: [...(t.subtasks ?? [])].sort((a, b) => a.position - b.position).map(({ id, title, done }) => ({ id, title, done })),
    };
  };

  const items: TaskItem[] = [];
  for (const t of all) {
    if (t.repeat) continue;
    if (t.status === "done" && !doneToday(t.completed_at)) continue;
    items.push({
      ...base(t),
      key: t.id,
      occurrence_id: null,
      date: t.due_date,
      status: t.status as TaskItem["status"],
      assignee: t.assignee_id ? (nameOf.get(t.assignee_id) ?? null) : null,
    });
  }
  const byId = new Map(all.map((t) => [t.id, t]));
  for (const o of occs ?? []) {
    const t = byId.get(o.task_id);
    if (!t) continue;
    const date = o.snoozed_to ?? o.occurs_on;
    if (o.status === "skipped") continue;
    if (o.status === "done" && !doneToday(o.completed_at)) continue;
    if (o.status === "open" && date > until) continue;
    items.push({
      ...base(t),
      key: o.id,
      occurrence_id: o.id,
      date,
      status: o.status === "done" ? "done" : "open",
      assignee: o.assignee_id ? (nameOf.get(o.assignee_id) ?? null) : null,
    });
  }
  // só a próxima ocorrência futura de cada série (evita poluir a lista com 14 dias de "todo dia")
  const seen = new Set<string>();
  const filtered = items
    .sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999") || (a.time ?? "99").localeCompare(b.time ?? "99") || b.priority - a.priority)
    .filter((i) => {
      if (!i.occurrence_id || !i.date || i.date <= today) return true;
      if (seen.has(i.task_id)) return false;
      seen.add(i.task_id);
      return true;
    });
  return { today, items: filtered, spaces };
});

/** Todas as tarefas (para a aba "Todas" e "Rotinas"): uma linha por tarefa, sem ocorrências. */
export async function getTaskTemplates() {
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("id, title, repeat, category, workspace_id, status").is("archived_at", null).order("created_at");
  return data ?? [];
}
