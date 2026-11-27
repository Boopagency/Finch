"use client";

import { CalendarDays, CheckSquare, Droplet, MessageCircleHeart, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { setNotify } from "@/features/notifications/server/actions";

const ITEMS = [
  { key: "water", label: "Água", hint: "Lembretes ao longo do dia (horários na tela Água)", Icon: Droplet, tone: "bg-cobalt text-on-cobalt" },
  { key: "habit", label: "Hábitos", hint: "No horário de cada hábito", Icon: Sparkles, tone: "bg-sunflower text-on-color" },
  { key: "task", label: "Tarefas", hint: "Tarefas com horário marcado", Icon: CheckSquare, tone: "bg-coral text-on-color" },
  { key: "event", label: "Agenda", hint: "Antes dos compromissos", Icon: CalendarDays, tone: "bg-lavender text-on-color" },
  { key: "recado", label: "Recados", hint: "Quando a outra pessoa escreve em Nós (o texto não aparece no aviso)", Icon: MessageCircleHeart, tone: "bg-frog text-on-color" },
] as const;

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
            checked={state[key] ?? true}
            aria-label={`Avisos de ${label}`}
            onChange={(e) => {
              const v = e.target.checked;
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
