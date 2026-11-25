import "server-only";
import { addDays, isScheduled, type Habit } from "@/features/health/habits";
import { expandEvents, type EventRow } from "@/features/agenda/expand";
import { ensureOccurrences } from "@/features/tasks/server/queries";
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
  // ocorrências das rotinas para todos (as telas só preenchem o que faltar), a cada 15 min
  if (now.getUTCMinutes() % 15 === 0) {
    const { data: recurring } = await db.from("tasks").select("id, repeat, repeat_start, rotation, assignee_id").not("repeat", "is", null).is("archived_at", null);
    const today = localDate(now, "America/Sao_Paulo");
    if (recurring?.length) await ensureOccurrences(db, recurring, addDays(today, -1), addDays(today, 30));
  }
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

  rows.push(...(await planTasks(db, users, profiles ?? [], now)));
  rows.push(...(await planEvents(db, users, profiles ?? [], now)));
  if (rows.length === 0) return 0;
  const { error } = await db.from("notification_jobs").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (error) throw new Error(`planner: ${error.message}`);
  return rows.length;
}

type Db = ReturnType<typeof createServiceClient>;

/**
 * Tarefas com horário hoje: avisa o responsável; sem responsável, o dono (pessoal) ou os dois (Nós).
 * Também estende as ocorrências recorrentes (14 dias) para quem não abriu o app.
 */
async function planTasks(db: Db, users: string[], profiles: { id: string; tz: string }[], now: Date): Promise<JobInsert[]> {
  const { data: members } = await db.from("workspace_members").select("workspace_id, user_id").in("user_id", users);
  const spaces = [...new Set((members ?? []).map((m) => m.workspace_id))];
  if (!spaces.length) return [];
  const { data: allMembers } = await db.from("workspace_members").select("workspace_id, user_id").in("workspace_id", spaces);
  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, workspace_id, created_by, assignee_id, due_date, due_time, status, remind, repeat, repeat_start, rotation")
    .in("workspace_id", spaces)
    .is("archived_at", null);
  if (!tasks?.length) return [];

  // fuso de referência do espaço: o do primeiro membro com aparelho (casal no mesmo fuso, na prática)
  const tzOf = (ws: string) => {
    const u = allMembers?.find((m) => m.workspace_id === ws && users.includes(m.user_id))?.user_id;
    return profiles.find((p) => p.id === u)?.tz ?? "America/Sao_Paulo";
  };
  const recurring = tasks.filter((t) => t.repeat);

  const recipients = (t: { workspace_id: string; created_by: string }, assignee: string | null) =>
    (assignee ? [assignee] : (allMembers ?? []).filter((m) => m.workspace_id === t.workspace_id).map((m) => m.user_id)).filter((u) =>
      users.includes(u),
    );

  const rows: JobInsert[] = [];
  const push = (t: (typeof tasks)[number], date: string, sourceType: string, sourceId: string, assignee: string | null) => {
    const at = localToInstant(date, t.due_time!.slice(0, 5), tzOf(t.workspace_id));
    if (at <= now) return;
    for (const u of recipients(t, assignee)) {
      rows.push({
        user_id: u,
        category: "task",
        source_type: sourceType,
        source_id: sourceId,
        scheduled_for: at.toISOString(),
        dedupe_key: `${sourceType}:${sourceId}:${u}:${date}:${t.due_time!.slice(0, 5)}`,
        title: t.title,
        body: "Está na hora. Toque para ver.",
        url: "/tarefas",
      });
    }
  };

  for (const t of tasks.filter((x) => !x.repeat && x.remind && x.due_time && x.due_date && x.status !== "done")) {
    if (t.due_date === localDate(now, tzOf(t.workspace_id))) push(t, t.due_date, "task", t.id, t.assignee_id);
  }
  const timed = recurring.filter((t) => t.remind && t.due_time);
  if (timed.length) {
    const today = localDate(now, "America/Sao_Paulo");
    const { data: occs } = await db
      .from("task_occurrences")
      .select("id, task_id, occurs_on, snoozed_to, assignee_id")
      .in("task_id", timed.map((t) => t.id))
      .eq("status", "open")
      .or(`occurs_on.eq.${today},snoozed_to.eq.${today}`);
    for (const o of occs ?? []) {
      const t = timed.find((x) => x.id === o.task_id)!;
      const date = o.snoozed_to ?? o.occurs_on;
      if (date === localDate(now, tzOf(t.workspace_id))) push(t, date, "task_occ", o.id, o.assignee_id);
    }
  }
  return rows;
}

/** Eventos com lembrete: dispara `remind_min` antes do início, para os membros do espaço. */
async function planEvents(db: Db, users: string[], profiles: { id: string; tz: string }[], now: Date): Promise<JobInsert[]> {
  const { data: members } = await db.from("workspace_members").select("workspace_id, user_id").in("user_id", users);
  const spaces = [...new Set((members ?? []).map((m) => m.workspace_id))];
  if (!spaces.length) return [];
  const { data: events } = await db
    .from("events")
    .select("id, title, workspace_id, start_date, end_date, start_time, end_time, repeat, repeat_until, location, notes, category, remind_min")
    .in("workspace_id", spaces)
    .not("remind_min", "is", null)
    .not("start_time", "is", null);
  const rows: JobInsert[] = [];
  for (const u of users) {
    const tz = profiles.find((p) => p.id === u)?.tz ?? "America/Sao_Paulo";
    const today = localDate(now, tz);
    const mine = (events ?? []).filter((e) => (members ?? []).some((m) => m.user_id === u && m.workspace_id === e.workspace_id));
    // janela de amanhã cobre lembretes de "1 dia antes"
    for (const i of expandEvents(mine as EventRow[], today, addDays(today, 1))) {
      if (i.day !== 1 || !i.start) continue;
      const at = new Date(localToInstant(i.date, i.start, tz).getTime() - (i.event.remind_min ?? 0) * 60_000);
      if (at <= now || at.getTime() - now.getTime() > 26 * 3600_000) continue;
      rows.push({
        user_id: u,
        category: "event",
        source_type: "event",
        source_id: i.event.id,
        scheduled_for: at.toISOString(),
        dedupe_key: `event:${i.event.id}:${u}:${i.date}:${i.start}:${i.event.remind_min}`,
        title: i.event.title,
        body: i.event.remind_min ? `Começa às ${i.start}${i.event.location ? ` · ${i.event.location}` : ""}` : "Começando agora.",
        url: `/agenda?d=${i.date}`,
      });
    }
  }
  return rows;
}
