import "server-only";
import { getTaskItems, type Space, type TaskItem } from "@/features/tasks/server/queries";
import type { Repeat } from "@/features/tasks/recurrence";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { expandEvents, type EventInstance, type EventRow } from "../expand";

export type Agenda = { today: string; events: EventInstance[]; tasks: TaskItem[]; spaces: Space[] };

/** Eventos expandidos + tarefas com data na janela. A agenda lê, não copia (D-007). */
export async function getAgenda(viewer: Viewer, from: string, to: string): Promise<Agenda> {
  const supabase = await createClient();
  const [{ data }, tasks] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, workspace_id, start_date, end_date, start_time, end_time, repeat, repeat_until, location, notes, category, remind_min")
      .or(`and(start_date.lte.${to},end_date.gte.${from}),repeat.not.is.null`),
    getTaskItems(viewer, 45),
  ]);
  const rows = (data ?? []).map((e) => ({ ...e, repeat: (e.repeat as Repeat | null) ?? null })) as EventRow[];
  return {
    today: tasks.today,
    events: expandEvents(rows, from, to),
    tasks: tasks.items.filter((t) => t.date && t.date >= from && t.date <= to),
    spaces: tasks.spaces,
  };
}
