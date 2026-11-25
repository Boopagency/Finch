"use client";

import { Plus, Target, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { fmtNum, goalPct, perWeekNeeded } from "../couple";
import type { Goal } from "../server/queries";
import { addToGoal, deleteGoal, saveGoal } from "../server/actions";

type Space = { id: string; kind: string; name: string };

function GoalCard({ g, today, spaceName }: { g: Goal; today: string; spaceName: string }) {
  const [busy, start] = useTransition();
  const pct = goalPct(g.current, g.target);
  const week = perWeekNeeded(g.current, g.target, g.due_on, today);
  const late = g.due_on && !g.done_at && g.due_on < today;
  return (
    <li className={`flex flex-col gap-3 rounded-[22px] p-4 ${g.done_at ? "bg-frog text-on-color" : "bg-surface"}`}>
      <div className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <b className="block text-[17px]">{g.title}</b>
          <span className={`text-[12px] ${g.done_at ? "" : "text-ink-3"}`}>
            {spaceName}
            {g.due_on && ` · até ${new Date(`${g.due_on}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`}
            {late && <b className="text-danger"> · prazo passou</b>}
          </span>
        </span>
        <button disabled={busy} onClick={() => start(async () => { await deleteGoal(g.id); toast("Meta apagada"); })} aria-label={`Apagar ${g.title}`} className="grid size-10 place-items-center opacity-60"><Trash2 className="size-4" /></button>
      </div>
      <div>
        <div className="mb-1 flex items-baseline justify-between text-[14px]">
          <span className="tabular font-semibold">{fmtNum(g.current, g.unit)} <span className="font-normal opacity-70">de {fmtNum(g.target, g.unit)}</span></span>
          <b className="tabular">{pct}%</b>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${g.title}`}>
          <div className={`h-full rounded-full transition-[width] duration-500 ${g.done_at ? "bg-ink" : "bg-frog"}`} style={{ width: `${pct}%` }} />
        </div>
        {week !== null && <p className="mt-1 text-[12px] text-ink-3">{fmtNum(week, g.unit)} por semana para chegar no prazo</p>}
      </div>
      {!g.done_at && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            const v = String(new FormData(f).get("v") ?? "");
            if (!v.trim()) return;
            start(async () => {
              const r = await addToGoal(g.id, v);
              toast(r.message);
              if (r.ok) f.reset();
            });
          }}
        >
          <input name="v" inputMode="decimal" placeholder="+ quanto? (use − para tirar)" aria-label={`Somar em ${g.title}`} className="min-h-11 min-w-0 flex-1 rounded-[14px] border border-line bg-bg px-3 text-[16px]" />
          <Button type="submit" disabled={busy}>Somar</Button>
        </form>
      )}
      {g.done_at && <p className="text-[14px] font-semibold">Batida! +50 pontos no álbum.</p>}
    </li>
  );
}

export function GoalsView({ goals, spaces, today }: { goals: Goal[]; spaces: Space[]; today: string }) {
  const [open, setOpen] = useState(goals.length === 0);
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, f: FormData) => {
    const r = await saveGoal(prev, f);
    if (r.ok) {
      toast(r.message);
      setOpen(false);
    }
    return r;
  }, null);
  const nameOf = new Map(spaces.map((s) => [s.id, s.kind === "shared" ? s.name : "Só eu"]));
  const def = spaces.find((s) => s.kind === "shared")?.id ?? spaces[0]?.id;

  return (
    <div className="flex flex-col gap-3">
      {goals.length === 0 && !open && <EmptyState title="Nenhuma meta ainda">Juntar uma reserva, correr 100 km, ler 12 livros. Metas do casal aparecem para os dois.</EmptyState>}
      <ul className="stagger flex flex-col gap-3">
        {goals.map((g) => <GoalCard key={g.id} g={g} today={today} spaceName={nameOf.get(g.workspace_id) ?? ""} />)}
      </ul>
      {open ? (
        <section aria-label="Nova meta" className="rounded-[22px] bg-surface p-4">
          <h2 className="mb-4 flex items-center gap-2 font-display text-[20px] font-bold"><Target className="size-5" /> Nova meta</h2>
          <form action={action} className="flex flex-col gap-3">
            <Field id="g-title" name="title" label="Meta" required maxLength={80} placeholder="Reserva de emergência" />
            <div className="grid grid-cols-2 gap-2">
              <Field id="g-target" name="target" label="Alvo" inputMode="decimal" required placeholder="10000" />
              <Field id="g-unit" name="unit" label="Unidade" maxLength={12} placeholder="R$, km, livros" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field id="g-due" name="due_on" type="date" label="Prazo (opcional)" min={today} />
              <label className="flex flex-col gap-1.5" htmlFor="g-space"><span className="text-[13px] font-semibold text-ink-2">De quem</span>
                <select id="g-space" name="workspace_id" defaultValue={def} className="min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]">
                  {spaces.map((s) => <option key={s.id} value={s.id}>{nameOf.get(s.id)}</option>)}
                </select>
              </label>
            </div>
            {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
            <div className="flex gap-2"><Button type="submit" disabled={pending}>Criar meta</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
          </form>
        </section>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)} className="self-start"><Plus className="size-4" /> Nova meta</Button>
      )}
    </div>
  );
}
