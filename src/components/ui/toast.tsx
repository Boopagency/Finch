"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Aviso curto acima da barra, com ação opcional (ex.: Desfazer). Um por vez. */
type Toast = { id: number; text: string; action?: { label: string; run: () => void } };

let current: Toast | null = null;
const listeners = new Set<() => void>();
let seq = 0;

export function toast(text: string, action?: Toast["action"]) {
  current = { id: ++seq, text, action };
  listeners.forEach((l) => l());
}
function dismiss(id: number) {
  if (current?.id !== id) return;
  current = null;
  listeners.forEach((l) => l());
}

// folhas abertas (dialog modal) tornam o resto da tela inerte: enquanto uma folha com aviso próprio
// está aberta, o aviso aparece dentro dela e o da página se cala
let sheets = 0;
const sheetListeners = new Set<() => void>();
function setSheets(delta: number) {
  sheets += delta;
  sheetListeners.forEach((l) => l());
}

export function Toaster({ inSheet = false }: { inSheet?: boolean }) {
  const t = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
    () => null,
  );
  const covered = useSyncExternalStore(
    (l) => (sheetListeners.add(l), () => sheetListeners.delete(l)),
    () => sheets > 0,
    () => false,
  );
  useEffect(() => {
    if (!inSheet) return;
    setSheets(1);
    return () => setSheets(-1);
  }, [inSheet]);
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => dismiss(t.id), 4000);
    return () => clearTimeout(timer);
  }, [t]);

  if (!t || (covered && !inSheet)) return null;
  return (
    <div
      // só o cartão recebe toque; a faixa em volta deixa o toque passar para a tela
      className={`pointer-events-none z-50 flex justify-center px-gutter ${inSheet ? "sticky bottom-3 -mx-[20px]" : "fixed inset-x-0"}`}
      style={inSheet ? undefined : { bottom: "calc(max(12px, env(safe-area-inset-bottom, 0px)) + 72px)" }}
    >
      <div
        key={t.id}
        role="status"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-[18px] bg-ink py-2 pl-4 pr-2 text-bg shadow-[var(--shadow-float)] motion-safe:animate-[toast_220ms_var(--ease-soft)]"
      >
        <span className="flex-1 text-[14px] font-medium">{t.text}</span>
        {t.action && (
          <button
            onClick={() => {
              t.action!.run();
              dismiss(t.id);
            }}
            className="min-h-10 rounded-full px-3 text-[14px] font-bold text-coral"
          >
            {t.action.label}
          </button>
        )}
      </div>
      <style>{`@keyframes toast{from{transform:translateY(12px) scale(.98);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
