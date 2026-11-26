"use client";

import { CalendarPlus, Dumbbell, Scale, X } from "lucide-react";
import Link from "next/link";
import { Suspense, use, useEffect, useRef } from "react";
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


/** `data` é uma promessa (vem do layout sem segurar a página): a folha abre na hora e se preenche quando chega. */
export function RegisterSheet({ open, onClose, data }: { open: boolean; onClose: () => void; data: Promise<QuickData> }) {
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
          {/* foco inicial no título (não no 1º campo, que levantaria o teclado, nem no X, que ganhava anel azul);
              com Tab o anel aparece normalmente no X */}
          <h2 ref={(el) => el?.setAttribute("autofocus", "")} tabIndex={-1} className="font-display text-[28px] font-extrabold tracking-[-0.03em] outline-none">Registrar</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="press grid size-11 place-items-center rounded-full bg-surface-2"
          >
            <X className="size-5" />
          </button>
        </div>

        <Suspense fallback={<div aria-busy="true" aria-label="Carregando" className="flex flex-col gap-3">{[64, 88, 64, 120].map((h, i) => <div key={i} className="rounded-[20px] bg-surface motion-safe:animate-pulse" style={{ height: h }} />)}</div>}>
          <SheetBody data={data} onClose={onClose} />
        </Suspense>
        {open && <Toaster inSheet />}
      </div>
      <style>{`@keyframes sheet{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}`}</style>
    </dialog>
  );
}

function SheetBody({ data, onClose }: { data: Promise<QuickData>; onClose: () => void }) {
  const d = use(data);
  return (
    <>
          <QuickAdd today={d.today} spaces={d.spaces} />
          <section aria-label="Gasto ou receita" className="flex flex-col gap-1.5">
            <h3 className="px-1 text-[13px] font-semibold text-ink-2">Gasto ou receita</h3>
            <QuickExpense />
          </section>
          {d.shoppingList && (
            <section aria-label={`Adicionar ao ${d.shoppingList.name}`} className="flex flex-col gap-1.5">
              <h3 className="px-1 text-[13px] font-semibold text-ink-2">{d.shoppingList.name}</h3>
              <QuickItems listId={d.shoppingList.id} />
            </section>
          )}
          <WaterQuick serverLogs={d.water.logs} goal={d.water.goal} presets={d.water.presets} />

          {d.habits.length > 0 ? (
            <section aria-label="Hábitos de hoje" className="flex flex-col gap-2">
              <h3 className="px-1 text-[13px] font-semibold text-ink-2">Hábitos de hoje</h3>
              <HabitList habits={d.habits} serverLogs={d.habitLogs} today={d.today} onlyPendingToday />
              <Link prefetch href="/vida/habitos" onClick={onClose} className="px-1 text-[13px] font-semibold text-ink-3">
                Ver todos os hábitos
              </Link>
            </section>
          ) : (
            <Link prefetch href="/vida/habitos" onClick={onClose} className="rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
              Criar o primeiro hábito →
            </Link>
          )}

          <Link prefetch href="/agenda" onClick={onClose} className="flex items-center gap-2 rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
            <CalendarPlus className="size-5 text-lavender" /> Novo compromisso na agenda
          </Link>

          <div className="grid grid-cols-2 gap-2">
            <Link prefetch href="/vida/treino" onClick={onClose} className="press flex items-center gap-2 rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
              <Dumbbell className="size-5" /> Treino
            </Link>
            <Link prefetch href="/vida/saude" onClick={onClose} className="press flex items-center gap-2 rounded-[20px] bg-surface p-4 text-[15px] font-semibold">
              <Scale className="size-5 text-cobalt" /> Peso e sono
            </Link>
          </div>
    </>
  );
}
