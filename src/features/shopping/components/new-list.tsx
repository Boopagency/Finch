"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { createList } from "../server/actions";

export function NewList({ spaces }: { spaces: { id: string; kind: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [space, setSpace] = useState(spaces.find((s) => s.kind === "shared")?.id ?? spaces[0]?.id ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createList(name, space);
          toast(r.message);
          if (r.ok) setName("");
        });
      }}
      className="flex flex-wrap items-center gap-2 rounded-[22px] bg-surface p-2 pl-4"
    >
      <label htmlFor="new-list" className="sr-only">Nova lista</label>
      <input id="new-list" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova lista (farmácia, casa…)" maxLength={60} className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] focus:outline-none" />
      {spaces.length > 1 && (
        <select aria-label="Espaço da lista" value={space} onChange={(e) => setSpace(e.target.value)} className="min-h-11 rounded-full bg-surface-2 px-3 text-[13px] font-semibold">
          {spaces.map((s) => <option key={s.id} value={s.id}>{s.kind === "personal" ? "Só eu" : "Nós"}</option>)}
        </select>
      )}
      <button disabled={pending || !name.trim()} aria-label="Criar lista" className="grid size-11 place-items-center rounded-full bg-ink text-bg disabled:opacity-30">
        <Plus className="size-5" />
      </button>
    </form>
  );
}
