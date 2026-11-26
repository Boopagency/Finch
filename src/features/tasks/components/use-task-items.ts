"use client";

import { useOutboxOps } from "@/components/sync/use-outbox";
import type { Op } from "@/features/sync/ops";
import { describeRepeat } from "../recurrence";
import { parseQuickTask } from "../quick-parse";
import type { Space, TaskItem } from "../server/queries";

/** Como a tarefa recém-digitada aparece até o servidor devolver a real (mesma leitura da frase). */
export function draftTask(id: string, text: string, workspaceId: string | null, today: string, spaces: Space[]): TaskItem {
  const p = parseQuickTask(text, today);
  const shared = spaces.find((s) => s.kind === "shared");
  const s = (p.shared && shared) || spaces.find((x) => x.id === workspaceId) || spaces.find((x) => x.kind === "personal") || spaces[0]!;
  return {
    key: `pending:${id}`, task_id: id, occurrence_id: null, title: p.title || text, notes: null,
    date: p.due_date ?? (p.repeat ? today : null), time: p.due_time ?? null, status: "open",
    category: p.category ?? (s.kind === "shared" ? "casa" : "geral"), priority: p.priority ?? 0,
    space: { id: s.id, kind: s.kind, name: s.name },
    assignee: null, repeat: null, repeatLabel: p.repeat ? describeRepeat(p.repeat) : null, rotation: null, remind: false, subtasks: [],
  };
}

/** Servidor + fila: tarefas criadas entram na hora, apagadas somem na hora (e voltam se o servidor recusar). */
export function mergeTasks(server: TaskItem[], ops: Op[], today: string, spaces: Space[]): TaskItem[] {
  const deleted = new Set(ops.flatMap((o) => (o.type === "task.delete" ? [o.task_id] : [])));
  const known = new Set(server.map((i) => i.task_id));
  const created = ops.flatMap((o) => (o.type === "task.create" && !known.has(o.id) && !deleted.has(o.id) ? [draftTask(o.id, o.text, o.workspace_id, today, spaces)] : []));
  const list = created.length ? [...created.reverse(), ...server] : server;
  return deleted.size ? list.filter((i) => !deleted.has(i.task_id)) : list;
}

export function useTaskItems(server: TaskItem[], today: string, spaces: Space[]): TaskItem[] {
  return mergeTasks(server, useOutboxOps(), today, spaces);
}
