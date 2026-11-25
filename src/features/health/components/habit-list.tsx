"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useOutboxOps } from "@/components/sync/use-outbox";
import { toast } from "@/components/ui/toast";
import { mergeHabitLogs } from "@/features/sync/ops";
import { cancelPending, enqueue, forgetAcked } from "@/lib/outbox";
import { consistency, habitStatus, type Habit, type HabitLog } from "../habits";

const toneBg: Record<string, string> = {
  coral: "bg-coral text-on-color",
  sunflower: "bg-sunflower text-on-color",
  tangerine: "bg-tangerine text-on-color",
  cobalt: "bg-cobalt text-on-cobalt",
  lavender: "bg-lavender text-on-color",
  frog: "bg-frog text-on-color",
};

function add(h: Habit, value: number) {
  const id = crypto.randomUUID();
  void enqueue({ id, type: "habit.add", habit_id: h.id, value, logged_at: new Date().toISOString() });
  toast(h.kind === "check" ? `${h.name}: feito` : `${h.name}: +${value}${h.unit ? ` ${h.unit}` : ""}`, {
    label: "Desfazer",
    run: async () => {
      if (!(await cancelPending(id))) void enqueue({ id: crypto.randomUUID(), type: "habit.remove", target_id: id });
    },
  });
}

function clearToday(h: Habit, today: string) {
  void enqueue({ id: crypto.randomUUID(), type: "habit.clear", habit_id: h.id, local_date: today });
  toast(`${h.name}: desmarcado`);
}

export function HabitList({
  habits,
  serverLogs,
  today,
  onlyPendingToday = false,
  showConsistency = false,
}: {
  habits: Habit[];
  serverLogs: HabitLog[];
  today: string;
  onlyPendingToday?: boolean;
  showConsistency?: boolean;
}) {
  const ops = useOutboxOps();
  useEffect(() => {
    void forgetAcked(new Set(serverLogs.map((l) => l.id)));
  }, [serverLogs]);
  const logs = mergeHabitLogs(serverLogs, ops, today);
  const [open, setOpen] = useState<string | null>(null);

  const rows = habits
    .map((h) => ({ h, s: habitStatus(h, logs, today) }))
    .filter(({ s }) => (onlyPendingToday ? s.scheduled && !s.done : true));
  if (rows.length === 0) return null;

  return (
    <ul className="stagger flex flex-col gap-2">
      {rows.map(({ h, s }) => {
        const todayDone = logs.some((l) => l.habit_id === h.id && l.local_date === today);
        const c = showConsistency ? consistency(h, logs, today) : null;
        return (
          <li key={h.id} className="rounded-[20px] bg-surface p-3">
            <div className="flex items-center gap-3">
              <span className={`size-3 shrink-0 rounded-full ${toneBg[h.tone] ?? toneBg.sunflower}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate text-[16px] font-semibold ${s.done ? "text-ink-3 line-through decoration-2" : ""}`}>{h.name}</span>
                <span className="tabular text-[12px] text-ink-3">
                  {h.kind === "quantity" || h.target > 1
                    ? `${s.progress} de ${h.target}${h.unit ? ` ${h.unit}` : ""}${h.period === "week" ? " na semana" : " hoje"}`
                    : !s.scheduled
                      ? "hoje é folga"
                      : s.done
                        ? "feito hoje"
                        : "para hoje"}
                  {c && c.of > 0 && ` · ${c.done} de ${c.of} ${h.period === "week" ? "semanas" : "dias"}`}
                </span>
              </span>
              {h.kind === "check" ? (
                <button
                  onClick={() => (h.period === "day" && todayDone ? clearToday(h, today) : add(h, 1))}
                  aria-label={todayDone && h.period === "day" ? `Desmarcar ${h.name}` : `Marcar ${h.name}`}
                  aria-pressed={h.period === "day" ? todayDone : undefined}
                  className={`press grid size-11 shrink-0 place-items-center rounded-full ${
                    s.done ? `check-on ${toneBg[h.tone]}` : "border-2 border-line text-ink-3"
                  }`}
                >
                  {h.period === "week" && !s.done ? <Plus className="size-5" /> : <Check className="size-5" strokeWidth={3} />}
                </button>
              ) : (
                <button
                  onClick={() => setOpen(open === h.id ? null : h.id)}
                  aria-expanded={open === h.id}
                  aria-label={`Registrar ${h.name}`}
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 transition active:scale-90"
                >
                  <Plus className="size-5" />
                </button>
              )}
            </div>
            {open === h.id && (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = Number(new FormData(e.currentTarget).get("v"));
                  if (Number.isInteger(v) && v >= 1 && v <= 1000) {
                    add(h, v);
                    setOpen(null);
                  }
                }}
              >
                <input
                  name="v"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  defaultValue={Math.max(1, h.target - s.progress)}
                  aria-label={`Quantidade${h.unit ? ` em ${h.unit}` : ""}`}
                  className="min-h-11 w-24 rounded-[14px] border border-line bg-bg px-3 text-[16px]"
                  autoFocus
                />
                <button className="min-h-11 flex-1 rounded-full bg-ink text-[15px] font-semibold text-bg">
                  Registrar{h.unit ? ` ${h.unit}` : ""}
                </button>
              </form>
            )}
          </li>
        );
      })}
    </ul>
  );
}
