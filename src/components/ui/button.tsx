import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "coral";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-bg",
  secondary: "bg-surface-2 text-ink",
  ghost: "bg-transparent text-ink",
  danger: "bg-transparent text-danger",
  coral: "bg-coral text-on-color",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition active:scale-[.97] disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}
