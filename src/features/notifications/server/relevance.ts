import "server-only";
import { habitStatus, type Habit } from "@/features/health/habits";
import { addDays } from "@/features/health/habits";
import { localDate } from "@/features/health/water";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type Job = Tables<"notification_jobs">;

async function tzOf(userId: string) {
  const { data } = await createServiceClient().from("profiles").select("tz").eq("id", userId).single();
  return data?.tz ?? "America/Sao_Paulo";
}

/** "Ainda faz sentido enviar?" por tipo de origem. Sem entrada = sempre envia. */
export const stillRelevant: Record<string, (job: Job) => Promise<boolean>> = {
  // água: para quando a meta do dia foi atingida ou os lembretes foram desligados
  async water(job) {
    const db = createServiceClient();
    const today = localDate(new Date(), await tzOf(job.user_id));
    const [{ data: s }, { data: logs }] = await Promise.all([
      db.from("user_settings").select("water_goal_ml, water_reminders").eq("user_id", job.user_id).single(),
      db.from("water_logs").select("amount_ml").eq("user_id", job.user_id).eq("local_date", today),
    ]);
    if (!s?.water_reminders) return false;
    const total = (logs ?? []).reduce((n, l) => n + l.amount_ml, 0);
    return total < s.water_goal_ml;
  },

  // hábito: só se ainda existe, ativo, e não foi cumprido no período
  async habit(job) {
    if (!job.source_id) return false;
    const db = createServiceClient();
    const { data: h } = await db
      .from("habits")
      .select("id, name, kind, period, target, unit, days, reminder_time, tone, archived_at")
      .eq("id", job.source_id)
      .maybeSingle();
    if (!h || h.archived_at || !h.reminder_time) return false;
    const today = localDate(new Date(), await tzOf(job.user_id));
    const { data: logs } = await db
      .from("habit_logs")
      .select("id, habit_id, value, local_date")
      .eq("habit_id", h.id)
      .gte("local_date", addDays(today, -7));
    const status = habitStatus(h as Habit, logs ?? [], today);
    return status.scheduled && !status.done;
  },

  // tarefa única: ainda aberta e com o mesmo horário
  async task(job) {
    if (!job.source_id) return false;
    const { data: t } = await createServiceClient().from("tasks").select("status, archived_at, remind").eq("id", job.source_id).maybeSingle();
    return !!t && t.status !== "done" && !t.archived_at && t.remind;
  },

  // ocorrência de rotina: ainda aberta (não concluída, pulada ou adiada para outro dia)
  async task_occ(job) {
    if (!job.source_id) return false;
    const db = createServiceClient();
    const { data: o } = await db.from("task_occurrences").select("status, snoozed_to, occurs_on, task_id").eq("id", job.source_id).maybeSingle();
    if (!o || o.status !== "open") return false;
    const today = localDate(new Date(), await tzOf(job.user_id));
    return (o.snoozed_to ?? o.occurs_on) === today;
  },

  // evento: ainda existe com o mesmo horário (a chave de dedupe guarda data/hora/antecedência)
  async event(job) {
    if (!job.source_id || !job.dedupe_key) return false;
    const { data: e } = await createServiceClient().from("events").select("start_time, remind_min").eq("id", job.source_id).maybeSingle();
    if (!e?.start_time || e.remind_min == null) return false;
    const [, , , , hh, mm, remind] = job.dedupe_key.split(":"); // event:id:user:data:HH:MM:antecedência
    return `${hh}:${mm}` === e.start_time.slice(0, 5) && Number(remind) === e.remind_min;
  },
};

/** Categorias que perdem o sentido se adiadas (melhor pular do que acumular após o silêncio). */
export const skipWhenQuiet = new Set(["water"]);
