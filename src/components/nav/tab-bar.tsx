"use client";

import { CalendarDays, LayoutGrid, Plus, Sun } from "lucide-react";
import Link from "next/link";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/mark";
import { RegisterSheet, type QuickData } from "./register-sheet";

// 5 posições fixas: nada muda de tamanho ao tocar. Só o destaque desliza por trás.
const SLOTS = [
  { href: "/", label: "Hoje", Icon: Sun },
  { href: "/agenda", label: "Agenda", Icon: CalendarDays },
  null, // botão +
  { href: "/vida", label: "Vida", Icon: LayoutGrid },
  { href: "/finch", label: "Assistente Finch", Icon: null },
] as const;

function slotOf(path: string): number {
  if (path === "/") return 0;
  if (path.startsWith("/agenda")) return 1;
  if (path.startsWith("/finch")) return 4;
  if (path.startsWith("/ajustes")) return -1;
  return 3; // Vida e tudo que mora nela (tarefas, mercado, finanças…)
}

// telas fora da barra que se abrem muito (Vida → Mercado, ícone de Ajustes no Hoje): já ficam prontas
const WARM = ["/mercado", "/ajustes"];

/** `quick` é uma promessa (o layout não espera o banco): a barra aparece na hora e o "+" abre sempre. */
export function TabBar({ quick }: { quick: Promise<QuickData> }) {
  const path = usePathname();
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => WARM.forEach((h) => router.prefetch(h, { kind: "full" as PrefetchKind })), 1500);
    return () => clearTimeout(t);
  }, [router]);
  const [open, setOpen] = useState(false);
  // destaque se move no toque, sem esperar a tela nova (vale até a rota mudar)
  const [tapped, setTapped] = useState<{ idx: number; from: string } | null>(null);
  const idx = tapped && tapped.from === path ? tapped.idx : slotOf(path);

  return (
    <>
      <nav
        aria-label="Principal"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-gutter"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="pointer-events-auto relative grid h-[62px] w-full max-w-md grid-cols-5 items-center rounded-full bg-surface p-1.5 shadow-[var(--shadow-float)]">
          <span
            aria-hidden="true"
            className="tab-indicator absolute inset-y-1.5 left-1.5 rounded-full bg-ink"
            style={{
              width: "calc((100% - 12px) / 5)",
              transform: `translateX(${Math.max(0, idx) * 100}%)`,
              opacity: idx < 0 || idx === 2 ? 0 : 1,
            }}
          />
          {SLOTS.map((s, i) =>
            s === null ? (
              <button
                key="add"
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Registrar"
                aria-haspopup="dialog"
                className="press relative z-10 mx-auto grid size-12 place-items-center rounded-full bg-coral text-on-color shadow-[0_6px_16px_rgb(255_106_92/.35)]"
              >
                <Plus className={`size-6 transition-transform duration-300 ${open ? "rotate-45" : ""}`} strokeWidth={2.6} />
              </button>
            ) : (
              <Link
                key={s.href}
                href={s.href}
                prefetch
                aria-label={s.label}
                aria-current={idx === i ? "page" : undefined}
                onClick={() => setTapped({ idx: i, from: path })}
                className={`press relative z-10 grid h-full place-items-center rounded-full transition-colors duration-200 ${idx === i ? "text-bg" : "text-ink"}`}
              >
                {s.Icon ? (
                  <s.Icon className="size-[22px]" strokeWidth={2.2} />
                ) : (
                  <BrandMark className="size-7" eye={idx === i ? "var(--ink)" : "var(--stage)"} />
                )}
              </Link>
            ),
          )}
        </div>
      </nav>
      <RegisterSheet open={open} onClose={() => setOpen(false)} data={quick} />
    </>
  );
}
