import type { InputHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  id,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; id: string }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      <input
        id={id}
        {...props}
        className={`min-h-12 rounded-[14px] border border-line bg-surface px-4 text-[16px] text-ink placeholder:text-ink-3 ${className}`}
      />
      {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
    </label>
  );
}
