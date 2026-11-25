"use client";

import { ArrowUp } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { describeRepeat } from "../recurrence";
import { parseQuickTask } from "../quick-parse";
import { createTaskQuick } from "../server/actions";

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
  const [pending, start] = useTransition();
  const p = text.trim() ? parseQuickTask(text, today) : null;
  const targetShared = p?.shared || space === shared?.id;

  const chips = p
    ? [
        p.repeat && describeRepeat(p.repeat),
        p.due_date && fmtDate(p.due_date),
        p.due_time,
        p.category && `#${CAT[p.category]}`,
        p.priority && "!".repeat(p.priority),
        targetShared && shared && "Nós",
      ].filter(Boolean)
    : [];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    start(async () => {
      const r = await createTaskQuick(text, space);
      toast(r.message);
      if (r.ok) {
        setText("");
        onCreated?.();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-[22px] bg-surface p-3">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="sr-only">Nova tarefa</label>
        <input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Nova tarefa… ex.: lavar roupa toda quarta #casa"
          autoFocus={autoFocus}
          autoComplete="off"
          enterKeyHint="send"
          maxLength={300}
          className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-[16px] placeholder:text-ink-3 focus:outline-none"
        />
        <button type="submit" disabled={pending || !text.trim()} aria-label="Criar tarefa" className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-bg disabled:opacity-30">
          <ArrowUp className="size-5" strokeWidth={2.6} />
        </button>
      </div>
      {(chips.length > 0 || shared) && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {shared && (
            <div role="group" aria-label="Onde criar" className="mr-1 flex rounded-full bg-surface-2 p-0.5">
              {[personal, shared].map((s) =>
                s ? (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={space === s.id}
                    onClick={() => setSpace(s.id)}
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold ${space === s.id ? "bg-ink text-bg" : "text-ink-2"}`}
                  >
                    {s.kind === "personal" ? "Só eu" : "Nós"}
                  </button>
                ) : null,
              )}
            </div>
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
