"use client";

import { Pencil } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { CARES, SPECIES, level, levelProgress, moodLine, type Care, type Mood, type Species } from "../pet";
import type { Pet } from "../server/queries";
import { carePet, savePet } from "../server/actions";
import { PetArt } from "./pet-art";

type R = { ok: boolean; message: string };
const fmtWhen = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(".", "");

/** Adoção e troca de nome/espécie. */
function PetForm({ pet, onDone }: { pet: Pet | null; onDone: () => void }) {
  const [species, setSpecies] = useState<Species>(pet?.species ?? "gato");
  const [state, action, pending] = useActionState(async (_p: R | null, f: FormData) => {
    const r = await savePet(null, f);
    if (r.ok) {
      toast(r.message);
      onDone();
    }
    return r;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-[22px] bg-surface p-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-[13px] font-semibold text-ink-2">Quem vai morar com vocês</legend>
        <input type="hidden" name="species" value={species} />
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(SPECIES) as Species[]).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSpecies(s)}
              aria-pressed={species === s}
              className={`press flex flex-col items-center gap-1 rounded-[18px] border-2 p-2 ${species === s ? "border-coral bg-coral/10" : "border-transparent bg-bg"}`}
            >
              <PetArt species={s} mood="feliz" size={56} />
              <span className="text-[12px] font-semibold">{SPECIES[s].label}</span>
            </button>
          ))}
        </div>
        <p className="text-[12px] text-ink-3">{SPECIES[species].hint}</p>
      </fieldset>
      <Field id="pet-name" name="name" label="Nome" required maxLength={30} defaultValue={pet?.name ?? ""} placeholder="Gruso" />
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pet ? "Salvar" : "Adotar"}</Button>
        {pet && <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>}
      </div>
    </form>
  );
}

/** `mood` vem calculado do servidor: o humor é o mesmo nos dois aparelhos e não muda na hidratação. */
export function PetView({ pet, petMood, canShare }: { pet: Pet | null; petMood: Mood; canShare: boolean }) {
  const [editing, setEditing] = useState(false);
  const [busy, start] = useTransition();

  if (!pet || editing) {
    return (
      <div className="flex flex-col gap-3">
        {!pet && !editing && (
          <div className="flex flex-col items-center gap-2 rounded-[22px] bg-lavender/20 p-5 text-center">
            <PetArt species="monstrinho" mood="feliz" size={96} />
            <b className="font-display text-[20px]">Adotem um bichinho</b>
            <p className="max-w-sm text-[14px] text-ink-2">
              Ele mora aqui no Nós e vive do carinho de vocês dois. Nunca passa mal, nunca cobra nada: só fica com saudade quando some todo mundo.
            </p>
          </div>
        )}
        <PetForm pet={pet} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const m = petMood;
  const lv = level(pet.love);
  const progress = levelProgress(pet.love);
  const care = (kind: Care) =>
    start(async () => {
      const r = await carePet(pet.id, kind);
      toast(r.message);
    });

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={`${pet.name}, nível ${lv}`} className="flex flex-col items-center gap-2 rounded-[22px] bg-surface p-5 text-center">
        <PetArt species={pet.species} mood={m} size={148} className={busy ? "animate-pulse" : "pet-idle"} />
        <div className="flex items-center gap-2">
          <b className="font-display text-[24px] leading-none">{pet.name}</b>
          <button onClick={() => setEditing(true)} aria-label={`Editar ${pet.name}`} className="grid size-9 place-items-center rounded-full text-ink-3">
            <Pencil className="size-4" />
          </button>
        </div>
        <p className="text-[15px] text-ink-2">{moodLine(pet.name, m)}</p>
        <div className="mt-1 w-full max-w-xs">
          <div className="flex items-baseline justify-between text-[12px] text-ink-3">
            <span>Nível {lv}</span>
            <span className="tabular">{pet.love} de amor</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Amor até o próximo nível">
            <div className="h-full rounded-full bg-coral transition-[width] duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(CARES) as Care[]).map((k) => (
          <button
            key={k}
            onClick={() => care(k)}
            disabled={busy}
            className="press flex min-h-14 items-center justify-center gap-2 rounded-[18px] bg-surface text-[15px] font-semibold disabled:opacity-50"
          >
            <span aria-hidden className="text-[20px]">{CARES[k].emoji}</span> {CARES[k].label}
          </button>
        ))}
      </div>
      <p className="px-1 text-[12px] text-ink-3">Cada mimo conta uma vez por dia para cada um de vocês. Dar de novo não some do amor: ele só agradece.</p>

      {pet.feeds.length > 0 && (
        <section aria-label="Cuidados recentes" className="flex flex-col gap-2 rounded-[22px] bg-surface p-4">
          <h2 className="text-[13px] font-semibold text-ink-3">Últimos cuidados</h2>
          <ul className="flex flex-col gap-1.5">
            {pet.feeds.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-[14px]">
                <span aria-hidden>{CARES[f.kind].emoji}</span>
                <span className="min-w-0 flex-1 truncate">{CARES[f.kind].label}{f.note ? ` · ${f.note}` : ""}</span>
                <span className="shrink-0 text-[12px] text-ink-3">{fmtWhen(f.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {!canShare && <p className="px-1 text-[13px] text-ink-3">Por enquanto o bichinho é só seu. Convide a outra pessoa em Ajustes para cuidarem juntos.</p>}
    </div>
  );
}
