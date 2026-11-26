import type { InputHTMLAttributes } from "react";

/**
 * Interruptor do app (trilho 52×32, bolinha 24 que desliza 4→24 px; visual em `.switch`, globals.css).
 * É um checkbox nativo: funciona dentro de formulário (name) e controlado (checked/onChange).
 */
export function Switch({ className = "", ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">) {
  return <input type="checkbox" role="switch" {...props} className={`switch ${className}`} />;
}
