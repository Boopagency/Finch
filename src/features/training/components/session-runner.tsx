"use client";

import { Check, Timer, Trophy, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { useOutboxOps } from "@/components/sync/use-outbox";
import { toast } from "@/components/ui/toast";
import { mergeSets, type WorkoutSet } from "@/features/sync/ops";
import { cancelPending, enqueue, forgetAcked } from "@/lib/outbox";
import type { Exercise, PlanItem } from "../server/queries";
import { deleteSession } from "../server/actions";
import { bestByExercise, formatClock, formatKg, isPR, MUSCLES, parseKg, secondsLeft, type Best } from "../training";

type Session = { id: string; name: string; logged_at: string; finished_at: string | null };
type Rest = { until: number; total: number };

const restKey = (id: string) => `finch.rest.${id}`;
function readRest(id: string): Rest | null {
  try {
    return JSON.parse(localStorage.getItem(restKey(id)) ?? "null");
  } catch {
    return null;
  }
}

function writeRest(id: string, r: Rest | null): Rest | null {
  try {
    if (r) localStorage.setItem(restKey(id), JSON.stringify(r));
    else localStorage.removeItem(restKey(id));
  } catch {}
  return r;
}
function restFor(id: string, seconds: number): Rest | null {
  return seconds > 0 ? writeRest(id, { until: Date.now() + seconds * 1000, total: seconds }) : null;
}

export function SessionRunner({
  session, plan, serverSets, previousBest, exercises,
}: { session: Session; plan: PlanItem[]; serverSets: WorkoutSet[]; previousBest: Record<string, Best>; exercises: Exercise[] }) {
  const router = useRouter();
  const ops = useOutboxOps();
  useEffect(() => {
    void forgetAcked(new Set(serverSets.map((s) => s.id)));
  }, [serverSets]);
  const finishing = ops.some((o) => o.type === "workout.finish" && o.session_id === session.id);
  const done = !!session.finished_at || finishing;
  const sets = mergeSets(serverSets, ops, session.id);

  const [extra, setExtra] = useState<string[]>([]);
  const [rest, setRest] = useState<Rest | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => {
    // o relógio manda: tela bloqueada ou app em segundo plano não atrasam o descanso
    const tick = () => {
      const t = Date.now();
      const r = readRest(session.id);
      if (r && t >= r.until) {
        navigator.vibrate?.([200, 100, 200]);
        writeRest(session.id, null);
        setRest(null);
      } else setRest(r);
      setNow(t);
    };
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 500);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [session.id]);
  const left = rest ? secondsLeft(rest.until, now) : 0;

  const byId = new Map(exercises.map((e) => [e.id, e]));
  const planBy = new Map(plan.map((p) => [p.exercise_id, p]));
  const order = [...new Set([...plan.map((p) => p.exercise_id), ...sets.map((s) => s.exercise_id), ...extra])];
  const elapsed = now ? Math.floor(((session.finished_at ? +new Date(session.finished_at) : now) - +new Date(session.logged_at)) / 1000) : 0;

  const startRest = (seconds: number) => setRest(restFor(session.id, seconds));

  function log(exerciseId: string, form: FormData) {
    const ex = byId.get(exerciseId);
    const timed = ex?.kind === "time";
    const weightRaw = String(form.get("w") ?? "").trim();
    const weight_g = !timed && ex?.kind === "weight" && weightRaw ? parseKg(weightRaw) : null;
    if (weightRaw && ex?.kind === "weight" && weight_g === null) return void toast("Carga inválida (ex.: 62,5)");
    const reps = timed ? null : Number(form.get("r"));
    const duration_s = timed ? Math.round(Number(String(form.get("t") ?? "").replace(",", ".")) * 60) : null;
    if (!timed && !(Number.isInteger(reps) && reps! >= 1 && reps! <= 500)) return void toast("Informe as repetições");
    if (timed && !(duration_s! >= 1 && duration_s! <= 86400)) return void toast("Informe os minutos");
    const id = crypto.randomUUID();
    const set = { exercise_id: exerciseId, weight_g, reps, duration_s };
    const best = [previousBest[exerciseId], bestByExercise(sets.filter((s) => s.exercise_id === exerciseId)).get(exerciseId)]
      .filter(Boolean)
      .sort((a, b) => b!.e1rm - a!.e1rm)[0];
    const pr = isPR(set, best) && !!best; // primeira vez não é recorde, é marca inicial
    void enqueue({ id, type: "set.add", session_id: session.id, ...set, done_at: new Date().toISOString() });
    toast(pr ? `Recorde! ${ex?.name} ${formatKg(weight_g!)} × ${reps}` : `Série registrada`, {
      label: "Desfazer",
      run: async () => {
        if (!(await cancelPending(id))) void enqueue({ id: crypto.randomUUID(), type: "set.remove", target_id: id });
      },
    });
    startRest(planBy.get(exerciseId)?.rest_s ?? 90);
  }

  function finish() {
    if (sets.length === 0) return void toast("Registre ao menos uma série");
    void enqueue({ id: crypto.randomUUID(), type: "workout.finish", session_id: session.id, finished_at: new Date().toISOString() });
    writeRest(session.id, null);
    toast(`Treino concluído: ${sets.length} séries`);
    router.push("/vida/treino");
  }

  const available = exercises.filter((e) => !order.includes(e.id));
  return (
    <div className="flex flex-col gap-3 pb-6">
      <div className="flex items-center justify-between rounded-[20px] bg-surface px-4 py-3">
        <span className="text-[13px] font-semibold text-ink-3">{done ? "Duração" : "Em andamento"}</span>
        <span className="tabular font-display text-[22px] font-bold" aria-label="Tempo de treino">{formatClock(elapsed)}</span>
      </div>

      {rest && left > 0 && (
        <div role="timer" aria-live="polite" className="sticky top-2 z-20 flex items-center gap-3 rounded-[20px] bg-ink p-3 text-bg shadow-[var(--shadow-float)]">
          <Timer className="size-5 text-coral" />
          <span className="flex-1">
            <b className="tabular block font-display text-[26px] leading-none">{formatClock(left)}</b>
            <span className="text-[12px] text-stage-muted">descanso</span>
          </span>
          <button onClick={() => setRest(writeRest(session.id, { ...rest, until: rest.until + 30000 }))} className="min-h-10 rounded-full bg-stage-ink/10 px-3 text-[13px] font-semibold">+30s</button>
          <button
            onClick={() => setRest(writeRest(session.id, null))}
            className="min-h-10 rounded-full bg-coral px-3 text-[13px] font-semibold text-on-color"
          >
            Pular
          </button>
        </div>
      )}

      {order.length === 0 && <p className="rounded-[20px] bg-surface p-4 text-[15px] text-ink-2">Treino livre: escolha o primeiro exercício abaixo.</p>}

      <ul className="stagger flex flex-col gap-3">
        {order.map((exId) => {
          const ex = byId.get(exId);
          const p = planBy.get(exId);
          const mine = sets.filter((s) => s.exercise_id === exId);
          const last = mine.at(-1);
          const timed = ex?.kind === "time";
          const complete = p ? mine.length >= p.sets : false;
          return (
            <li key={exId} className="rounded-[22px] bg-surface p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-[17px] font-semibold">{ex?.name ?? "Exercício"}</h2>
                <span className={`tabular text-[13px] ${complete ? "font-semibold text-ink" : "text-ink-3"}`}>
                  {p ? `${mine.length}/${p.sets} × ${p.reps}` : `${mine.length} séries`}
                </span>
              </div>
              {previousBest[exId] && <p className="text-[12px] text-ink-3">Melhor: {formatKg(previousBest[exId].weight_g)} × {previousBest[exId].reps}</p>}

              {mine.length > 0 && (
                <ol className="mt-3 flex flex-col gap-1">
                  {mine.map((s, i) => {
                    const prior = [previousBest[exId], bestByExercise(mine.slice(0, i)).get(exId)].filter(Boolean).sort((a, b) => b!.e1rm - a!.e1rm)[0];
                    const pr = !!prior && isPR(s, prior);
                    return (
                      <li key={s.id} className="check-on flex min-h-10 items-center gap-3 rounded-[12px] bg-bg px-3 text-[15px]">
                        <span className="w-5 text-[12px] font-bold text-ink-3">{i + 1}</span>
                        <span className="tabular flex-1 font-semibold">
                          {s.duration_s != null ? formatClock(s.duration_s) : `${s.weight_g ? formatKg(s.weight_g) + " × " : ""}${s.reps} reps`}
                        </span>
                        {pr && <Trophy className="size-4 text-tangerine" aria-label="Recorde" />}
                        {!done && (
                          <button
                            onClick={async () => { if (!(await cancelPending(s.id))) void enqueue({ id: crypto.randomUUID(), type: "set.remove", target_id: s.id }); }}
                            aria-label={`Apagar série ${i + 1}`}
                            className="grid size-9 place-items-center text-ink-3"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {!done && (
                <form
                  key={mine.length}
                  className="mt-3 flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    log(exId, new FormData(e.currentTarget));
                  }}
                >
                  {timed ? (
                    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-semibold text-ink-2">
                      Minutos
                      <input name="t" inputMode="decimal" defaultValue={last?.duration_s ? String(last.duration_s / 60).replace(".", ",") : ""} className="min-h-12 w-full min-w-0 rounded-[14px] border border-line bg-bg px-3 text-[18px]" />
                    </label>
                  ) : (
                    <>
                      {ex?.kind === "weight" && (
                        <label className="flex min-w-0 flex-1 flex-col gap-1 text-[12px] font-semibold text-ink-2">
                          Carga (kg)
                          <input name="w" inputMode="decimal" defaultValue={last?.weight_g ? String(last.weight_g / 1000).replace(".", ",") : ""} aria-label={`Carga em kg para ${ex?.name}`} className="min-h-12 w-full min-w-0 rounded-[14px] border border-line bg-bg px-3 text-[18px]" />
                        </label>
                      )}
                      <label className="flex w-20 shrink-0 flex-col gap-1 text-[12px] font-semibold text-ink-2">
                        Reps
                        <input name="r" type="number" inputMode="numeric" min={1} max={500} defaultValue={last?.reps ?? p?.reps ?? 10} aria-label={`Repetições para ${ex?.name}`} className="min-h-12 w-full min-w-0 rounded-[14px] border border-line bg-bg px-3 text-[18px]" />
                      </label>
                    </>
                  )}
                  <button aria-label={`Registrar série de ${ex?.name}`} className="press grid size-12 shrink-0 place-items-center rounded-full bg-ink text-bg">
                    <Check className="size-5" strokeWidth={3} />
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {!done && (
        <>
          <label className="flex flex-col gap-1.5" htmlFor="s-add">
            <span className="text-[13px] font-semibold text-ink-2">Outro exercício</span>
            <select id="s-add" value="" onChange={(e) => e.target.value && setExtra([...extra, e.target.value])} className="min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]">
              <option value="">Adicionar…</option>
              {Object.entries(MUSCLES).map(([k, label]) => {
                const list = available.filter((e) => e.muscle === k);
                return list.length ? <optgroup key={k} label={label}>{list.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</optgroup> : null;
              })}
            </select>
          </label>
          <Button variant="coral" onClick={finish} className="min-h-14 text-[16px]">
            Concluir treino
          </Button>
        </>
      )}
      <ConfirmButton
        label={done ? "Excluir este treino" : "Descartar treino"}
        className="self-center"
        onConfirm={async () => {
          writeRest(session.id, null);
          await deleteSession(session.id);
          toast(done ? "Treino excluído" : "Treino descartado");
          router.push("/vida/treino");
        }}
      >
        {done ? "Excluir este treino" : "Descartar treino"}
      </ConfirmButton>
    </div>
  );
}
