"use client";

import { ArrowUp, Check, FileText, Mic, Paperclip, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BrandMark } from "@/components/brand/mark";
import { toast } from "@/components/ui/toast";
import { shrinkImage } from "@/lib/photos";
import { confirmProposal } from "../server/actions";
import { useVoice } from "./voice";
import { MAX_ATTACH_CHARS, type Attachment, type Proposal } from "../tools";

type Msg = { role: "user" | "assistant"; content: string; files?: string[]; proposals?: (Proposal & { state?: "done" | "dropped" })[] };
const KEY = "finch.chat";
const SUGGESTIONS = ["Como está meu dia?", "Bebi 500 ml", "Gastei 45 no uber", "Coloca leite e ovos na lista", "Conclui a tarefa do dentista"];

const base64 = (b: Blob) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] ?? "");
    r.onerror = () => fail(r.error);
    r.readAsDataURL(b);
  });

/** Foto vira JPEG reduzido; PDF vai inteiro (até ~2,8 MB); o resto (CSV, OFX, TXT) vai como texto. */
async function readAttachment(f: File): Promise<Attachment> {
  if (f.type.startsWith("image/")) return { name: f.name, type: "image/jpeg", data: await base64(await shrinkImage(f)) };
  if (f.type === "application/pdf") {
    if (f.size > 2_800_000) throw new Error("PDF grande demais (máx. 2,8 MB).");
    return { name: f.name, type: "application/pdf", data: await base64(f) };
  }
  if (f.size > 1_000_000) throw new Error("Arquivo grande demais (máx. 1 MB de texto).");
  return { name: f.name, type: "text/plain", data: await f.text() };
}


export function Chat() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  // campo não controlado: o que for digitado antes da tela terminar de carregar não se perde
  const input = useRef<HTMLTextAreaElement>(null);
  const [hasText, setHasText] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const voice = useVoice((text) => void send(text));

  async function pick(list: FileList | null) {
    for (const f of Array.from(list ?? []).slice(0, 3 - files.length)) {
      try {
        const a = await readAttachment(f);
        setFiles((x) => (x.reduce((n, y) => n + y.data.length, 0) + a.data.length > MAX_ATTACH_CHARS ? (toast("Anexos grandes demais para uma mensagem."), x) : [...x, a]));
      } catch (e) {
        toast(e instanceof Error ? e.message : "Não consegui ler o arquivo.");
      }
    }
    if (picker.current) picker.current.value = "";
  }

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
    const attached = files;
    const c = content.trim() || (attached.length ? "Veja o anexo." : "");
    if (!c || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: c, ...(attached.length ? { files: attached.map((f) => f.name) } : {}) }];
    setMsgs(next);
    if (input.current) input.current.value = "";
    setHasText(false);
    setFiles([]);
    setBusy(true);
    try {
      // o servidor aceita até 4000 caracteres por mensagem: resposta longa não pode travar a conversa.
      // ponytail: anexo vai só na mensagem em que foi enviado; nas seguintes fica o nome (reenviar custaria a cota a cada mensagem)
      const history = next.slice(-19).map(({ role, content, files: fs }) => ({ role, content: `${content}${fs?.length ? `\n[anexos: ${fs.join(", ")}]` : ""}`.slice(0, 4000) }));
      while (history.length && history[0]!.role !== "user") history.shift();
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, attachments: attached }) });
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
          <p className="text-[14px] text-stage-muted">Fale, escreva ou mande foto e PDF: eu faço no app. Excluir e dinheiro, só depois que você confirmar.</p>
        </div>
      )}
      <ol className="flex flex-col gap-2" aria-label="Conversa" aria-live="polite">
        {msgs.map((m, i) => (
          <li key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
            {m.files?.map((f) => <span key={f} className="flex max-w-[85%] items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1 text-[13px] text-ink-3"><FileText className="size-3.5" /> {f}</span>)}
            <p className={`max-w-[85%] whitespace-pre-line rounded-[20px] px-4 py-2.5 text-[16px] leading-snug [overflow-wrap:anywhere] ${m.role === "user" ? "rounded-br-[6px] bg-ink text-bg" : "rounded-bl-[6px] bg-surface"}`}>{m.content}</p>
            {m.proposals?.map((p, j) => (
              <div key={j} className="flex w-[85%] flex-col gap-2 rounded-[20px] border-2 border-coral bg-surface p-3" role="group" aria-label="Confirmar ação">
                <span className="text-[15px] font-semibold">{p.summary}</span>
                {p.state ? (
                  <span className="text-[13px] text-ink-3">{p.state === "done" ? "Feito." : "Descartado."}</span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => start(async () => { const r = await confirmProposal(p.tool, p.args); toast(r.message); if (r.ok) { settle(i, j, "done"); router.refresh(); } })}
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
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Anexos">
              {files.map((f, k) => (
                <li key={k} className="flex items-center gap-1 rounded-full bg-surface py-1 pl-3 pr-1 text-[13px] font-semibold shadow-sm">
                  <FileText className="size-3.5" /> <span className="max-w-40 truncate">{f.name}</span>
                  <button type="button" onClick={() => setFiles((x) => x.filter((_, n) => n !== k))} aria-label={`Tirar ${f.name}`} className="grid size-8 place-items-center rounded-full"><X className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={(e) => { e.preventDefault(); void send(input.current?.value ?? ""); }} className="field-shell flex items-end gap-1 rounded-[24px] bg-surface p-2 pl-1 shadow-[var(--shadow-float)]">
            <input ref={picker} type="file" multiple accept="image/*,application/pdf,.csv,.txt,.ofx" className="hidden" onChange={(e) => void pick(e.currentTarget.files)} aria-label="Escolher arquivo" />
            <button type="button" onClick={() => picker.current?.click()} disabled={files.length >= 3 || voice.state !== "idle"} aria-label="Anexar foto ou arquivo" className="press grid size-11 shrink-0 place-items-center rounded-full text-ink-3 disabled:opacity-40">
              <Paperclip className="size-5" />
            </button>
            <label htmlFor="chat-input" className="sr-only">Mensagem para o Finch</label>
            <textarea
              id="chat-input"
              rows={1}
              ref={input}
              hidden={voice.state !== "idle"}
              onInput={(e) => setHasText(!!e.currentTarget.value.trim())}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(e.currentTarget.value); } }}
              placeholder="Escreva, fale ou anexe…"
              maxLength={2000}
              enterKeyHint="send"
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] field-inline"
            />
            {voice.state === "recording" && (
              <div className="flex min-h-11 flex-1 items-center gap-2" role="status" aria-label="Gravando">
                <button type="button" onClick={voice.cancel} aria-label="Cancelar gravação" className="press grid size-11 shrink-0 place-items-center rounded-full text-ink-3"><X className="size-5" /></button>
                <span className="size-2 shrink-0 animate-pulse rounded-full bg-danger" aria-hidden />
                <canvas ref={voice.canvas} className="h-8 min-w-0 flex-1 text-coral" aria-hidden />
                <span className="shrink-0 text-[14px] font-semibold tabular-nums text-ink-2">{Math.floor(voice.seconds / 60)}:{String(voice.seconds % 60).padStart(2, "0")}</span>
              </div>
            )}
            {voice.state === "sending" && <span className="flex min-h-11 flex-1 items-center text-[15px] text-ink-3" role="status">Transcrevendo…</span>}
            {voice.state === "recording" ? (
              <button type="button" onClick={voice.send} aria-label="Parar e enviar áudio" className="press grid size-11 shrink-0 place-items-center rounded-full bg-coral text-on-color">
                <ArrowUp className="size-5" strokeWidth={2.6} />
              </button>
            ) : !hasText && !files.length ? (
              <button type="button" onClick={() => void voice.start()} disabled={busy || voice.state !== "idle"} aria-label="Gravar áudio" className="press grid size-11 shrink-0 place-items-center rounded-full bg-coral text-on-color disabled:opacity-40">
                <Mic className="size-5" />
              </button>
            ) : (
              <button type="submit" disabled={busy} aria-label="Enviar" className="press grid size-11 shrink-0 place-items-center rounded-full bg-coral text-on-color disabled:opacity-40">
                <ArrowUp className="size-5" strokeWidth={2.6} />
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
