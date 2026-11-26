"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** Excluir em dois toques: o primeiro arma (fica vermelho por 3 s), o segundo confirma. Sem janela de confirmação. */
export function ConfirmButton({ onConfirm, children, confirmText = "Toque de novo para excluir", disabled, className = "", label }: {
  onConfirm: () => void;
  children: ReactNode;
  confirmText?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={armed ? confirmText : label}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
      className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors duration-200 disabled:opacity-50 ${armed ? "bg-danger text-white" : "bg-transparent text-danger"} ${className}`}
    >
      <Trash2 className="size-4" />
      {armed ? confirmText : children}
    </button>
  );
}
