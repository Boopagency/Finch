"use client";

import { CalendarPlus, CheckSquare, Droplet, Dumbbell, Receipt, Scale, ShoppingBasket, Sparkles, Wallet } from "lucide-react";
import { useEffect, useRef } from "react";

// Ações rápidas do botão +. Cada uma liga quando o módulo existir (ver docs/ROADMAP.md).
const actions = [
  { label: "Água", Icon: Droplet, tone: "bg-cobalt text-on-cobalt", stage: 2 },
  { label: "Tarefa", Icon: CheckSquare, tone: "bg-sunflower text-on-color", stage: 2 },
  { label: "Evento", Icon: CalendarPlus, tone: "bg-lavender text-on-color", stage: 2 },
  { label: "Mercado", Icon: ShoppingBasket, tone: "bg-frog text-on-color", stage: 2 },
  { label: "Hábito", Icon: Sparkles, tone: "bg-tangerine text-on-color", stage: 2 },
  { label: "Despesa", Icon: Receipt, tone: "bg-coral text-on-color", stage: 3 },
  { label: "Receita", Icon: Wallet, tone: "bg-frog text-on-color", stage: 3 },
  { label: "Treino", Icon: Dumbbell, tone: "bg-ink text-bg", stage: 4 },
  { label: "Peso", Icon: Scale, tone: "bg-surface-2 text-ink", stage: 4 },
] as const;

export function RegisterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      aria-label="Registrar"
      className="fixed inset-x-0 bottom-0 top-auto m-0 w-full max-w-none bg-transparent p-0 backdrop:bg-black/40 open:animate-[sheet_240ms_var(--ease-spring)]"
    >
      <div className="mx-auto max-w-md rounded-t-[28px] bg-bg px-gutter pt-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
        <h2 className="font-display text-[28px] font-extrabold tracking-[-0.03em]">Registrar</h2>
        <p className="mb-5 text-[14px] text-ink-3">Os atalhos ligam conforme cada módulo fica pronto.</p>
        <ul className="grid grid-cols-3 gap-3">
          {actions.map(({ label, Icon, tone, stage }) => (
            <li key={label}>
              <button
                type="button"
                disabled
                className="flex w-full flex-col items-start gap-6 rounded-[20px] bg-surface p-3 text-left disabled:cursor-not-allowed"
              >
                <span className={`grid size-9 place-items-center rounded-[12px] ${tone} opacity-60`}>
                  <Icon className="size-5" strokeWidth={2.2} />
                </span>
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold text-ink-2">{label}</span>
                  <span className="text-[11px] text-ink-3">Etapa {stage}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <style>{`@keyframes sheet{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}`}</style>
    </dialog>
  );
}
