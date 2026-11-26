"use client";

import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "coral";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-bg",
  secondary: "bg-surface-2 text-ink",
  ghost: "bg-transparent text-ink",
  danger: "bg-transparent text-danger",
  coral: "bg-coral text-on-color",
};

/** Botão do app. Se for o "enviar" de um formulário que está gravando, mostra o giro na hora (sem precisar de estado). */
export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const { pending } = useFormStatus();
  const busy = props.type === "submit" && pending;
  return (
    <button
      {...props}
      aria-busy={busy || undefined}
      className={`press inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition active:scale-[.97] disabled:opacity-50 ${busy ? "disabled:opacity-80" : ""} ${variants[variant]} ${className}`}
    >
      {busy && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
