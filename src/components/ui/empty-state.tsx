import type { ReactNode } from "react";

/** Tela/área sem conteúdo ainda. Nunca finge dados. */
export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-[20px] bg-surface p-5">
      <h2 className="font-display text-[20px] font-bold tracking-tight">{title}</h2>
      <div className="text-[15px] leading-relaxed text-ink-2">{children}</div>
      {action}
    </div>
  );
}
