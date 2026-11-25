/** Marca do Finch: pássaro-balão (direção "Canto"). */
export function BrandMark({ className, eye = "var(--stage)" }: { className?: string; eye?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="29" cy="32" r="21" fill="var(--coral)" />
      <path d="M47 25 L61 32 L47 39 Z" fill="var(--coral)" />
      <path d="M12 46 L6 58 L20 51 Z" fill="var(--coral)" />
      <circle cx="36" cy="26" r="3.4" fill={eye} />
    </svg>
  );
}
