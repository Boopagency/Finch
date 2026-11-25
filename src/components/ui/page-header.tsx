import type { ReactNode } from "react";

/** Título único e dominante da tela (princípio das referências) + meta à direita. */
export function PageHeader({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 pb-6 pt-4">
      <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em]">{title}</h1>
      {meta && <div className="pb-1 text-right text-[13px] leading-tight text-ink-3">{meta}</div>}
    </header>
  );
}
