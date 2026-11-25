"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { saveBodyLog } from "../server/actions";
import { MOODS } from "../training";

export function BodyForm() {
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, form: FormData) => {
    const r = await saveBodyLog(prev, form);
    if (r.ok) toast(r.message);
    return r;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Field id="b-weight" name="weight" label="Peso (kg)" inputMode="decimal" placeholder="82,5" />
        <Field id="b-waist" name="waist" label="Cintura (cm)" inputMode="decimal" placeholder="88" />
        <Field id="b-sleep" name="sleep" label="Sono" placeholder="7h30" />
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Como você está?</legend>
        <div className="flex gap-1.5">
          {MOODS.slice(1).map((m, i) => (
            <label key={m} className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold has-[:checked]:bg-ink has-[:checked]:text-bg">
              <input type="radio" name="mood" value={i + 1} className="sr-only" />
              {m}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="b-note" name="note" label="Nota (opcional)" maxLength={280} />
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
      <Button type="submit" disabled={pending} className="self-start">Salvar</Button>
    </form>
  );
}
