"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState, useTransition } from "react";
import type { Space, TaskItem } from "../server/queries";
import { setTaskStatus } from "../server/actions";
import { TaskSheet } from "./task-sheet";
import { dateLabel, useTaskState } from "./task-list";

const COLS = [
  ["open", "A fazer"],
  ["doing", "Fazendo"],
  ["done", "Feito"],
] as const;

/** Quadro para tarefas únicas (rotinas ficam na lista). Rola na horizontal no iPhone. */
export function Kanban({ items, spaces, today }: { items: TaskItem[]; spaces: Space[]; today: string }) {
  const state = useTaskState(items.filter((i) => !i.occurrence_id));
  const [openKey, setOpenKey] = useState<string | null>(null);
  // sempre a versão atual do item (após salvar/revalidar), não a cópia de quando abriu
  const open = state.find((i) => i.key === openKey) ?? null;
  const [pending, start] = useTransition();
  const move = (i: TaskItem, to: (typeof COLS)[number][0]) => start(() => setTaskStatus(i.task_id, to));

  return (
    <>
      <div data-scroll-x className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2">
        {COLS.map(([status, label], c) => {
          const list = state.filter((i) => i.status === status);
          return (
            <section key={status} aria-label={label} className="flex w-[78%] max-w-xs shrink-0 snap-start flex-col gap-2 rounded-[22px] bg-surface-2 p-2 sm:w-auto sm:flex-1">
              <h2 className="flex items-center justify-between px-2 pt-1 text-[14px] font-bold">
                {label} <span className="tabular text-ink-3">{list.length}</span>
              </h2>
              {list.map((i) => (
                <div key={i.key} className="flex flex-col gap-1 rounded-[16px] bg-surface p-3">
                  <button onClick={() => setOpenKey(i.key)} className="text-left text-[15px] font-semibold">{i.title}</button>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-ink-3">{i.space.kind === "shared" ? (i.assignee?.name ?? "Nós") : (i.date ? dateLabel(i.date, today) : "")}</span>
                    <span className="flex gap-1">
                      {c > 0 && (
                        <button disabled={pending} onClick={() => move(i, COLS[c - 1]![0])} aria-label={`Mover ${i.title} para ${COLS[c - 1]![1]}`} className="grid size-10 place-items-center rounded-full bg-surface-2">
                          <ArrowLeft className="size-4" />
                        </button>
                      )}
                      {c < 2 && (
                        <button disabled={pending} onClick={() => move(i, COLS[c + 1]![0])} aria-label={`Mover ${i.title} para ${COLS[c + 1]![1]}`} className="grid size-10 place-items-center rounded-full bg-ink text-bg">
                          <ArrowRight className="size-4" />
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
      {open && <TaskSheet item={open} spaces={spaces} today={today} onClose={() => setOpenKey(null)} />}
    </>
  );
}
