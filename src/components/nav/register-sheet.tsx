"use client";

import { CalendarPlus, Dumbbell, Receipt, Scale, ShoppingBasket, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { HabitList } from "@/features/health/components/habit-list";
import { WaterQuick } from "@/features/health/components/water-quick";
import type { Habit, HabitLog } from "@/features/health/habits";
import { QuickAdd } from "@/features/tasks/components/quick-add";

export type QuickData = {
  today: string;
  water: { logs: { id: string; amount_ml: number }[]; goal: number; presets: number[] };
  habits: Habit[];
  habitLogs: HabitLog[];
  spaces: { id: string; kind: string; name: string }[];
};

// Atalhos que ligam quando cada módulo existir (ver docs/ROADMAP.md).
const later = [
  { label: "Evento", Icon: CalendarPlus, stage: 2 },
  { label: "Mercado", Icon: ShoppingBasket, stage: 2 },
  { label: "Despesa", Icon: Receipt, stage: 3 },
  { label: "Receita", Icon: Wallet, stage: 3 },
  { label: "Treino", Icon: Dumbbell, stage: 4 },
  { label: "Peso", Icon: Scale, stage: 4 },
] as const;

export function RegisterSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: QuickData }) {
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
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none bg-transparent p-0 backdrop:bg-black/40 open:animate-[sheet_240ms_var(--ease-spring)]"
    >
      <div className="mx-auto flex max-h-[88dvh] max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-bg px-gutter pt-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-line" />
        <h2 className="font-display text-[28px] font-extrabold tracking-[-0.03em]">Registrar</h2>

        <QuickAdd today={data.today} spaces={data.spaces} onCreated={onClose} />
        <WaterQuick serverLogs={data.water.logs} goal={data.water.goal} presets={data.water.presets} onLogged={onClose} />

        {data.habits.length > 0 ? (
          <section aria-label="Hábitos de hoje" className="flex flex-col gap-2">
            <h3 className="px-1 text-[13px] font-semibold text-ink-2">Hábitos de hoje</h3>
            <HabitList habits={data.habits} serverLogs={data.habitLogs} today={data.today} onlyPendingToday />
            <Link href="/vida/habitos" onClick={onClose} className="px-1 text-[13px] font-semibold text-ink-3">
              Ver todos os hábitos
            </Link>
          </section>
        ) : (
          <Link href="/vida/habitos" onClick={onClose} className="rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
            Criar o primeiro hábito →
          </Link>
        )}

        <section aria-label="Em breve">
          <h3 className="mb-2 px-1 text-[13px] font-semibold text-ink-3">Em breve</h3>
          <ul className="grid grid-cols-4 gap-2">
            {later.map(({ label, Icon, stage }) => (
              <li key={label} className="flex flex-col items-center gap-1 rounded-[16px] bg-surface p-2 text-ink-3">
                <Icon className="size-5" />
                <span className="text-[11px] font-semibold">{label}</span>
                <span className="text-[10px]">Etapa {stage}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <style>{`@keyframes sheet{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}`}</style>
    </dialog>
  );
}
