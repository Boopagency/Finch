"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { uploadPhoto } from "@/lib/photos";
import { addBodyPhoto, deleteBodyPhoto } from "../server/actions";

type Photo = { id: string; taken_on: string; url: string | null };
const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "2-digit", timeZone: "UTC" }).replace(".", "");

export function BodyPhotos({ photos, spaceId, today }: { photos: Photo[]; spaceId: string | null; today: string }) {
  const file = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [busy, start] = useTransition();
  const first = photos.at(-1);
  const last = photos[0];

  async function onPick(f: File | undefined) {
    if (!f || !spaceId) return;
    setSending(true);
    try {
      const path = await uploadPhoto(spaceId, f);
      toast((await addBodyPhoto(path, today)).message);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Não consegui enviar a foto.");
    } finally {
      setSending(false);
      if (file.current) file.current.value = "";
    }
  }

  return (
    <section aria-labelledby="fotos-evolucao" className="flex flex-col gap-3 rounded-[22px] bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 id="fotos-evolucao" className="text-[15px] font-semibold">Fotos de evolução</h2>
        <label className={`press flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 text-[14px] font-semibold text-bg ${sending ? "opacity-50" : ""}`}>
          <Camera className="size-4" /> {sending ? "Enviando…" : "Nova foto"}
          <input ref={file} type="file" accept="image/*" aria-label="Nova foto de evolução" disabled={sending || !spaceId} onChange={(e) => onPick(e.target.files?.[0])} className="sr-only" />
        </label>
      </div>
      {photos.length === 0 && <p className="text-[14px] text-ink-3">Uma foto por mês, sempre no mesmo lugar e luz, mostra mais que a balança. Ficam só no seu espaço pessoal.</p>}
      {first && last && first.id !== last.id && (
        <div className="grid grid-cols-2 gap-2" aria-label="Antes e agora">
          {[first, last].map((p, i) => (
            <figure key={p.id} className="flex flex-col gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário */}
              {p.url && <img src={p.url} alt={`${i ? "Agora" : "Antes"}, ${fmt(p.taken_on)}`} className="aspect-[3/4] w-full rounded-[14px] object-cover" />}
              <figcaption className="text-center text-[12px] font-semibold text-ink-3">{i ? "Agora" : "Antes"} · {fmt(p.taken_on)}</figcaption>
            </figure>
          ))}
        </div>
      )}
      {photos.length > 0 && (
        <ul className="grid grid-cols-4 gap-2" aria-label="Todas as fotos">
          {photos.map((p) => (
            <li key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário */}
              {p.url && <img src={p.url} alt={`Foto de ${fmt(p.taken_on)}`} loading="lazy" className="aspect-[3/4] w-full rounded-[10px] object-cover" />}
              <button disabled={busy} onClick={() => start(async () => { await deleteBodyPhoto(p.id); toast("Foto apagada"); })} aria-label={`Apagar foto de ${fmt(p.taken_on)}`} className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-ink/70 text-bg">
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
