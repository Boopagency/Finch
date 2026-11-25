import "server-only";
import { cache } from "react";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { addDays, type Habit, type HabitLog } from "../habits";
import { localDate } from "../water";

export type WaterSettings = {
  water_goal_ml: number;
  water_presets: number[];
  water_reminders: boolean;
  water_from: string;
  water_to: string;
  water_every_min: number;
};

export function todayFor(viewer: Viewer): string {
  return localDate(new Date(), viewer.tz);
}

/** Água do dia + configurações. */
export const getWaterToday = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const today = todayFor(viewer);
  const [{ data: settings }, { data: logs }] = await Promise.all([
    supabase
      .from("user_settings")
      .select("water_goal_ml, water_presets, water_reminders, water_from, water_to, water_every_min")
      .eq("user_id", viewer.id)
      .single(),
    supabase.from("water_logs").select("id, amount_ml, logged_at").eq("local_date", today).order("logged_at", { ascending: false }),
  ]);
  const s: WaterSettings = settings ?? {
    water_goal_ml: 2000, water_presets: [200, 300, 500], water_reminders: true, water_from: "09:00", water_to: "21:00", water_every_min: 90,
  };
  return { today, settings: { ...s, water_from: s.water_from.slice(0, 5), water_to: s.water_to.slice(0, 5) }, logs: logs ?? [] };
});

/** Totais por dia dos últimos 7 dias (inclui hoje). */
export async function getWaterWeek(viewer: Viewer) {
  const supabase = await createClient();
  const today = todayFor(viewer);
  const from = addDays(today, -6);
  const { data } = await supabase.from("water_logs").select("amount_ml, local_date").gte("local_date", from).lte("local_date", today);
  const totals = new Map<string, number>();
  for (const l of data ?? []) totals.set(l.local_date, (totals.get(l.local_date) ?? 0) + l.amount_ml);
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(from, i);
    return { date: d, total: totals.get(d) ?? 0 };
  });
}

/** Hábitos ativos + registros recentes (35 dias cobre consistência e semana atual). */
export const getHabits = cache(async (viewer: Viewer, historyDays = 35) => {
  const supabase = await createClient();
  const today = todayFor(viewer);
  const [{ data: habits }, { data: logs }] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, kind, period, target, unit, days, reminder_time, tone, created_at")
      .is("archived_at", null)
      .order("position")
      .order("created_at"),
    supabase.from("habit_logs").select("id, habit_id, value, local_date").gte("local_date", addDays(today, -historyDays)),
  ]);
  return {
    today,
    habits: (habits ?? []).map(
      ({ created_at, ...h }) => ({ ...h, reminder_time: h.reminder_time?.slice(0, 5) ?? null, since: localDate(new Date(created_at), viewer.tz) }) as Habit,
    ),
    logs: (logs ?? []) as HabitLog[],
  };
});
