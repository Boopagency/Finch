"use client";

import { useEffect, useRef, useState } from "react";
import { addDays } from "@/features/health/habits";
import { VIEWS, type View } from "../views";
import type { Space, TaskItem } from "../server/queries";
import { Kanban } from "./kanban";
import { QuickAdd } from "./quick-add";
import { useTaskItems } from "./use-task-items";
import { TaskList } from "./task-list";
import { TaskSearch } from "./task-search";


const EMPTY: Record<string, string> = {
  hoje: "Nada para hoje. Aproveite.",
  proximas: "Nada nas próximas duas semanas.",
  entrada: "Nenhuma tarefa sem data.",
  casa: "Nenhuma rotina da casa ainda. Tente: “lavar roupa toda quarta #casa @nós”.",
};

/** As visões filtram o que já está na tela: trocar é instantâneo, e a URL acompanha (sem ir ao servidor). */
export function TaskViews({ initial, items: server, spaces, today }: { initial: View; items: TaskItem[]; spaces: Space[]; today: string }) {
  const items = useTaskItems(server, today, spaces);
  const [view, setView] = useState<View>(initial);
  const [seen, setSeen] = useState(initial);
  if (seen !== initial) {
    setSeen(initial);
    setView(initial);
  }
  // a aba escolhida fica inteira na tela (só rola a fileira, nunca a página)
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    const n = nav.current;
    const chip = n?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!n || !chip) return;
    const pad = 20;
    const left = chip.offsetLeft; // a fileira é `relative`: posição dentro do conteúdo rolável
    const right = left + chip.offsetWidth;
    if (left < n.scrollLeft + pad) n.scrollTo({ left: left - pad, behavior: "smooth" });
    else if (right > n.scrollLeft + n.clientWidth - pad) n.scrollTo({ left: right - n.clientWidth + pad, behavior: "smooth" });
  }, [view]);
  const filtered = {
    hoje: () => items.filter((i) => i.date && i.date <= today),
    proximas: () => items.filter((i) => i.date && i.date > today && i.date <= addDays(today, 14)),
    entrada: () => items.filter((i) => !i.date),
    casa: () => items.filter((i) => i.category === "casa"),
    quadro: () => items,
    todas: () => items,
  }[view]();

  return (
    <>
      <QuickAdd today={today} spaces={spaces} />
      {/* degradê nas bordas: indica que a fileira rola */}
      <nav ref={nav} aria-label="Visões" data-scroll-x className="relative -mx-5 flex gap-1.5 overflow-x-auto px-5 [mask-image:linear-gradient(to_right,transparent,#000_20px,#000_calc(100%-20px),transparent)] [scrollbar-width:none]">
        {VIEWS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            aria-current={view === v ? "page" : undefined}
            onClick={() => {
              setView(v);
              window.history.replaceState(null, "", v === "hoje" ? "/tarefas" : `/tarefas?v=${v}`);
            }}
            className={`press shrink-0 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors duration-150 ${view === v ? "bg-ink text-bg" : "bg-surface text-ink-2"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      {view === "quadro" ? (
        <Kanban items={filtered} spaces={spaces} today={today} />
      ) : view === "todas" ? (
        <TaskSearch items={filtered} spaces={spaces} today={today} />
      ) : (
        <TaskList items={filtered} spaces={spaces} today={today} group={view !== "entrada"} empty={EMPTY[view]} />
      )}
    </>
  );
}
