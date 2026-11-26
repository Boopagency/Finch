"use client";

import Link from "next/link";
import type { Space, TaskItem } from "../server/queries";
import { TaskList } from "./task-list";
import { useTaskItems } from "./use-task-items";

/** Tarefas de hoje no Hoje: inclui na hora as criadas pelo "+" (fila) e tira as apagadas. */
export function TodayTasks({ items: server, today, spaces }: { items: TaskItem[]; today: string; spaces: Space[] }) {
  const items = useTaskItems(server, today, spaces).filter((t) => t.date && t.date <= today);
  if (!items.length) return null;
  const overdue = items.some((t) => t.status !== "done" && t.date! < today);
  return (
    <>
      <TaskList items={[...items].sort((a, b) => Number(a.status === "done") - Number(b.status === "done")).slice(0, 6)} spaces={spaces} today={today} group={overdue} />
      {items.length > 6 && (
        <Link prefetch href="/tarefas" className="px-2 text-[13px] font-semibold text-ink-3">
          Ver todas as {items.length} tarefas de hoje →
        </Link>
      )}
    </>
  );
}
