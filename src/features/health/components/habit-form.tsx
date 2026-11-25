"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { archiveHabit, saveHabit } from "../server/actions";
import type { Habit } from "../habits";

const tones = ["coral", "sunflower", "tangerine", "cobalt", "lavender", "frog"] as const;
const toneBg: Record<string, string> = {
  coral: "bg-coral", sunflower: "bg-sunflower", tangerine: "bg-tangerine", cobalt: "bg-cobalt", lavender: "bg-lavender", frog: "bg-frog",
};
const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

export function HabitForm({ habit, onDone }: { habit?: Habit; onDone?: () => void }) {
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveHabit>> | null, form: FormData) => {
    const r = await saveHabit(prev, form);
    if (r.ok) {
      toast(r.message);
      onDone?.();
    }
    return r;
  }, null);
  const [kind, setKind] = useState<Habit["kind"]>(habit?.kind ?? "check");
  const [period, setPeriod] = useState<Habit["period"]>(habit?.period ?? "day");
  const p = habit?.id ?? "new";

  const seg = (name: string, value: string, label: string, checked: boolean, onChange: () => void) => (
    <label className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full text-[14px] font-semibold ${checked ? "bg-ink text-bg" : "bg-surface-2"}`}>
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      {label}
    </label>
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      {habit && <input type="hidden" name="id" value={habit.id} />}
      <Field id={`${p}-name`} name="name" label="Hábito" placeholder="Ler, alongar, tomar vitamina…" defaultValue={habit?.name} maxLength={60} required />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Como conta</legend>
        <div className="flex gap-2">
          {seg("kind", "check", "Feito / não feito", kind === "check", () => setKind("check"))}
          {seg("kind", "quantity", "Quantidade", kind === "quantity", () => setKind("quantity"))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Frequência</legend>
        <div className="flex gap-2">
          {seg("period", "day", "Nos dias…", period === "day", () => setPeriod("day"))}
          {seg("period", "week", "X vezes na semana", period === "week", () => setPeriod("week"))}
        </div>
      </fieldset>

      {period === "day" && (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Dias</legend>
          <div className="flex justify-between gap-1">
            {weekdays.map((d, i) => (
              <label key={i} className="relative grid size-11 cursor-pointer place-items-center rounded-full bg-surface-2 text-[14px] font-bold has-[:checked]:bg-ink has-[:checked]:text-bg">
                <input type="checkbox" name="days" value={i} defaultChecked={habit ? habit.days.includes(i) : true} className="sr-only" />
                {d}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {period === "week" && <input type="hidden" name="days" value="0" />}

      {(kind === "quantity" || period === "week") && (
        <div className="grid grid-cols-2 gap-3">
          <Field
            id={`${p}-target`}
            name="target"
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            label={period === "week" && kind === "check" ? "Vezes por semana" : "Meta"}
            defaultValue={habit?.target ?? (period === "week" ? 3 : 10)}
            required
          />
          {kind === "quantity" && <Field id={`${p}-unit`} name="unit" label="Unidade" placeholder="páginas, min" defaultValue={habit?.unit ?? ""} maxLength={12} />}
        </div>
      )}
      {kind === "check" && period === "day" && <input type="hidden" name="target" value="1" />}

      <Field id={`${p}-reminder`} name="reminder_time" type="time" label="Lembrete (opcional)" defaultValue={habit?.reminder_time ?? ""} />

      <fieldset>
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Cor</legend>
        <div className="flex gap-2">
          {tones.map((t) => (
            <label key={t} className={`grid size-11 cursor-pointer place-items-center rounded-full ${toneBg[t]} ring-ink ring-offset-2 ring-offset-surface has-[:checked]:ring-2`}>
              <input type="radio" name="tone" value={t} defaultChecked={(habit?.tone ?? "sunflower") === t} className="sr-only" />
              <span className="sr-only">{t}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state && <p role="status" className={`text-sm font-medium ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>{habit ? "Salvar" : "Criar hábito"}</Button>
        {habit && (
          <Button type="button" variant="danger" onClick={() => void archiveHabit(habit.id).then(onDone)}>
            Arquivar
          </Button>
        )}
      </div>
    </form>
  );
}
