"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { Exercise, Workout } from "../server/queries";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { addExercise, archiveWorkout, deleteExercise, saveWorkout } from "../server/actions";
import { MUSCLES } from "../training";

type Item = { exercise_id: string; sets: number; reps: number; rest_s: number };
const num = "min-h-11 w-full rounded-[12px] border border-line bg-bg px-2 text-center text-[16px]";

export function WorkoutForm({ workout, exercises, onDone }: { workout?: Workout; exercises: Exercise[]; onDone: () => void }) {
  const [name, setName] = useState(workout?.name ?? "");
  const [items, setItems] = useState<Item[]>(workout?.items.map(({ exercise_id, sets, reps, rest_s }) => ({ exercise_id, sets, reps, rest_s })) ?? []);
  const [lib, setLib] = useState(exercises);
  const [custom, setCustom] = useState("");
  const [pending, start] = useTransition();
  const byId = new Map(lib.map((e) => [e.id, e]));
  const groups = Object.entries(MUSCLES).map(([k, label]) => ({ label, list: lib.filter((e) => e.muscle === k) })).filter((g) => g.list.length);

  const set = (i: number, patch: Partial<Item>) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: number) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setItems(next);
  };

  return (
    <div className="flex flex-col gap-4">
      <Field id="w-name" label="Nome da ficha" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Treino A · peito e tríceps" />

      {items.length > 0 && (
        <ol className="flex flex-col gap-2" aria-label="Exercícios da ficha">
          {items.map((it, i) => (
            <li key={`${it.exercise_id}-${i}`} className="rounded-[16px] bg-bg p-3">
              <div className="flex items-center gap-1">
                <span className="flex-1 text-[15px] font-semibold">{byId.get(it.exercise_id)?.name}</span>
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Subir" className="grid size-10 place-items-center text-ink-3 disabled:opacity-30"><ArrowUp className="size-4" /></button>
                <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Descer" className="grid size-10 place-items-center text-ink-3 disabled:opacity-30"><ArrowDown className="size-4" /></button>
                <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} aria-label={`Tirar ${byId.get(it.exercise_id)?.name}`} className="grid size-10 place-items-center text-ink-3"><X className="size-4" /></button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[12px] font-semibold text-ink-2">
                <label className="flex flex-col gap-1">Séries<input type="number" inputMode="numeric" min={1} max={20} value={it.sets} onChange={(e) => set(i, { sets: Number(e.target.value) })} className={num} /></label>
                <label className="flex flex-col gap-1">Reps<input type="number" inputMode="numeric" min={1} max={100} value={it.reps} onChange={(e) => set(i, { reps: Number(e.target.value) })} className={num} /></label>
                <label className="flex flex-col gap-1">Descanso (s)<input type="number" inputMode="numeric" min={0} max={600} step={15} value={it.rest_s} onChange={(e) => set(i, { rest_s: Number(e.target.value) })} className={num} /></label>
              </div>
            </li>
          ))}
        </ol>
      )}

      <label className="flex flex-col gap-1.5" htmlFor="w-add">
        <span className="text-[13px] font-semibold text-ink-2">Adicionar exercício</span>
        <select
          id="w-add"
          value=""
          onChange={(e) => e.target.value && setItems([...items, { exercise_id: e.target.value, sets: 3, reps: 10, rest_s: 90 }])}
          className="min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]"
        >
          <option value="">Escolher…</option>
          {groups.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.list.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Não achou? Crie um" aria-label="Novo exercício" maxLength={60} className="min-h-11 flex-1 rounded-[14px] border border-line bg-surface px-3 text-[16px]" />
        <Button
          type="button"
          variant="secondary"
          disabled={!custom.trim() || pending}
          onClick={() =>
            start(async () => {
              const r = await addExercise(custom, "outro");
              if (!r.ok || !r.id) return void toast(r.message);
              setLib([...lib, { id: r.id, name: custom.trim(), muscle: "outro", kind: "weight", user_id: "me" }]);
              setItems([...items, { exercise_id: r.id, sets: 3, reps: 10, rest_s: 90 }]);
              setCustom("");
            })
          }
        >
          Criar
        </Button>
      </div>

      {lib.some((e) => e.user_id) && (
        <details className="rounded-[16px] bg-bg p-3">
          <summary className="min-h-9 cursor-pointer text-[13px] font-semibold text-ink-2">Exercícios que você criou</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {lib.filter((e) => e.user_id).map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 text-[15px]">
                <span className="truncate">{e.name}</span>
                <ConfirmButton
                  label={`Excluir exercício ${e.name}`}
                  confirmText="Apaga também o histórico"
                  className="min-h-9 px-3 text-[13px]"
                  onConfirm={() =>
                    start(async () => {
                      const r = await deleteExercise(e.id);
                      toast(r.message);
                      if (r.ok) {
                        setLib(lib.filter((x) => x.id !== e.id));
                        setItems(items.filter((it) => it.exercise_id !== e.id));
                      }
                    })
                  }
                >
                  Excluir
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await saveWorkout({ id: workout?.id, name, items });
              toast(r.message);
              if (r.ok) onDone();
            })
          }
        >
          Salvar ficha
        </Button>
        <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        {workout && (
          <ConfirmButton
            disabled={pending}
            label={`Excluir ficha ${workout.name}`}
            onConfirm={() =>
              start(async () => {
                await archiveWorkout(workout.id);
                toast("Ficha excluída (o histórico dos treinos fica)");
                onDone();
              })
            }
          >
            Excluir ficha
          </ConfirmButton>
        )}
      </div>
    </div>
  );
}
