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

export function Toaster() {
  const t = useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => current,
    () => null,
  );
  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => dismiss(t.id), 4000);
    return () => clearTimeout(timer);
  }, [t]);

  if (!t) return null;
  return (
    <div
      className="fixed inset-x-0 z-50 flex justify-center px-gutter"
      style={{ bottom: "calc(max(12px, env(safe-area-inset-bottom, 0px)) + 72px)" }}
    >
      <div
        role="status"
        className="flex w-full max-w-md items-center gap-3 rounded-[18px] bg-ink py-2 pl-4 pr-2 text-bg shadow-[var(--shadow-float)] motion-safe:animate-[toast_200ms_var(--ease-spring)]"
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
      <style>{`@keyframes toast{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}`}</style>
    </div>
  );
}
