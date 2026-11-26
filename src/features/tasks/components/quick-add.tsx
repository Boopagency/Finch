"use client";

import { ArrowUp, User, Users } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { useId, useState } from "react";
import { toast } from "@/components/ui/toast";
import { describeRepeat } from "../recurrence";
import { parseQuickTask } from "../quick-parse";
import { enqueue } from "@/lib/outbox";

const CAT: Record<string, string> = { casa: "Casa", contas: "Contas", trabalho: "Trabalho", saude: "Saúde", compras: "Compras", nos: "Nós" };

function fmtDate(d: string) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** Campo único que entende "Lavar roupa toda quarta #casa @nós". */
export function QuickAdd({ today, spaces, autoFocus, onCreated }: {
  today: string;
  spaces: { id: string; kind: string; name: string }[];
  autoFocus?: boolean;
  onCreated?: () => void;
}) {
  const inputId = useId();
  const [text, setText] = useState("");
  const shared = spaces.find((s) => s.kind === "shared");
  const personal = spaces.find((s) => s.kind === "personal");
  const [space, setSpace] = useState(personal?.id);
  const p = text.trim() ? parseQuickTask(text, today) : null;
  const targetShared = p?.shared || space === shared?.id;

  const chips = p
    ? [
        p.repeat && describeRepeat(p.repeat),
        p.due_date && fmtDate(p.due_date),
        p.due_time,
        p.category && `#${CAT[p.category]}`,
        p.priority && "!".repeat(p.priority),
              ].filter(Boolean)
    : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !p) return;
    if (!p.title) return toast("Faltou o nome da tarefa.");
    // vai pela fila: aparece na lista e o aviso sai na hora; o servidor grava em segundo plano
    // (se recusar, a tarefa some e o aviso de erro aparece — ver SyncAgent)
    void enqueue({ id: crypto.randomUUID(), type: "task.create", text: text.trim(), workspace_id: targetShared ? (shared?.id ?? null) : (space ?? null) });
    setText("");
    toast(p.repeat ? `Criada: ${p.title} (recorrente)` : `Criada: ${p.title}`);
    onCreated?.();
  }

  return (
    <form onSubmit={submit} className="field-shell flex flex-col gap-2 rounded-[22px] bg-surface p-3 transition-shadow">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">Nova tarefa</label>
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nova tarefa… ex.: luz sexta 9h"
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="send"
          maxLength={300}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-[16px] placeholder:text-ink-3 field-inline"
        />
        <button type="submit" disabled={!text.trim()} aria-label="Criar tarefa" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-bg disabled:opacity-30">
          <ArrowUp className="size-5" strokeWidth={2.6} />
        </button>
      </div>
      {(chips.length > 0 || shared) && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {shared && personal && (
            <Segmented
              label="Onde criar"
              size="sm"
              className="mr-1 w-44"
              value={targetShared ? shared.id : personal.id}
              onChange={(v) => setSpace(v)}
              options={[
                { value: personal.id, label: "Só eu", icon: <User className="size-3.5" strokeWidth={2.4} /> },
                { value: shared.id, label: "Nós", icon: <Users className="size-3.5" strokeWidth={2.4} />, tone: "lavender" },
              ]}
            />
          )}
          {chips.map((c) => (
            <span key={String(c)} className="rounded-full bg-sunflower px-2.5 py-1 text-[12px] font-semibold text-on-color">
              {c}
            </span>
          ))}
        </div>
      )}
    </form>
  );
}
