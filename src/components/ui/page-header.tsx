import type { ReactNode } from "react";
import { BackButton } from "@/components/nav/back-button";

/**
 * Título único e dominante da tela + meta à direita. O título encolhe em telas estreitas (iPhone SE) sem estourar.
 * `back`: tela-mãe; mostra "‹" (volta no histórico do app ou vai para ela).
 */
export function PageHeader({ title, meta, back }: { title: string; meta?: ReactNode; back?: string }) {
  return (
    <header className="flex items-end justify-between gap-3 pb-6 pt-4">
      <div className="flex min-w-0 items-end">
        {back && <BackButton parent={back} />}
        <h1 className="min-w-0 font-display text-[clamp(32px,11vw,44px)] font-extrabold leading-none tracking-[-0.04em] [overflow-wrap:anywhere]">{title}</h1>
      </div>
      {meta && <div className="max-w-[45%] shrink pb-1 text-right text-[13px] leading-tight text-ink-3">{meta}</div>}
    </header>
  );
}
