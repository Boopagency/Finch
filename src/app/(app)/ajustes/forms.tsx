"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { updateProfile, updateQuietHours } from "@/features/core/server/actions";

function Status({ state }: { state: { ok: boolean; message: string } | null }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm font-medium ${state.ok ? "text-success" : "text-danger"}`}>
      {state.message}
    </p>
  );
}

export function ProfileForm({ name, tz }: { name: string; tz: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field id="display_name" name="display_name" label="Nome" defaultValue={name} maxLength={60} required />
      <Field id="tz" name="tz" label="Fuso horário" defaultValue={tz} hint="Ex.: America/Sao_Paulo" required />
      <Status state={state} />
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        Salvar
      </Button>
    </form>
  );
}

export function QuietForm({ start, end }: { start: string; end: string }) {
  const [state, action, pending] = useActionState(updateQuietHours, null);
  return (
    <form action={action} className="flex flex-col gap-3 border-t border-line pt-4">
      <p className="text-[14px] text-ink-2">Horário silencioso: lembretes não urgentes esperam até o fim.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field id="quiet_start" name="quiet_start" type="time" label="Começa" defaultValue={start} required />
        <Field id="quiet_end" name="quiet_end" type="time" label="Termina" defaultValue={end} required />
      </div>
      <Status state={state} />
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">
        Salvar horário
      </Button>
    </form>
  );
}
