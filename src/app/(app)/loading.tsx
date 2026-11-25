"use client";

import { usePathname } from "next/navigation";

/** Aparece no mesmo instante do toque (pré-carregado), enquanto a tela busca os dados. */
export default function Loading() {
  const stage = usePathname() === "/"; // o Hoje tem fundo escuro: esqueleto acompanha
  const block = `rounded-[20px] motion-safe:animate-pulse ${stage ? "bg-white/10" : "bg-surface"}`;
  return (
    <div aria-busy="true" aria-label="Carregando" className={stage ? "min-h-dvh bg-stage" : ""}>
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-gutter pt-safe">
        <div className="flex items-end justify-between pb-6 pt-4">
          <div className={`h-11 w-40 rounded-[12px] motion-safe:animate-pulse ${stage ? "bg-white/15" : "bg-surface-2"}`} />
          <div className={`h-4 w-20 rounded-full ${stage ? "bg-white/10" : "bg-surface-2"}`} />
        </div>
        <div className={`${block} h-16`} />
        <div className={`${block} h-28`} />
        <div className={`${block} h-20`} />
        <div className={`${block} h-20`} />
      </div>
    </div>
  );
}
