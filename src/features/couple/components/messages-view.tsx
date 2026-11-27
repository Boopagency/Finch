"use client";

import { Check, CheckCheck, ImagePlus, Pencil, SendHorizonal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { uploadPhoto } from "@/lib/photos";
import type { Message } from "../server/queries";
import { deleteMessage, editMessage, markRead, sendMessage } from "../server/actions";

type Who = { id: string; name: string; url: string | null };
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dayLabel = (iso: string, today: string) => {
  const d = iso.slice(0, 10);
  if (d === today) return "Hoje";
  const y = new Date(`${today}T12:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (d === y.toISOString().slice(0, 10)) return "Ontem";
  return new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" });
};

/** Recados chegam na hora no aparelho do outro (RLS vale no realtime). */
function useLiveMessages(spaceId: string) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => router.refresh(), 200);
    };
    const { data: auth } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s) void supabase.realtime.setAuth(s.access_token);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`recados:${spaceId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "couple_messages", filter: `workspace_id=eq.${spaceId}` }, refresh)
        .subscribe((status) => status === "SUBSCRIBED" && refresh());
    });
    return () => {
      cancelled = true;
      clearTimeout(t);
      auth.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [spaceId, router]);
}

export function MessagesView({ messages, me, partner, spaceId, today, shared }: {
  messages: Message[];
  me: Who;
  partner: Who | null;
  spaceId: string;
  today: string;
  shared: boolean;
}) {
  const [busy, start] = useTransition();
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  useLiveMessages(spaceId);

  /**
   * Marca como lidos os recados do outro assim que aparecem (inclusive os que chegam com a tela aberta).
   * Guarda o último marcado para não repetir o pedido a cada render — e marcar de novo quando chega um novo.
   */
  const lastMarked = useRef("");
  useEffect(() => {
    const naoLidos = messages.filter((m) => m.author_id !== me.id && !m.read_at);
    const ultimo = naoLidos.at(-1)?.id;
    if (!ultimo || ultimo === lastMarked.current) return;
    lastMarked.current = ultimo;
    void markRead();
  }, [messages, me.id]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (!shared) {
    return <EmptyState title="Recados são de dois">Convide a outra pessoa em Ajustes. Aí vocês podem deixar recado um para o outro aqui, com foto e tudo.</EmptyState>;
  }

  async function send() {
    const body = input.current?.value.trim() ?? "";
    if ((!body && !photo) || sending) return;
    setSending(true);
    try {
      const f = new FormData();
      f.set("body", body);
      if (photo) f.set("photo_path", await uploadPhoto(spaceId, photo));
      const r = await sendMessage(null, f);
      if (!r.ok) return toast(r.message);
      if (input.current) input.current.value = "";
      setPhoto(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não consegui enviar a foto.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pb-2">
      {messages.length === 0 && <EmptyState title="Nenhum recado ainda">Deixe o primeiro: “passa no mercado?”, “te amo”, a foto do jantar.</EmptyState>}
      <ol className="flex flex-col gap-2" aria-label="Recados">
        {messages.map((m, i) => {
          const mine = m.author_id === me.id;
          const who = mine ? me : (partner ?? { id: m.author_id, name: "Ela", url: null });
          const newDay = i === 0 || m.created_at.slice(0, 10) !== messages[i - 1]!.created_at.slice(0, 10);
          return (
            <li key={m.id} className="flex flex-col gap-2">
              {newDay && <span className="self-center rounded-full bg-surface-2 px-3 py-1 text-[11px] font-semibold text-ink-3">{dayLabel(m.created_at, today)}</span>}
              <div className={`flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                <Avatar name={who.name} url={who.url} size={28} />
                <div className={`flex max-w-[78%] flex-col gap-1 rounded-[20px] px-3.5 py-2.5 ${mine ? "rounded-br-[6px] bg-coral text-on-color" : "rounded-bl-[6px] bg-surface"}`}>
                  {m.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário
                    <img src={m.photo_url} alt="Foto do recado" loading="lazy" className="max-h-72 w-full rounded-[14px] object-cover" />
                  )}
                  {editingId === m.id ? (
                    <form
                      action={() => start(async () => {
                        const el = document.getElementById(`edit-${m.id}`) as HTMLTextAreaElement | null;
                        const r = await editMessage(m.id, el?.value ?? "");
                        toast(r.message);
                        if (r.ok) setEditingId(null);
                      })}
                      className="flex flex-col gap-2"
                    >
                      <label className="sr-only" htmlFor={`edit-${m.id}`}>Editar recado</label>
                      <textarea id={`edit-${m.id}`} defaultValue={m.body ?? ""} rows={3} maxLength={2000} className="w-full rounded-[12px] bg-surface p-2 text-[15px] text-ink" />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={busy} className="min-h-9 px-3 text-[13px]">Salvar</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingId(null)} className="min-h-9 px-3 text-[13px]">Cancelar</Button>
                      </div>
                    </form>
                  ) : (
                    m.body && <p className="whitespace-pre-line text-[15px] leading-snug [overflow-wrap:anywhere]">{m.body}</p>
                  )}
                  <span className={`flex items-center gap-1 self-end text-[10px] ${mine ? "text-on-color/75" : "text-ink-3"}`}>
                    {m.edited_at && "editado · "}
                    {hhmm(m.created_at)}
                    {mine && (m.read_at ? <CheckCheck className="size-3.5" aria-label="Lido" /> : <Check className="size-3.5" aria-label="Enviado" />)}
                  </span>
                </div>
                {mine && editingId !== m.id && (
                  <div className="flex flex-col">
                    {m.body && (
                      <button onClick={() => setEditingId(m.id)} aria-label="Editar recado" className="grid size-9 place-items-center text-ink-3">
                        <Pencil className="size-3.5" />
                      </button>
                    )}
                    <ConfirmButton compact idle="size-9 justify-center text-ink-3" label="Apagar recado" disabled={busy} onConfirm={() => start(async () => { await deleteMessage(m.id); toast("Recado apagado"); })} />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div ref={end} />

      {/* acima da barra flutuante do app, senão o campo some atrás dela */}
      <div className="sticky z-20 flex flex-col gap-2" style={{ bottom: "calc(max(12px, env(safe-area-inset-bottom, 0px)) + 74px)" }}>
        {photo && (
          <span className="flex items-center gap-2 self-start rounded-full bg-surface py-1 pl-3 pr-1 text-[13px] font-semibold shadow-sm">
            {photo.name.slice(0, 28)}
            <button onClick={() => setPhoto(null)} aria-label="Tirar foto" className="grid size-8 place-items-center rounded-full"><X className="size-3.5" /></button>
          </span>
        )}
        <form
          onSubmit={(e) => { e.preventDefault(); void send(); }}
          className="flex items-end gap-1 rounded-[24px] bg-surface p-2 pl-1 shadow-[var(--shadow-float)]"
        >
          <input ref={picker} type="file" accept="image/*" className="hidden" aria-label="Escolher foto" onChange={(e) => setPhoto(e.currentTarget.files?.[0] ?? null)} />
          <button type="button" onClick={() => picker.current?.click()} aria-label="Mandar foto" className="press grid size-11 shrink-0 place-items-center rounded-full text-ink-3">
            <ImagePlus className="size-5" />
          </button>
          <label className="sr-only" htmlFor="recado">Escreva um recado</label>
          <textarea
            id="recado"
            ref={input}
            rows={1}
            maxLength={2000}
            placeholder="Escreva um recado…"
            enterKeyHint="send"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            className="max-h-32 min-h-11 flex-1 resize-none bg-transparent py-2.5 text-[16px] field-inline"
          />
          <button type="submit" disabled={sending} aria-label="Enviar recado" className="press grid size-11 shrink-0 place-items-center rounded-full bg-coral text-on-color disabled:opacity-40">
            <SendHorizonal className="size-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
