"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { WaterSettings } from "../server/queries";
import { updateWaterSettings } from "../server/actions";

export function WaterSettingsForm({ settings }: { settings: WaterSettings }) {
  const [state, action, pending] = useActionState(updateWaterSettings, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Field id="water_goal_ml" name="water_goal_ml" type="number" inputMode="numeric" min={500} max={5000} step={100} label="Meta diária (ml)" defaultValue={settings.water_goal_ml} required />
        <Field id="presets" name="presets" label="Copos (ml)" hint="Até 4, separados por vírgula" defaultValue={settings.water_presets.join(", ")} required />
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 text-[15px] font-semibold">
        Lembretes de água
        <input type="checkbox" name="water_reminders" defaultChecked={settings.water_reminders} className="size-6 accent-[var(--cobalt)]" />
      </label>
      <div className="grid grid-cols-3 gap-3">
        <Field id="water_from" name="water_from" type="time" label="Das" defaultValue={settings.water_from} required />
        <Field id="water_to" name="water_to" type="time" label="Até" defaultValue={settings.water_to} required />
        <label htmlFor="water_every_min" className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-ink-2">A cada</span>
          <select id="water_every_min" name="water_every_min" defaultValue={settings.water_every_min} className="min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]">
            {[30, 45, 60, 90, 120, 180].map((m) => (
              <option key={m} value={m}>{m < 60 ? `${m} min` : `${m / 60} h`.replace(".5", ",5")}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-[13px] text-ink-3">Os lembretes param sozinhos quando você bate a meta do dia. Meta máxima de 5 L.</p>
      {state && <p role="status" className={`text-sm font-medium ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>}
      <Button type="submit" variant="secondary" disabled={pending} className="self-start">Salvar</Button>
    </form>
  );
}
