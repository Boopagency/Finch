"use client";

import { Gift, Lock, Package, Repeat2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { Album } from "../server/queries";
import { answerTrade, giftItem, openPack, pasteItems, proposeTrade } from "../server/actions";
import { Sticker } from "./sticker";

const HINT: Record<string, string> = {
  "primeiro-passo": "Conclua sua primeira tarefa",
  "dez-tarefas": "Conclua 10 tarefas",
  "casa-em-dia": "5 rotinas da casa",
  "casa-brilhando": "20 rotinas da casa",
  "agua-7": "Bata a meta de água em 7 dias",
  "habito-30": "Cumpra hábitos 30 vezes",
  "primeira-compra": "Registre uma compra",
  "cinco-compras": "Registre 5 compras",
  "lista-cheia": "Compra com 10 itens ou mais",
  "mercado-a-dois": "Compra na lista do casal",
  "casal-conectado": "Conecte o espaço Nós",
  presente: "Dê uma figurinha de presente",
};

export function AlbumView({ album }: { album: Album }) {
  const [pending, start] = useTransition();
  const [reveal, setReveal] = useState<{ codes: string[]; ids: string[] } | null>(null);
  const byCode = new Map(album.stickers.map((s) => [s.code, s]));
  const toneOf = new Map(album.pages.map((p) => [p.code, p.tone]));
  const pasted = new Set(album.mine.filter((i) => i.pasted_at).map((i) => i.sticker_code));
  const partnerPasted = new Set(album.partnerItems.filter((i) => i.pasted_at).map((i) => i.sticker_code));
  const loose = album.mine.filter((i) => !i.pasted_at);
  const toPaste = [...new Map(loose.filter((i) => !pasted.has(i.sticker_code)).map((i) => [i.sticker_code, i])).values()];
  const dupes = loose.filter((i) => !toPaste.includes(i));
  const partnerSpare = album.partnerItems.filter((i) => !i.pasted_at && !pasted.has(i.sticker_code));
  const together = new Set([...pasted, ...partnerPasted]).size;
  const sticker = (code: string, size?: "sm" | "md" | "lg", dim?: boolean) => {
    const s = byCode.get(code)!;
    return <Sticker code={s.code} name={s.name} icon={s.icon} tone={toneOf.get(s.page_code) ?? "sunflower"} rarity={s.rarity} size={size} dim={dim} />;
  };

  const doOpen = () =>
    start(async () => {
      try {
        setReveal(await openPack(album.packs[0]!));
      } catch (e) {
        toast(e instanceof Error ? e.message : "Erro");
      }
    });
  const doPaste = (ids: string[]) =>
    start(async () => {
      const r = await pasteItems(ids);
      toast(r.message);
      setReveal(null);
    });

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Pontos" className="flex flex-col gap-2 rounded-[22px] bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-bold">Próximo pacotinho</span>
          <span className="tabular text-[13px] text-ink-3">{album.points % 100} de 100 pontos</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={album.points % 100} aria-valuemin={0} aria-valuemax={100} aria-label="Pontos para o próximo pacotinho">
          <div className="h-full rounded-full bg-coral" style={{ width: `${album.points % 100}%` }} />
        </div>
        <details className="text-[13px] text-ink-2">
          <summary className="cursor-pointer font-semibold text-ink-3">Como ganhar pontos</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {album.rules.map((r) => <li key={r.key}>{r.label}: <b>{r.points}</b> (até {r.daily_cap}× por dia)</li>)}
          </ul>
          <p className="mt-2 text-ink-3">Sem punição: nada se perde por ficar uns dias sem usar.</p>
        </details>
      </section>

      {album.packs.length > 0 && (
        <button onClick={doOpen} disabled={pending} className="flex items-center gap-4 rounded-[22px] bg-ink p-4 text-left text-bg transition active:scale-[.98]">
          <span className="grid size-14 -rotate-6 place-items-center rounded-[14px] border-4 border-white bg-coral text-on-color"><Package className="size-7" /></span>
          <span className="flex flex-1 flex-col">
            <span className="font-display text-[20px] font-extrabold">Abrir pacotinho</span>
            <span className="text-[13px] opacity-70">{album.packs.length} {album.packs.length === 1 ? "esperando" : "esperando você"} · 3 figurinhas cada</span>
          </span>
        </button>
      )}

      {toPaste.length > 0 && (
        <Button variant="coral" disabled={pending} onClick={() => doPaste(toPaste.map((i) => i.id))}>
          Colar {toPaste.length} {toPaste.length === 1 ? "figurinha nova" : "figurinhas novas"}
        </Button>
      )}

      {album.partner && (
        <p className="rounded-[18px] bg-lavender/40 px-4 py-3 text-[14px]">
          Juntos, você e {album.partner.name} já colaram <b>{together} de {album.stickers.length}</b>.
        </p>
      )}

      {album.trades.filter((t) => t.to_user !== album.partner?.id).length > 0 && (
        <section aria-label="Propostas de troca" className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold text-ink-2">Propostas de troca</h2>
          {album.trades.map((t) => {
            const incoming = t.from_user === album.partner?.id;
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-[18px] bg-surface p-3">
                <div className="w-12">{sticker(t.give_code, "sm")}</div>
                <Repeat2 className="size-5 text-ink-3" />
                <div className="w-12">{t.want_code && sticker(t.want_code, "sm")}</div>
                <span className="flex-1 text-[13px]">{incoming ? `${album.partner?.name} quer trocar` : "Aguardando resposta"}</span>
                {incoming ? (
                  <span className="flex gap-1">
                    <Button variant="secondary" className="px-3" disabled={pending} onClick={() => start(async () => toast((await answerTrade(t.id, false)).message))}>Não</Button>
                    <Button className="px-3" disabled={pending} onClick={() => start(async () => toast((await answerTrade(t.id, true)).message))}>Trocar</Button>
                  </span>
                ) : (
                  <Button variant="ghost" className="px-3" disabled={pending} onClick={() => start(async () => toast((await answerTrade(t.id, false)).message))}>Cancelar</Button>
                )}
              </div>
            );
          })}
        </section>
      )}

      {album.pages.map((p) => {
        const list = album.stickers.filter((s) => s.page_code === p.code);
        const have = list.filter((s) => pasted.has(s.code)).length;
        return (
          <section key={p.code} aria-label={`Página ${p.name}`} className="flex flex-col gap-2 rounded-[22px] bg-surface p-3">
            <h2 className="flex items-baseline justify-between px-1">
              <span className="font-display text-[18px] font-bold">{p.name}</span>
              <span className="tabular text-[13px] text-ink-3">{have}/{list.length}{have === list.length ? " · completa!" : ""}</span>
            </h2>
            <ul className="grid grid-cols-5 gap-2.5">
              {list.map((s) =>
                pasted.has(s.code) ? (
                  <li key={s.code} aria-label={`${s.name}: colada`}>{sticker(s.code, "sm")}</li>
                ) : (
                  <li key={s.code} aria-label={`${s.name}: falta`} className="flex aspect-[3/4] flex-col items-center justify-center gap-0.5 rounded-[12px] border-2 border-dashed border-line p-1 text-center text-ink-3">
                    {s.rarity === "especial" ? <Lock className="size-4" /> : <span className="tabular text-[11px] font-bold">{s.code.slice(-2)}</span>}
                    <span className="text-[8px] leading-tight">{s.rarity === "especial" ? HINT[s.achievement ?? ""] : s.name}</span>
                  </li>
                ),
              )}
            </ul>
          </section>
        );
      })}

      {dupes.length > 0 && (
        <section aria-label="Repetidas" className="flex flex-col gap-2">
          <h2 className="px-1 text-[13px] font-semibold text-ink-2">Repetidas ({dupes.length})</h2>
          <ul className="flex flex-col gap-2">
            {dupes.map((d) => (
              <Dupe key={d.id} item={d} partner={album.partner} partnerSpare={partnerSpare} sticker={sticker} byCode={byCode} pending={pending} start={start} />
            ))}
          </ul>
        </section>
      )}

      {reveal && <Reveal reveal={reveal} sticker={sticker} isNew={(code) => !pasted.has(code)} onPaste={() => doPaste(reveal.ids)} onClose={() => setReveal(null)} pending={pending} />}
    </div>
  );
}

function Dupe({ item, partner, partnerSpare, sticker, byCode, pending, start }: {
  item: { id: string; sticker_code: string };
  partner: { id: string; name: string } | null;
  partnerSpare: { id: string; sticker_code: string }[];
  sticker: (code: string, size?: "sm" | "md" | "lg") => React.ReactNode;
  byCode: Map<string, { name: string }>;
  pending: boolean;
  start: (fn: () => Promise<void>) => void;
}) {
  const [want, setWant] = useState("");
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-[18px] bg-surface p-3">
      <div className="w-12">{sticker(item.sticker_code, "sm")}</div>
      <span className="flex-1 text-[14px] font-semibold">{byCode.get(item.sticker_code)?.name}</span>
      {partner && (
        <>
          <Button variant="secondary" className="px-3" disabled={pending} onClick={() => start(async () => toast((await giftItem(item.id, partner.id)).message))}>
            <Gift className="size-4" /> Dar
          </Button>
          {partnerSpare.length > 0 && (
            <span className="flex w-full gap-2">
              <select aria-label="Trocar por" value={want} onChange={(e) => setWant(e.target.value)} className="min-h-11 flex-1 rounded-full bg-surface-2 px-3 text-[14px]">
                <option value="">Trocar por uma de {partner.name}…</option>
                {partnerSpare.map((p) => <option key={p.id} value={p.id}>{byCode.get(p.sticker_code)?.name}</option>)}
              </select>
              <Button className="px-3" disabled={pending || !want} onClick={() => start(async () => toast((await proposeTrade(item.id, want)).message))}>Propor</Button>
            </span>
          )}
        </>
      )}
    </li>
  );
}

function Reveal({ reveal, sticker, isNew, onPaste, onClose, pending }: {
  reveal: { codes: string[]; ids: string[] };
  sticker: (code: string, size?: "sm" | "md" | "lg") => React.ReactNode;
  isNew: (code: string) => boolean;
  onPaste: () => void;
  onClose: () => void;
  pending: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const seen = new Set<string>();
  return (
    <dialog ref={ref} onClose={() => setTimeout(onClose, 260)} aria-label="Pacotinho aberto" className="pop m-auto w-[min(92vw,420px)] rounded-[28px] bg-stage p-6 text-stage-ink">
      <h2 className="mb-5 text-center font-display text-[26px] font-extrabold">Pacotinho aberto!</h2>
      <ul className="flex justify-center gap-3">
        {reveal.codes.map((c, i) => {
          const fresh = isNew(c) && !seen.has(c);
          seen.add(c);
          return (
            <li key={reveal.ids[i]} className="flex w-24 flex-col items-center gap-2 motion-safe:animate-[pop_420ms_var(--ease-spring)_both]" style={{ animationDelay: `${i * 220}ms` }}>
              {sticker(c, "md")}
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${fresh ? "bg-coral text-on-color" : "bg-white/15"}`}>{fresh ? "nova!" : "repetida"}</span>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 flex flex-col gap-2">
        <Button variant="coral" disabled={pending} onClick={onPaste}>Colar no álbum</Button>
        <Button variant="ghost" className="text-stage-ink" onClick={() => ref.current?.close()}>Depois</Button>
      </div>
      <style>{`@keyframes pop{from{transform:scale(.4) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}`}</style>
    </dialog>
  );
}
