"use client";

import { ArrowUp, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BrandMark } from "@/components/brand/mark";
import { toast } from "@/components/ui/toast";
import { quickExpense } from "@/features/finance/server/actions";
import type { Proposal } from "../tools";

type Msg = { role: "user" | "assistant"; content: string; proposals?: (Proposal & { state?: "done" | "dropped" })[] };
const KEY = "finch.chat";
const SUGGESTIONS = ["Como está meu dia?", "Bebi 500 ml", "Gastei 45 no uber", "Coloca leite e ovos na lista", "Lembrar de pagar a luz sexta 9h"];

export function Chat() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  // campo não controlado: o que for digitado antes da tela terminar de carregar não se perde
  const input = useRef<HTMLTextAreaElement>(null);
  const [hasText, setHasText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  // conversa fica só nesta aba (conveniência); nada disso vai para o servidor além do que é enviado
  useEffect(() => {
    setTimeout(() => setHasText(!!input.current?.value.trim()), 0);
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as Msg[];
      if (saved.length) setTimeout(() => setMsgs(saved), 0);
    } catch {}
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30))); } catch {}
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs]);

  async function send(content: string) {
    const c = content.trim();
    if (!c || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: c }];
    setMsgs(next);
    if (input.current) input.current.value = "";
    setHasText(false);
    setBusy(true);
    try {
      const history = next.slice(-19).map(({ role, content }) => ({ role, content }));
      while (history.length && history[0]!.role !== "user") history.shift();
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) });
      const data = await res.json().catch(() => ({}));
      const reply = res.ok ? data.text : data.message ?? "Não consegui responder agora. Tenta de novo.";
      setMsgs([...next, { role: "assistant", content: reply, proposals: res.ok ? data.proposals : undefined }]);
      if (data.changed) router.refresh();
    } catch {
      setMsgs([...next, { role: "assistant", content: "Sem conexão agora. Os atalhos do + funcionam offline." }]);
    } finally {
      setBusy(false);
    }
  }

  const settle = (mi: number, pi: number, state: "done" | "dropped") =>
    setMsgs((m) => m.map((x, i) => (i === mi ? { ...x, proposals: x.proposals?.map((p, j) => (j === pi ? { ...p, state } : p)) } : x)));

  return (
    <div className="flex min-h-[60dvh] flex-col gap-3 pb-40">
      {msgs.length === 0 && (
        <div className="flex flex-col gap-3 rounded-[22px] bg-stage p-5 text-stage-ink">
          <BrandMark className="size-10" />
          <p className="font-display text-[24px] font-extrabold leading-tight">Oi! Me conta o que aconteceu ou pergunta do seu dia.</p>
          <p className="text-[14px] text-stage-muted">Eu registro tarefas, água e mercado. Dinheiro, só depois que você confirmar.</p>
        </div>
      )}
      <ol className="flex flex-col gap-2" aria-label="Conversa" aria-live="polite">
        {msgs.map((m, i) => (
          <li key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
            <p className={`max-w-[85%] whitespace-pre-line rounded-[20px] px-4 py-2.5 text-[16px] leading-snug [overflow-wrap:anywhere] ${m.role === "user" ? "rounded-br-[6px] bg-ink text-bg" : "rounded-bl-[6px] bg-surface"}`}>{m.content}</p>
            {m.proposals?.map((p, j) => (
              <div key={j} className="flex w-[85%] flex-col gap-2 rounded-[20px] border-2 border-coral bg-surface p-3" role="group" aria-label="Confirmar lançamento">
                <span className="text-[15px] font-semibold">{p.summary}</span>
                {p.state ? (
                  <span className="text-[13px] text-ink-3">{p.state === "done" ? "Lançado." : "Descartado."}</span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => start(async () => { const r = await quickExpense(p.text); toast(r.message); if (r.ok) { settle(i, j, "done"); router.refresh(); } })}
                      className="press flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-coral text-[15px] font-bold text-on-color"
                    >
                      <Check className="size-4" /> Confirmar
                    </button>
                    <button onClick={() => settle(i, j, "dropped")} className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface-2 px-4 text-[15px] font-semibold"><X className="size-4" /> Descartar</button>
                  </div>
                )}
              </div>
            ))}
          </li>
        ))}
        {busy && <li className="flex"><span className="rounded-[20px] rounded-bl-[6px] bg-surface px-4 py-3 text-[16px] text-ink-3" aria-label="Finch está escrevendo">•••</span></li>}
      </ol>
      <div ref={end} />

      <div className="fixed inset-x-0 z-30 px-gutter" style={{ bottom: "calc(max(12px, env(safe-area-inset-bottom, 0px)) + 74px)" }}>
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {msgs.length === 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="press min-h-10 shrink-0 rounded-full bg-surface px-4 text-[14px] font-semibold shadow-sm">{s}</button>)}
            </div>
          )}
          <form onSubmit={(e) => { e.preventDefault(); void send(input.current?.value ?? ""); }} className="field-shell flex items-end gap-2 rounded-[24px] bg-surface p-2 pl-4 shadow-[var(--shadow-float)]">
            <label htmlFor="chat-input" className="sr-only">Mensagem para o Finch</label>
            <textarea
              id="chat-input"
              rows={1}
              ref={input}
              onInput={(e) => setHasText(!!e.currentTarget.value.trim())}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e.currentTarget.value); } }}
              placeholder="Escreva ou dite…"
              maxLength={2000}
              enterKeyHint="send"
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] field-inline"
            />
            <button type="submit" disabled={busy || !hasText} aria-label="Enviar" className="press grid size-11 shrink-0 place-items-center rounded-full bg-coral text-on-color disabled:opacity-40">
              <ArrowUp className="size-5" strokeWidth={2.6} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
