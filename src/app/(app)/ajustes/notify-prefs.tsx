"use client";

import { CalendarDays, CheckSquare, Droplet, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { setNotify } from "@/features/notifications/server/actions";

const ITEMS = [
  { key: "water", label: "Água", hint: "Lembretes ao longo do dia (horários na tela Água)", Icon: Droplet, tone: "bg-cobalt text-on-cobalt" },
  { key: "habit", label: "Hábitos", hint: "No horário de cada hábito", Icon: Sparkles, tone: "bg-sunflower text-on-color" },
  { key: "task", label: "Tarefas", hint: "Tarefas com horário marcado", Icon: CheckSquare, tone: "bg-coral text-on-color" },
  { key: "event", label: "Agenda", hint: "Antes dos compromissos", Icon: CalendarDays, tone: "bg-lavender text-on-color" },
] as const;

/** Interruptor acessível (role=switch) com resposta imediata. */
function Switch({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-8 w-[52px] shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-frog" : "bg-surface-2"}`}
    >
      <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-transform duration-300 [transition-timing-function:var(--ease-soft)] ${on ? "translate-x-[24px]" : "translate-x-1"}`} />
    </button>
  );
}

export function NotifyPrefs({ initial }: { initial: Record<string, boolean> }) {
  const [state, setState] = useState(initial);
  const [, start] = useTransition();
  return (
    <ul className="flex flex-col divide-y divide-line" aria-label="O que receber">
      {ITEMS.map(({ key, label, hint, Icon, tone }) => (
        <li key={key} className="flex items-center gap-3 py-3">
          <span className={`grid size-9 shrink-0 place-items-center rounded-[11px] ${tone}`}><Icon className="size-4.5" strokeWidth={2.4} /></span>
          <span className="min-w-0 flex-1">
            <b className="block text-[15px]">{label}</b>
            <span className="text-[12px] text-ink-3">{hint}</span>
          </span>
          <Switch
            on={state[key] ?? true}
            label={`Avisos de ${label}`}
            onChange={(v) => {
              setState({ ...state, [key]: v });
              start(async () => {
                const r = await setNotify(key, v);
                if (!r.ok) {
                  setState((s) => ({ ...s, [key]: !v }));
                  toast("Não consegui salvar.");
                } else toast(v ? `${label}: avisos ligados` : `${label}: avisos desligados`);
              });
            }}
          />
        </li>
      ))}
    </ul>
  );
}
