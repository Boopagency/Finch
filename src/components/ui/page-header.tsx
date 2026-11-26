import type { ReactNode } from "react";

/** Título único e dominante da tela + meta à direita. O título encolhe em telas estreitas (iPhone SE) sem estourar. */
export function PageHeader({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pb-6 pt-4">
      <h1 className="min-w-0 font-display text-[clamp(32px,11vw,44px)] font-extrabold leading-none tracking-[-0.04em] [overflow-wrap:anywhere]">{title}</h1>
      {meta && <div className="max-w-[45%] shrink pb-1 text-right text-[13px] leading-tight text-ink-3">{meta}</div>}
    </header>
  );
}
