"use client";

import { CalendarPlus, Dumbbell, Scale, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { HabitList } from "@/features/health/components/habit-list";
import { WaterQuick } from "@/features/health/components/water-quick";
import type { Habit, HabitLog } from "@/features/health/habits";
import { QuickExpense } from "@/features/finance/components/finance-view";
import { QuickItems } from "@/features/shopping/components/shopping-list";
import { QuickAdd } from "@/features/tasks/components/quick-add";
import { Toaster } from "@/components/ui/toast";

export type QuickData = {
  today: string;
  water: { logs: { id: string; amount_ml: number }[]; goal: number; presets: number[] };
  habits: Habit[];
  habitLogs: HabitLog[];
  spaces: { id: string; kind: string; name: string }[];
  shoppingList: { id: string; name: string } | null;
};


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
      className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none bg-transparent p-0"
    >
      <div className="mx-auto flex max-h-[88dvh] max-w-md flex-col gap-4 overflow-y-auto rounded-t-[28px] bg-bg px-gutter pt-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto h-1.5 w-10 shrink-0 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[28px] font-extrabold tracking-[-0.03em]">Registrar</h2>
          {/* foco inicial aqui (e não no primeiro campo): abrir a folha não levanta o teclado */}
          <button
            type="button"
            ref={(el) => el?.setAttribute("autofocus", "")}
            onClick={onClose}
            aria-label="Fechar"
            className="press grid size-11 place-items-center rounded-full bg-surface-2"
          >
            <X className="size-5" />
          </button>
        </div>

        <QuickAdd today={data.today} spaces={data.spaces} />
        <section aria-label="Gasto ou receita" className="flex flex-col gap-1.5">
          <h3 className="px-1 text-[13px] font-semibold text-ink-2">Gasto ou receita</h3>
          <QuickExpense />
        </section>
        {data.shoppingList && (
          <section aria-label={`Adicionar ao ${data.shoppingList.name}`} className="flex flex-col gap-1.5">
            <h3 className="px-1 text-[13px] font-semibold text-ink-2">{data.shoppingList.name}</h3>
            <QuickItems listId={data.shoppingList.id} />
          </section>
        )}
        <WaterQuick serverLogs={data.water.logs} goal={data.water.goal} presets={data.water.presets} />

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

        <Link href="/agenda" onClick={onClose} className="flex items-center gap-2 rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
          <CalendarPlus className="size-5 text-lavender" /> Novo compromisso na agenda
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/vida/treino" onClick={onClose} className="press flex items-center gap-2 rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
            <Dumbbell className="size-5" /> Treino
          </Link>
          <Link href="/vida/saude" onClick={onClose} className="press flex items-center gap-2 rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
            <Scale className="size-5 text-cobalt" /> Peso e sono
          </Link>
        </div>
        {open && <Toaster inSheet />}
      </div>
      <style>{`@keyframes sheet{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}`}</style>
    </dialog>
  );
}
