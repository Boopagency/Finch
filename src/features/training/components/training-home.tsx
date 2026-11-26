"use client";

import { Dumbbell, Pencil, Play, Plus, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useOutboxOps } from "@/components/sync/use-outbox";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import type { Exercise, Workout } from "../server/queries";
import { startSession } from "../server/actions";
import { formatKg } from "../training";
import { WorkoutForm } from "./workout-form";

type Session = { id: string; name: string; logged_at: string; finished_at: string | null; sets: number; volume_g: number };
type PR = { exercise_id: string; name: string; weight_g: number; reps: number };

const when = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");

export function TrainingHome({ workouts, exercises, open: serverOpen, history, prs }: { workouts: Workout[]; exercises: Exercise[]; open: Session | null; history: Session[]; prs: PR[] }) {
  const router = useRouter();
  const ops = useOutboxOps();
  const open = serverOpen && !ops.some((o) => o.type === "workout.finish" && o.session_id === serverOpen.id) ? serverOpen : null;
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [pending, start] = useTransition();
  const names = new Map(exercises.map((e) => [e.id, e.name]));

  const begin = (workoutId: string | null) =>
    start(async () => {
      const r = await startSession(workoutId);
      if (!r.ok || !r.id) return void toast(r.message ?? "Sem conexão para começar.");
      router.push(`/vida/treino/${r.id}`);
    });

  return (
    <div className="flex flex-col gap-4">
      {open && (
        <Link prefetch href={`/vida/treino/${open.id}`} className="press flex items-center gap-3 rounded-[22px] bg-ink p-4 text-bg">
          <span className="grid size-11 place-items-center rounded-full bg-coral text-on-color"><Play className="size-5" /></span>
          <span className="flex-1">
            <b className="block text-[16px]">Continuar {open.name}</b>
            <span className="text-[13px] text-stage-muted">{open.sets} séries até agora</span>
          </span>
        </Link>
      )}

      <section aria-labelledby="fichas" className="flex flex-col gap-2">
        <h2 id="fichas" className="px-1 text-[13px] font-semibold text-ink-3">Fichas</h2>
        {workouts.length === 0 && editing !== "new" && (
          <EmptyState title="Nenhuma ficha ainda">Monte a primeira (ex.: Treino A) ou comece um treino livre e escolha os exercícios na hora.</EmptyState>
        )}
        <ul className="stagger flex flex-col gap-2">
          {workouts.map((w) =>
            editing === w.id ? (
              <li key={w.id} className="rounded-[22px] bg-surface p-4"><WorkoutForm workout={w} exercises={exercises} onDone={() => setEditing(null)} /></li>
            ) : (
              <li key={w.id} className="flex items-center gap-3 rounded-[20px] bg-surface p-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface-2"><Dumbbell className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[16px]">{w.name}</b>
                  <span className="block truncate text-[12px] text-ink-3">{w.items.map((i) => names.get(i.exercise_id)).join(" · ")}</span>
                </span>
                <button onClick={() => setEditing(w.id)} aria-label={`Editar ${w.name}`} className="grid size-11 place-items-center text-ink-3"><Pencil className="size-4" /></button>
                <button onClick={() => begin(w.id)} disabled={pending || !!open} aria-label={`Começar ${w.name}`} className="press grid size-11 place-items-center rounded-full bg-coral text-on-color disabled:opacity-40">
                  <Play className="size-5" />
                </button>
              </li>
            ),
          )}
        </ul>
        {editing === "new" ? (
          <section aria-label="Nova ficha" className="rounded-[22px] bg-surface p-4">
            <h3 className="mb-4 font-display text-[20px] font-bold">Nova ficha</h3>
            <WorkoutForm exercises={exercises} onDone={() => setEditing(null)} />
          </section>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setEditing("new")}><Plus className="size-4" /> Nova ficha</Button>
            {!open && <Button variant="secondary" disabled={pending} onClick={() => begin(null)}><Play className="size-4" /> Treino livre</Button>}
          </div>
        )}
      </section>

      {prs.length > 0 && (
        <section aria-labelledby="recordes" className="rounded-[22px] bg-surface p-4">
          <h2 id="recordes" className="mb-3 flex items-center gap-2 text-[15px] font-semibold"><Trophy className="size-4 text-tangerine" /> Recordes</h2>
          <ul className="flex flex-col gap-2">
            {prs.map((p) => (
              <li key={p.exercise_id} className="flex justify-between text-[15px]">
                <span>{p.name}</span>
                <span className="tabular font-semibold">{formatKg(p.weight_g)} × {p.reps}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.some((s) => s.finished_at) && (
        <section aria-labelledby="historico" className="flex flex-col gap-2">
          <h2 id="historico" className="px-1 text-[13px] font-semibold text-ink-3">Histórico</h2>
          <ul className="flex flex-col divide-y divide-line rounded-[20px] bg-surface">
            {history.filter((s) => s.finished_at).map((s) => (
              <li key={s.id}>
                <Link prefetch href={`/vida/treino/${s.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span>
                    <b className="block text-[15px]">{s.name}</b>
                    <span className="text-[12px] text-ink-3">{when(s.logged_at)} · {Math.round((+new Date(s.finished_at!) - +new Date(s.logged_at)) / 60000)} min</span>
                  </span>
                  <span className="tabular text-right text-[13px] text-ink-2">{s.sets} séries<br />{Math.round(s.volume_g / 1000).toLocaleString("pt-BR")} kg no total</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
