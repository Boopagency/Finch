import "server-only";
import { isScheduled, type Habit } from "@/features/health/habits";
import { localDate, localToInstant, waterSlots } from "@/features/health/water";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type JobInsert = Database["public"]["Tables"]["notification_jobs"]["Insert"];

/**
 * Materializa os lembretes de hoje (só horários futuros) para quem tem aparelho ativo.
 * Idempotente: dedupe_key único por horário; rodar a cada minuto não duplica.
 */
export async function planReminders(now = new Date()): Promise<number> {
  const db = createServiceClient();
  const { data: subs } = await db.from("push_subscriptions").select("user_id").is("revoked_at", null);
  const users = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (users.length === 0) return 0;

  const [{ data: profiles }, { data: settings }, { data: habits }] = await Promise.all([
    db.from("profiles").select("id, tz").in("id", users),
    db.from("user_settings").select("user_id, water_reminders, water_from, water_to, water_every_min").in("user_id", users),
    db
      .from("habits")
      .select("id, user_id, name, kind, period, target, unit, days, reminder_time, tone")
      .in("user_id", users)
      .is("archived_at", null)
      .not("reminder_time", "is", null),
  ]);

  const rows: JobInsert[] = [];
  for (const userId of users) {
    const tz = profiles?.find((p) => p.id === userId)?.tz ?? "America/Sao_Paulo";
    const today = localDate(now, tz);

    const s = settings?.find((x) => x.user_id === userId);
    if (s?.water_reminders) {
      for (const slot of waterSlots(s.water_from.slice(0, 5), s.water_to.slice(0, 5), s.water_every_min)) {
        const at = localToInstant(today, slot, tz);
        if (at <= now) continue;
        rows.push({
          user_id: userId,
          category: "water",
          source_type: "water",
          scheduled_for: at.toISOString(),
          dedupe_key: `water:${userId}:${today}:${slot}`,
          title: "Hora de um copo de água",
          body: "Toque para registrar em um segundo.",
          url: "/vida/agua",
        });
      }
    }

    for (const h of (habits ?? []).filter((x) => x.user_id === userId)) {
      const time = h.reminder_time!.slice(0, 5);
      if (!isScheduled(h as Habit, today)) continue;
      const at = localToInstant(today, time, tz);
      if (at <= now) continue;
      rows.push({
        user_id: userId,
        category: "habit",
        source_type: "habit",
        source_id: h.id,
        scheduled_for: at.toISOString(),
        dedupe_key: `habit:${h.id}:${today}:${time}`,
        title: h.name,
        body: "Toque para marcar como feito.",
        url: "/vida/habitos",
      });
    }
  }

  if (rows.length === 0) return 0;
  const { error } = await db.from("notification_jobs").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new Error(`planner: ${error.message}`);
  return rows.length;
}
