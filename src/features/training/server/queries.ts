import "server-only";
import { cache } from "react";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { todayFor } from "@/features/health/server/queries";
import { bestByExercise, volume } from "../training";

export type Exercise = { id: string; name: string; muscle: string; kind: string; user_id: string | null };
export type PlanItem = { id: string; exercise_id: string; position: number; sets: number; reps: number; rest_s: number };
export type Workout = { id: string; name: string; items: PlanItem[] };

export const getExercises = cache(async () => {
  const { data } = await (await createClient()).from("exercises").select("id, name, muscle, kind, user_id").order("name");
  return (data ?? []) as Exercise[];
});

/** Tela de treino: fichas, sessão aberta, histórico recente e recordes. */
export const getTraining = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const [{ data: workouts }, { data: sessions }, { data: sets }, exercises] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, name, workout_exercises(id, exercise_id, position, sets, reps, rest_s)")
      .is("archived_at", null)
      .order("position")
      .order("created_at"),
    supabase.from("workout_sessions").select("id, name, logged_at, finished_at, local_date").order("logged_at", { ascending: false }).limit(12),
    // ponytail: recordes calculados de todas as séries com carga; vira view agregada se passar de alguns milhares
    supabase.from("workout_sets").select("session_id, exercise_id, weight_g, reps, duration_s").limit(5000),
    getExercises(),
  ]);
  const bySession = new Map<string, NonNullable<typeof sets>>();
  for (const s of sets ?? []) bySession.set(s.session_id, [...(bySession.get(s.session_id) ?? []), s]);
  const history = (sessions ?? []).map((s) => {
    const ss = bySession.get(s.id) ?? [];
    return { ...s, sets: ss.length, volume_g: volume(ss) };
  });
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  const prs = [...bestByExercise(sets ?? []).entries()]
    .map(([id, b]) => ({ exercise_id: id, name: names.get(id) ?? "Exercício", ...b }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  return {
    today: todayFor(viewer),
    workouts: (workouts ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      items: [...w.workout_exercises].sort((a, b) => a.position - b.position),
    })) as Workout[],
    open: history.find((s) => !s.finished_at) ?? null,
    history,
    prs,
    exercises,
  };
});

/** Execução: sessão, plano da ficha, séries feitas e o melhor anterior de cada exercício. */
export async function getSession(id: string) {
  const supabase = await createClient();
  const { data: session } = await supabase.from("workout_sessions").select("id, name, workout_id, logged_at, finished_at").eq("id", id).maybeSingle();
  if (!session) return null;
  const [{ data: plan }, { data: sets }, { data: before }, exercises] = await Promise.all([
    session.workout_id
      ? supabase.from("workout_exercises").select("id, exercise_id, position, sets, reps, rest_s").eq("workout_id", session.workout_id).order("position")
      : Promise.resolve({ data: [] as PlanItem[] }),
    supabase.from("workout_sets").select("id, exercise_id, weight_g, reps, duration_s, done_at").eq("session_id", id).order("done_at"),
    supabase.from("workout_sets").select("exercise_id, weight_g, reps, duration_s").neq("session_id", id).limit(5000),
    getExercises(),
  ]);
  return {
    session,
    plan: (plan ?? []) as PlanItem[],
    sets: sets ?? [],
    previousBest: Object.fromEntries(bestByExercise(before ?? [])),
    exercises,
  };
}

/** Registros corporais recentes (mais novo primeiro). */
export async function getBodyLogs() {
  const { data } = await (await createClient())
    .from("body_logs")
    .select("id, logged_at, local_date, weight_g, waist_mm, sleep_min, mood, note")
    .order("logged_at", { ascending: false })
    .limit(60);
  return data ?? [];
}
