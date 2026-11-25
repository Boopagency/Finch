"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Habit, HabitLog } from "../habits";
import { HabitForm } from "./habit-form";
import { HabitList } from "./habit-list";

export function HabitManager({ habits, logs, today }: { habits: Habit[]; logs: HabitLog[]; today: string }) {
  const [editing, setEditing] = useState<string | "new" | null>(habits.length === 0 ? "new" : null);

  return (
    <div className="flex flex-col gap-4">
      {habits.length === 0 && editing !== "new" && (
        <EmptyState title="Nenhum hábito ainda">Comece por um só. Ler 10 páginas, alongar, tomar vitamina.</EmptyState>
      )}
      <HabitList habits={habits} serverLogs={logs} today={today} showConsistency />

      {editing === "new" ? (
        <section aria-label="Novo hábito" className="rounded-[22px] bg-surface p-4">
          <h2 className="mb-4 font-display text-[20px] font-bold">Novo hábito</h2>
          <HabitForm onDone={() => setEditing(null)} />
        </section>
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")} className="self-start">
          <Plus className="size-4" /> Novo hábito
        </Button>
      )}

      {habits.length > 0 && (
        <section aria-label="Editar hábitos" className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold text-ink-3">Editar</h2>
          {habits.map((h) =>
            editing === h.id ? (
              <div key={h.id} className="rounded-[22px] bg-surface p-4">
                <HabitForm habit={h} onDone={() => setEditing(null)} />
              </div>
            ) : (
              <button key={h.id} onClick={() => setEditing(h.id)} className="flex min-h-12 items-center justify-between rounded-[16px] bg-surface px-4 text-left text-[15px]">
                {h.name}
                <Pencil className="size-4 text-ink-3" />
              </button>
            ),
          )}
        </section>
      )}
      <p className="px-1 text-[13px] text-ink-3">Sem punição: dias de folga não contam, e “hoje” só entra na conta depois de feito.</p>
    </div>
  );
}
