"use client";

import { Trash2, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { Space } from "@/features/tasks/server/queries";
import type { EventRow } from "../expand";
import { deleteEvent, saveEvent } from "../server/actions";

const CATS = [["geral", "Geral"], ["saude", "Saúde"], ["trabalho", "Trabalho"], ["casa", "Casa"], ["nos", "Nós"], ["viagem", "Viagem"], ["contas", "Contas"], ["treino", "Treino"]] as const;
const select = "min-h-12 w-full rounded-[14px] border border-line bg-surface px-3 text-[16px]";

export function EventSheet({ event, date, spaces, onClose }: { event?: EventRow; date: string; spaces: Space[]; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [allDay, setAllDay] = useState(event ? !event.start_time : false);
  const [freq, setFreq] = useState(event?.repeat?.freq ?? "none");
  const [pending, start] = useTransition();
  const [state, action, saving] = useActionState(async (prev: { ok: boolean; message: string } | null, form: FormData) => {
    const r = await saveEvent(prev, form);
    if (r.ok) {
      toast(r.message);
      onClose();
    }
    return r;
  }, null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => e.target === e.currentTarget && ref.current?.close()} aria-label={event ? event.title : "Novo evento"} className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none bg-transparent p-0 backdrop:bg-black/40">
      <div className="mx-auto flex max-h-[92dvh] max-w-md flex-col gap-3 overflow-y-auto rounded-t-[28px] bg-bg px-gutter pt-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[22px] font-bold">{event ? "Evento" : "Novo evento"}</h2>
          <button onClick={() => ref.current?.close()} aria-label="Fechar" className="grid size-11 place-items-center rounded-full bg-surface-2">
            <X className="size-5" />
          </button>
        </div>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={event?.id ?? ""} />
          <Field id="ev-title" name="title" label="Título" defaultValue={event?.title} maxLength={200} required />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5" htmlFor="ev-space">
              <span className="text-[13px] font-semibold text-ink-2">Agenda</span>
              <select id="ev-space" name="workspace_id" defaultValue={event?.workspace_id ?? spaces[0]?.id} className={select}>
                {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5" htmlFor="ev-cat">
              <span className="text-[13px] font-semibold text-ink-2">Tipo</span>
              <select id="ev-cat" name="category" defaultValue={event?.category ?? "geral"} className={select}>
                {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          </div>
          <label className="flex min-h-11 items-center justify-between text-[15px] font-semibold">
            Dia inteiro
            <input type="checkbox" name="all_day" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-6 accent-[var(--cobalt)]" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field id="ev-start-date" name="start_date" type="date" label="Começa" defaultValue={event?.start_date ?? date} required />
            <Field id="ev-end-date" name="end_date" type="date" label="Termina" defaultValue={event?.end_date ?? ""} />
          </div>
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field id="ev-start" name="start_time" type="time" label="Das" defaultValue={event?.start_time?.slice(0, 5) ?? "09:00"} required />
              <Field id="ev-end" name="end_time" type="time" label="Até" defaultValue={event?.end_time?.slice(0, 5) ?? "10:00"} required />
            </div>
          )}
          <Field id="ev-location" name="location" label="Local" defaultValue={event?.location ?? ""} maxLength={200} />
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5" htmlFor="ev-freq">
              <span className="text-[13px] font-semibold text-ink-2">Repetir</span>
              <select id="ev-freq" name="freq" value={freq} onChange={(e) => setFreq(e.target.value as typeof freq)} className={select}>
                <option value="none">Não repete</option>
                <option value="daily">Todo dia</option>
                <option value="weekly">Toda semana</option>
                <option value="monthly">Todo mês</option>
              </select>
            </label>
            {freq !== "none" ? (
              <Field id="ev-until" name="repeat_until" type="date" label="Até (opcional)" defaultValue={event?.repeat_until ?? ""} />
            ) : (
              <label className="flex flex-col gap-1.5" htmlFor="ev-remind">
                <span className="text-[13px] font-semibold text-ink-2">Lembrar</span>
                <select id="ev-remind" name="remind_min" defaultValue={event?.remind_min ?? 30} className={select} disabled={allDay}>
                  <option value={-1}>Não lembrar</option>
                  <option value={0}>Na hora</option>
                  <option value={15}>15 min antes</option>
                  <option value={30}>30 min antes</option>
                  <option value={60}>1 h antes</option>
                  <option value={1440}>1 dia antes</option>
                </select>
              </label>
            )}
          </div>
          {freq !== "none" && <input type="hidden" name="remind_min" value={event?.remind_min ?? 30} />}
          {allDay && <input type="hidden" name="remind_min" value={-1} />}
          <label className="flex flex-col gap-1.5" htmlFor="ev-notes">
            <span className="text-[13px] font-semibold text-ink-2">Notas</span>
            <textarea id="ev-notes" name="notes" defaultValue={event?.notes ?? ""} maxLength={2000} rows={2} className="rounded-[14px] border border-line bg-surface px-4 py-3 text-[16px]" />
          </label>
          {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
          <Button type="submit" disabled={saving}>Salvar</Button>
        </form>
        {event && (
          <Button variant="danger" className="self-start" disabled={pending} onClick={() => start(async () => { await deleteEvent(event.id); toast("Evento apagado"); onClose(); })}>
            <Trash2 className="size-4" /> {event.repeat ? "Apagar todas as repetições" : "Apagar evento"}
          </Button>
        )}
      </div>
    </dialog>
  );
}
