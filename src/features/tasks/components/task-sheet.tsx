"use client";

import { Plus, Trash2, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { addDays } from "@/features/health/habits";
import type { Space, TaskItem } from "../server/queries";
import { addSubtask, deleteSubtask, deleteTask, saveTask, snoozeTask, toggleSubtask } from "../server/actions";

const CATS = [
  ["geral", "Geral"], ["casa", "Casa"], ["contas", "Contas"], ["trabalho", "Trabalho"], ["saude", "Saúde"], ["compras", "Compras"], ["nos", "Nós"],
] as const;
const WD = ["D", "S", "T", "Q", "Q", "S", "S"];
const select = "min-h-12 w-full rounded-[14px] border border-line bg-surface px-3 text-[16px]";

export function TaskSheet({ item, spaces, today, onClose }: { item: TaskItem; spaces: Space[]; today: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  const [space, setSpace] = useState(item.space.id);
  const [freq, setFreq] = useState<string>(item.repeat?.freq ?? "none");
  const [state, action, saving] = useActionState(async (prev: { ok: boolean; message: string } | null, form: FormData) => {
    const r = await saveTask(prev, form);
    if (r.ok) {
      toast(r.message);
      ref.current?.close();
    }
    return r;
  }, null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const members = spaces.find((s) => s.id === space)?.members ?? [];
  const shared = spaces.find((s) => s.id === space)?.kind === "shared";

  const snooze = (to: string, label: string) =>
    start(async () => {
      await snoozeTask(item.task_id, item.occurrence_id, to);
      toast(`Adiada para ${label}`);
      ref.current?.close();
    });

  return (
    <dialog
      ref={ref}
      onClose={() => setTimeout(onClose, 260)}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-label={item.title}
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none bg-transparent p-0"
    >
      <div className="mx-auto flex max-h-[92dvh] max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-bg px-gutter pt-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-ink-3">{item.repeatLabel ?? "Tarefa"}</span>
          <button onClick={() => ref.current?.close()} aria-label="Fechar" className="grid size-11 place-items-center rounded-full bg-surface-2">
            <X className="size-5" />
          </button>
        </div>

        {item.status !== "done" && (
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[13px] font-semibold text-ink-2">Adiar {item.occurrence_id ? "esta vez" : ""}</span>
            {[
              [addDays(today, 1), "amanhã"],
              [addDays(today, 2), "depois de amanhã"],
              [addDays(today, 7), "semana que vem"],
            ].map(([d, l]) => (
              <button key={d} disabled={pending} onClick={() => snooze(d!, l!)} className="min-h-10 rounded-full bg-surface-2 px-3 text-[13px] font-semibold">
                {l}
              </button>
            ))}
          </div>
        )}

        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={item.task_id} />
          <Field id="t-title" name="title" label="Tarefa" defaultValue={item.title} maxLength={200} required />
          <label className="flex flex-col gap-1.5" htmlFor="t-notes">
            <span className="text-[13px] font-semibold text-ink-2">Notas</span>
            <textarea id="t-notes" name="notes" defaultValue={item.notes ?? ""} maxLength={2000} rows={2} className="rounded-[14px] border border-line bg-surface px-4 py-3 text-[16px]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5" htmlFor="t-space">
              <span className="text-[13px] font-semibold text-ink-2">Espaço</span>
              <select id="t-space" name="workspace_id" value={space} onChange={(e) => setSpace(e.target.value)} className={select}>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5" htmlFor="t-cat">
              <span className="text-[13px] font-semibold text-ink-2">Categoria</span>
              <select id="t-cat" name="category" defaultValue={item.category} className={select}>
                {CATS.map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5" htmlFor="t-assignee">
              <span className="text-[13px] font-semibold text-ink-2">Responsável</span>
              <select id="t-assignee" name="assignee_id" defaultValue={item.assignee?.id ?? ""} className={select} disabled={!shared}>
                <option value="">{shared ? "Qualquer um" : "Você"}</option>
                {shared && members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5" htmlFor="t-priority">
              <span className="text-[13px] font-semibold text-ink-2">Prioridade</span>
              <select id="t-priority" name="priority" defaultValue={item.priority} className={select}>
                <option value={0}>Normal</option>
                <option value={1}>Média</option>
                <option value={2}>Alta</option>
                <option value={3}>Urgente</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5" htmlFor="t-freq">
            <span className="text-[13px] font-semibold text-ink-2">Repetir</span>
            <select id="t-freq" name="freq" value={freq} onChange={(e) => setFreq(e.target.value)} className={select}>
              <option value="none">Não repete</option>
              <option value="daily">Todo dia</option>
              <option value="weekly">Toda semana</option>
              <option value="monthly">Todo mês</option>
            </select>
          </label>
          {freq === "weekly" && (
            <div className="flex justify-between gap-1" role="group" aria-label="Dias da semana">
              {WD.map((d, i) => (
                <label key={i} className="grid size-11 cursor-pointer place-items-center rounded-full bg-surface-2 text-[14px] font-bold has-[:checked]:bg-ink has-[:checked]:text-bg">
                  <input type="checkbox" name="days" value={i} defaultChecked={item.repeat?.days?.includes(i) ?? i === new Date(`${today}T12:00:00Z`).getUTCDay()} className="sr-only" />
                  {d}
                </label>
              ))}
            </div>
          )}
          {freq !== "none" && (
            <div className="grid grid-cols-2 gap-3">
              <Field id="t-interval" name="interval" type="number" inputMode="numeric" min={1} max={12} label={freq === "daily" ? "A cada (dias)" : freq === "weekly" ? "A cada (semanas)" : "A cada (meses)"} defaultValue={item.repeat?.interval ?? 1} />
              {freq === "monthly" && <Field id="t-monthday" name="monthday" type="number" inputMode="numeric" min={1} max={31} label="No dia" defaultValue={item.repeat?.monthday ?? Number(today.slice(8, 10))} />}
            </div>
          )}
          {freq !== "none" && shared && members.length > 1 && (
            <label className="flex min-h-11 items-center justify-between text-[15px] font-semibold">
              Rodízio entre vocês
              <input type="checkbox" name="rotation" defaultChecked={!!item.rotation?.length} className="size-6 accent-[var(--lavender)]" />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            {freq === "none" ? <Field id="t-date" name="due_date" type="date" label="Data" defaultValue={item.date ?? ""} /> : <input type="hidden" name="due_date" value="" />}
            <Field id="t-time" name="due_time" type="time" label="Horário" defaultValue={item.time ?? ""} />
          </div>
          <label className="flex min-h-11 items-center justify-between text-[15px] font-semibold">
            Lembrar no horário
            <input type="checkbox" name="remind" defaultChecked={item.remind} className="size-6 accent-[var(--coral)]" />
          </label>

          {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
          <Button type="submit" disabled={saving}>Salvar</Button>
        </form>

        <section aria-label="Subtarefas" className="flex flex-col gap-2">
          <h3 className="text-[13px] font-semibold text-ink-2">Subtarefas</h3>
          {item.subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={s.done}
                aria-label={s.title}
                onChange={(e) => start(() => toggleSubtask(s.id, e.target.checked))}
                className="size-5 accent-[var(--frog)]"
              />
              <span className={`flex-1 text-[15px] ${s.done ? "text-ink-3 line-through" : ""}`}>{s.title}</span>
              <button onClick={() => start(() => deleteSubtask(s.id))} aria-label={`Remover ${s.title}`} className="grid size-10 place-items-center text-ink-3">
                <X className="size-4" />
              </button>
            </div>
          ))}
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const t = String(new FormData(f).get("sub") ?? "").trim();
              if (t) start(async () => {
                await addSubtask(item.task_id, t);
                f.reset();
              });
            }}
          >
            <input name="sub" placeholder="Adicionar subtarefa" aria-label="Nova subtarefa" maxLength={200} className="min-h-11 flex-1 rounded-[14px] border border-line bg-surface px-3 text-[16px]" />
            <button aria-label="Adicionar subtarefa" className="grid size-11 place-items-center rounded-full bg-surface-2">
              <Plus className="size-5" />
            </button>
          </form>
        </section>

        <Button
          variant="danger"
          onClick={() =>
            start(async () => {
              await deleteTask(item.task_id);
              toast(item.repeat ? "Rotina apagada" : "Tarefa apagada");
              ref.current?.close();
            })
          }
          className="self-start"
        >
          <Trash2 className="size-4" /> {item.repeat ? "Apagar a rotina inteira" : "Apagar tarefa"}
        </Button>
      </div>
    </dialog>
  );
}
