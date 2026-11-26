"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Excluir em dois toques (padrão do app, sem janela de confirmação): o 1º toque arma — fica vermelho com
 * "Toque de novo para apagar" —, o 2º confirma. Desarma sozinho em 3 s ou com um toque fora dele.
 * `compact`: só o ícone em repouso (linhas de lista); armado, abre a pílula com o texto. `idle` troca o visual em repouso
 * do compacto (ex.: sobre uma foto).
 */
export function ConfirmButton({ onConfirm, children, confirmText = "Toque de novo para apagar", disabled, className = "", label, compact = false, idle = "size-11 justify-center text-ink-3", icon = <Trash2 className="size-4 shrink-0" /> }: {
  onConfirm: () => void;
  children?: ReactNode;
  confirmText?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  compact?: boolean;
  idle?: string;
  icon?: ReactNode;
}) {
  const [armed, setArmed] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    const outside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setArmed(false);
    };
    document.addEventListener("pointerdown", outside, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [armed]);

  const look = compact
    ? armed
      ? "min-h-11 gap-1.5 bg-danger px-3 text-[13px] text-white"
      : idle
    : `min-h-11 justify-center gap-2 px-4 text-[15px] ${armed ? "bg-danger text-white" : "bg-transparent text-danger"}`;
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label={armed ? confirmText : label}
      onClick={() => {
        if (!armed) return setArmed(true);
        setArmed(false);
        onConfirm();
      }}
      className={`press inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-semibold transition-colors duration-200 disabled:opacity-50 ${look} ${className}`}
    >
      {compact && !armed ? (children ?? icon) : icon}
      {compact ? armed && confirmText : armed ? confirmText : children}
    </button>
  );
}
