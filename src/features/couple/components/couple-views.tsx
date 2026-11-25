"use client";

import { Heart, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { uploadPhoto } from "@/lib/photos";
import { countdownLabel, PLACE_KINDS, sinceLabel } from "../couple";
import type { Memory, Place, SpecialDate } from "../server/queries";
import { deleteDate, deleteMemory, deletePlace, markVisited, saveDate, saveMemory, savePlace } from "../server/actions";

type R = { ok: boolean; message: string };
/** Formulário de server action que avisa e fecha ao dar certo. */
function useSave(fn: (prev: R | null, f: FormData) => Promise<R>, onOk: () => void) {
  return useActionState(async (prev: R | null, f: FormData) => {
    const r = await fn(prev, f);
    if (r.ok) {
      toast(r.message);
      onOk();
    }
    return r;
  }, null);
}
const Err = ({ s }: { s: R | null }) => (s && !s.ok ? <p role="alert" className="text-sm font-medium text-danger">{s.message}</p> : null);
const fmtDay = (iso: string, year = false) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });
const select = "min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]";

function AddToggle({ label, open, setOpen, children }: { label: string; open: boolean; setOpen: (v: boolean) => void; children: React.ReactNode }) {
  return open ? (
    <section aria-label={label} className="rounded-[22px] bg-surface p-4">{children}</section>
  ) : (
    <Button variant="secondary" onClick={() => setOpen(true)} className="self-start"><Plus className="size-4" /> {label}</Button>
  );
}

// ---------- datas ----------
export function DatesView({ dates, today }: { dates: SpecialDate[]; today: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useSave(saveDate, () => setOpen(false));
  const [busy, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {dates.length === 0 && !open && <EmptyState title="Nenhuma data ainda">Começo do namoro, casamento, aniversários. O app conta os dias e lembra no Hoje quando estiver chegando.</EmptyState>}
      <ul className="stagger flex flex-col gap-2">
        {dates.map((d, i) => (
          <li key={d.id} className={`flex items-center gap-3 rounded-[20px] p-4 ${i === 0 ? "bg-lavender text-on-color" : "bg-surface"}`}>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[16px]">{d.title}</b>
              <span className={`text-[13px] ${i === 0 ? "" : "text-ink-3"}`}>
                {fmtDay(d.next.date)} · {countdownLabel(d.next.days)}
                {d.yearly && d.next.years > 0 && ` · ${d.next.years} ${d.next.years === 1 ? "ano" : "anos"}`}
              </span>
              {d.yearly && d.on_date < today && <span className={`block text-[12px] ${i === 0 ? "" : "text-ink-3"}`}>há {sinceLabel(d.on_date, today)}</span>}
            </span>
            <b className="tabular font-display text-[28px] leading-none">{d.next.days}<span className="ml-0.5 text-[12px] font-semibold">d</span></b>
            <button disabled={busy} onClick={() => start(async () => { await deleteDate(d.id); toast("Data apagada"); })} aria-label={`Apagar ${d.title}`} className="grid size-10 place-items-center opacity-60"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      <AddToggle label="Nova data" open={open} setOpen={setOpen}>
        <form action={action} className="flex flex-col gap-3">
          <Field id="d-title" name="title" label="O quê" required maxLength={60} placeholder="Começo do namoro" />
          <Field id="d-date" name="on_date" type="date" label="Quando" required />
          <label className="flex min-h-11 items-center justify-between text-[15px] font-semibold">Repete todo ano<input type="checkbox" name="yearly" defaultChecked className="size-6 accent-[var(--lavender)]" /></label>
          <Err s={state} />
          <div className="flex gap-2"><Button type="submit" disabled={pending}>Guardar</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
        </form>
      </AddToggle>
    </div>
  );
}

// ---------- lugares ----------
function Stars({ place }: { place: Place }) {
  const [busy, start] = useTransition();
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={`Nota para ${place.name}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} disabled={busy} onClick={() => start(() => markVisited(place.id, n))} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} aria-pressed={(place.rating ?? 0) >= n} className="grid size-9 place-items-center">
          <Star className={`size-5 ${(place.rating ?? 0) >= n ? "fill-sunflower text-sunflower" : "text-ink-3"}`} />
        </button>
      ))}
    </div>
  );
}

export function PlacesView({ places }: { places: Place[] }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useSave(savePlace, () => setOpen(false));
  const [busy, start] = useTransition();
  const want = places.filter((p) => p.status === "quero");
  const been = places.filter((p) => p.status === "fomos");
  const row = (p: Place) => (
    <li key={p.id} className="flex flex-col gap-1 rounded-[20px] bg-surface p-4">
      <div className="flex items-center gap-3">
        <MapPin className="size-5 shrink-0 text-coral" />
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[16px]">{p.name}</b>
          <span className="text-[12px] text-ink-3">{PLACE_KINDS[p.kind]}{p.visited_on ? ` · fomos em ${fmtDay(p.visited_on, true)}` : ""}</span>
        </span>
        {p.status === "quero" ? (
          <Button variant="secondary" disabled={busy} onClick={() => start(async () => { await markVisited(p.id, 5); toast(`${p.name}: fomos!`); })} className="min-h-10 px-3 text-[13px]">Fomos</Button>
        ) : (
          <button disabled={busy} onClick={() => start(() => markVisited(p.id, null))} aria-label={`Voltar ${p.name} para queremos ir`} className="grid size-10 place-items-center text-ink-3"><X className="size-4" /></button>
        )}
        <button disabled={busy} onClick={() => start(async () => { await deletePlace(p.id); toast("Lugar apagado"); })} aria-label={`Apagar ${p.name}`} className="grid size-10 place-items-center text-ink-3"><Trash2 className="size-4" /></button>
      </div>
      {p.note && <p className="pl-8 text-[14px] text-ink-2">{p.note}</p>}
      {p.status === "fomos" && <div className="pl-6"><Stars place={p} /></div>}
    </li>
  );
  return (
    <div className="flex flex-col gap-3">
      {places.length === 0 && !open && <EmptyState title="Nenhum lugar ainda">O restaurante que vocês querem conhecer, a viagem dos sonhos, o passeio do fim de semana.</EmptyState>}
      {want.length > 0 && <section aria-label="Queremos ir" className="flex flex-col gap-2"><h2 className="px-1 text-[13px] font-semibold text-ink-3">Queremos ir</h2><ul className="stagger flex flex-col gap-2">{want.map(row)}</ul></section>}
      {been.length > 0 && <section aria-label="Já fomos" className="flex flex-col gap-2"><h2 className="px-1 text-[13px] font-semibold text-ink-3">Já fomos</h2><ul className="flex flex-col gap-2">{been.map(row)}</ul></section>}
      <AddToggle label="Novo lugar" open={open} setOpen={setOpen}>
        <form action={action} className="flex flex-col gap-3">
          <Field id="pl-name" name="name" label="Lugar" required maxLength={80} placeholder="Restaurante japonês da esquina" />
          <label className="flex flex-col gap-1.5" htmlFor="pl-kind"><span className="text-[13px] font-semibold text-ink-2">Tipo</span>
            <select id="pl-kind" name="kind" defaultValue="restaurante" className={select}>{Object.entries(PLACE_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          </label>
          <Field id="pl-note" name="note" label="Nota (opcional)" maxLength={500} />
          <Err s={state} />
          <div className="flex gap-2"><Button type="submit" disabled={pending}>Guardar</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
        </form>
      </AddToggle>
    </div>
  );
}

// ---------- memórias ----------
export function MemoriesView({ memories, today, spaceId }: { memories: Memory[]; today: string; spaceId: string }) {
  const [open, setOpen] = useState(false);
  // foto vai direto do aparelho para o bucket privado; a memória guarda só o caminho
  const [state, action, pending] = useSave(async (prev, f) => {
    const file = f.get("photo");
    f.delete("photo");
    if (file instanceof File && file.size > 0) {
      try {
        f.set("photo_path", await uploadPhoto(spaceId, file));
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Não consegui enviar a foto." };
      }
    }
    return saveMemory(prev, f);
  }, () => setOpen(false));
  const [busy, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <AddToggle label="Nova memória" open={open} setOpen={setOpen}>
        <form action={action} className="flex flex-col gap-3">
          <Field id="m-title" name="title" label="Título" required maxLength={80} placeholder="Piquenique no parque" />
          <Field id="m-date" name="happened_on" type="date" label="Quando" defaultValue={today} max={today} required />
          <label className="flex flex-col gap-1.5" htmlFor="m-body"><span className="text-[13px] font-semibold text-ink-2">Como foi</span>
            <textarea id="m-body" name="body" rows={4} maxLength={4000} className="rounded-[14px] border border-line bg-surface px-4 py-3 text-[16px]" />
          </label>
          <label className="flex flex-col gap-1.5" htmlFor="m-photo"><span className="text-[13px] font-semibold text-ink-2">Foto (opcional)</span>
            <input id="m-photo" name="photo" type="file" accept="image/*" className="text-[15px] file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:font-semibold" />
          </label>
          <Err s={state} />
          <div className="flex gap-2"><Button type="submit" disabled={pending}>Guardar</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
        </form>
      </AddToggle>
      {memories.length === 0 && !open && <EmptyState title="Nenhuma memória ainda">Guardem os momentos de vocês: o dia, um título e como foi.</EmptyState>}
      <ol className="stagger relative flex flex-col gap-3 border-l-2 border-lavender/50 pl-4">
        {memories.map((m) => (
          <li key={m.id} className="relative rounded-[20px] bg-surface p-4">
            <Heart className="absolute -left-[27px] top-5 size-4 fill-lavender text-lavender" aria-hidden="true" />
            <div className="flex items-start gap-2">
              <span className="flex-1">
                <span className="block text-[12px] font-semibold text-ink-3">{fmtDay(m.happened_on, true)}</span>
                <b className="block text-[16px]">{m.title}</b>
              </span>
              <button disabled={busy} onClick={() => start(async () => { await deleteMemory(m.id); toast("Memória apagada"); })} aria-label={`Apagar ${m.title}`} className="grid size-10 place-items-center text-ink-3"><Trash2 className="size-4" /></button>
            </div>
            {m.photo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário, sem otimização de imagem
              <img src={m.photo_url} alt={m.title} loading="lazy" className="mt-2 max-h-80 w-full rounded-[14px] object-cover" />
            )}
            {m.body && <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{m.body}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
