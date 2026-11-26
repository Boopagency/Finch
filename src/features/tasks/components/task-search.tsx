"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import type { Space, TaskItem } from "../server/queries";
import { TaskList } from "./task-list";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Busca e filtro por espaço sobre todas as tarefas carregadas. */
export function TaskSearch({ items, spaces, today }: { items: TaskItem[]; spaces: Space[]; today: string }) {
  const [q, setQ] = useState("");
  const [space, setSpace] = useState<string>("all");
  const list = items.filter((i) => (space === "all" || i.space.id === space) && (!q || norm(`${i.title} ${i.notes ?? ""}`).includes(norm(q))));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <label className="field-shell flex min-h-11 flex-1 items-center gap-2 rounded-full bg-surface px-4">
          <Search className="size-4 text-ink-3" />
          <span className="sr-only">Buscar tarefas</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="min-w-0 flex-1 bg-transparent text-[16px] field-inline" />
        </label>
        <label className="sr-only" htmlFor="space-filter">Espaço</label>
        <select id="space-filter" value={space} onChange={(e) => setSpace(e.target.value)} className="min-h-11 rounded-full bg-surface px-3 text-[14px] font-semibold">
          <option value="all">Tudo</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>{s.kind === "personal" ? "Eu" : "Nós"}</option>
          ))}
        </select>
      </div>
      <TaskList items={list} spaces={spaces} today={today} empty="Nada encontrado." />
    </div>
  );
}
