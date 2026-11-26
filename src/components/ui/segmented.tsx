"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

type Tone = "ink" | "lavender" | "coral" | "cobalt" | "frog" | "sunflower";
const INDICATOR: Record<Tone, string> = {
  ink: "bg-ink", lavender: "bg-lavender", coral: "bg-coral", cobalt: "bg-cobalt", frog: "bg-frog", sunflower: "bg-sunflower",
};
const ON: Record<Tone, string> = {
  ink: "text-bg", lavender: "text-on-color", coral: "text-on-color", cobalt: "text-on-cobalt", frog: "text-on-color", sunflower: "text-on-color",
};

export type SegmentOption<T extends string> = { value: T; label: string; icon?: ReactNode; tone?: Tone; href?: string };

/**
 * Seletor segmentado: um destaque desliza (mola) por trás de opções de largura igual — nada muda de tamanho.
 * Com `href`, cada opção é um link e o destaque já se move no toque, sem esperar a tela nova.
 */
export function Segmented<T extends string>({ options, value, onChange, label, size = "md", className = "" }: {
  options: SegmentOption<T>[];
  value: T;
  onChange?: (v: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [tap, setTap] = useState<{ to: T; from: T } | null>(null);
  const shown = tap && tap.from === value ? tap.to : value;
  const idx = Math.max(0, options.findIndex((o) => o.value === shown));
  const tone = options[idx]?.tone ?? "ink";
  const n = options.length;
  const h = size === "sm" ? "min-h-9 text-[13px]" : "min-h-11 text-[14px]";

  return (
    <div role="radiogroup" aria-label={label} className={`relative grid rounded-full bg-surface-2 p-1 ${className}`} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span
        aria-hidden="true"
        className={`segment-indicator absolute inset-y-1 left-1 rounded-full shadow-[0_2px_8px_rgb(0_0_0/.14)] ${INDICATOR[tone]}`}
        style={{ width: `calc((100% - 8px) / ${n})`, transform: `translateX(${idx * 100}%)` }}
      />
      {options.map((o, i) => {
        const active = i === idx;
        const cls = `press relative z-10 flex ${h} items-center justify-center gap-1.5 rounded-full px-2 font-semibold transition-colors duration-200 ${active ? ON[o.tone ?? "ink"] : "text-ink-2"}`;
        const body = (
          <>
            {o.icon}
            <span className="truncate">{o.label}</span>
          </>
        );
        return o.href ? (
          <Link key={o.value} href={o.href} replace role="radio" aria-checked={active} onClick={() => setTap({ to: o.value, from: value })} className={cls}>
            {body}
          </Link>
        ) : (
          <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => { setTap(null); onChange?.(o.value); }} className={cls}>
            {body}
          </button>
        );
      })}
    </div>
  );
}
