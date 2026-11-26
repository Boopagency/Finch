"use client";

import { Check, Repeat2, Users } from "lucide-react";
import { useState } from "react";
import { useOutboxOps } from "@/components/sync/use-outbox";
import { toast } from "@/components/ui/toast";
import { addDays } from "@/features/health/habits";
import { taskDoneOverrides } from "@/features/sync/ops";
import { enqueue } from "@/lib/outbox";
import type { Space, TaskItem } from "../server/queries";
import { TaskSheet } from "./task-sheet";

export function dateLabel(date: string | null, today: string): string {
  if (!date) return "Sem data";
  if (date < today) return "Atrasadas";
  if (date === today) return "Hoje";
  if (date === addDays(today, 1)) return "Amanhã";
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
}

const PRIORITY = ["", "border-l-sunflower", "border-l-tangerine", "border-l-coral"];

export function useTaskState(items: TaskItem[]) {
  const ops = useOutboxOps();
  const over = taskDoneOverrides(ops);
  return items.map((i) => {
    const o = over.get(i.key);
    return o === undefined ? i : { ...i, status: o ? ("done" as const) : i.status === "done" ? ("open" as const) : i.status };
  });
}

export function toggleTask(item: TaskItem) {
  const done = item.status !== "done";
  void enqueue({ id: crypto.randomUUID(), type: "task.toggle", task_id: item.task_id, occurrence_id: item.occurrence_id, done });
  if (done)
    toast(`Feito: ${item.title}`, {
      label: "Desfazer",
      run: () => void enqueue({ id: crypto.randomUUID(), type: "task.toggle", task_id: item.task_id, occurrence_id: item.occurrence_id, done: false }),
    });
}

export function TaskRow({ item, onOpen, showDate }: { item: TaskItem; onOpen: () => void; showDate?: string }) {
  const done = item.status === "done";
  const meta = [
    showDate,
    item.time,
    item.status === "doing" ? "fazendo" : null,
    item.subtasks.length ? `${item.subtasks.filter((s) => s.done).length}/${item.subtasks.length}` : null,
  ].filter(Boolean);
  const saving = item.key.startsWith("pending:");
  return (
    <li aria-busy={saving || undefined} className={`flex items-center gap-2 rounded-[18px] border-l-4 bg-surface py-1.5 pl-2 pr-3 transition-opacity ${saving ? "pointer-events-none opacity-60" : ""} ${PRIORITY[item.priority] || "border-l-transparent"}`}>
      <button
        onClick={() => toggleTask(item)}
        aria-label={done ? `Reabrir ${item.title}` : `Concluir ${item.title}`}
        aria-pressed={done}
        className="grid size-11 shrink-0 place-items-center"
      >
        <span className={`grid size-6 place-items-center rounded-full border-2 transition-colors duration-200 ${done ? "check-on border-frog bg-frog text-on-color" : "border-ink-3"}`}>
          {done && <Check className="size-3.5" strokeWidth={3.5} />}
        </span>
      </button>
      <button onClick={onOpen} className="press flex min-h-11 min-w-0 flex-1 flex-col items-start justify-center text-left">
        <span className={`w-full truncate text-[15px] font-semibold ${done ? "text-ink-3 line-through decoration-2" : ""}`}>{item.title}</span>
        {(meta.length > 0 || item.repeatLabel || item.space.kind === "shared") && (
          <span className="flex w-full items-center gap-1.5 truncate text-[12px] text-ink-3">
            {item.repeatLabel && <Repeat2 className="size-3.5 shrink-0" />}
            {[...meta, item.repeatLabel].filter(Boolean).join(" · ")}
            {item.space.kind === "shared" && (
              <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-lavender px-2 py-0.5 font-semibold text-on-color">
                <Users className="size-3" />
                {item.assignee?.name ?? "Nós"}
              </span>
            )}
          </span>
        )}
      </button>
    </li>
  );
}

/** Lista agrupada por dia. */
export function TaskList({ items, today, spaces, group = true, empty }: { items: TaskItem[]; today: string; spaces: Space[]; group?: boolean; empty?: string }) {
  const state = useTaskState(items);
  const [openKey, setOpenKey] = useState<string | null>(null);
  // sempre a versão atual do item (após salvar/revalidar), não a cópia de quando abriu
  const open = state.find((i) => i.key === openKey) ?? null;
  if (state.length === 0) return empty ? <p className="px-2 py-6 text-center text-[15px] text-ink-3">{empty}</p> : null;

  const groups = new Map<string, TaskItem[]>();
  for (const i of state) {
    const k = group ? dateLabel(i.date, today) : "";
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {[...groups].map(([label, list]) => (
          <section key={label || "all"} aria-label={label || "Tarefas"} className="flex flex-col gap-1.5">
            {label && <h2 className={`px-2 text-[13px] font-semibold first-letter:uppercase ${label === "Atrasadas" ? "text-danger" : "text-ink-2"}`}>{label}</h2>}
            <ul className="stagger flex flex-col gap-1.5">
              {list.map((i) => (
                <TaskRow key={i.key} item={i} onOpen={() => setOpenKey(i.key)} showDate={!group && i.date && i.date !== today ? dateLabel(i.date, today) : undefined} />
              ))}
            </ul>
          </section>
        ))}
      </div>
      {open && <TaskSheet item={open} spaces={spaces} today={today} onClose={() => setOpenKey(null)} />}
    </>
  );
}
