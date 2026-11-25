import "server-only";
import { WebPushError, sendNotification, setVapidDetails } from "web-push";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";
import { isQuiet, quietEndsAt } from "../quiet-hours";
import { skipWhenQuiet, stillRelevant } from "./relevance";

type Job = Tables<"notification_jobs">;
const MAX_ATTEMPTS = 3;


let configured = false;
function configure() {
  if (configured) return;
  setVapidDetails(serverEnv.vapidSubject(), process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, serverEnv.vapidPrivateKey());
  configured = true;
}

export type DispatchResult = { claimed: number; sent: number; deferred: number; skipped: number; failed: number };

/** Processa jobs vencidos. Seguro para rodar em paralelo (claim com SKIP LOCKED). */
export async function runDispatcher(limit = 50): Promise<DispatchResult> {
  configure();
  const db = createServiceClient();
  const result: DispatchResult = { claimed: 0, sent: 0, deferred: 0, skipped: 0, failed: 0 };
  const { data: jobs, error } = await db.rpc("claim_notification_jobs", { p_limit: limit });
  if (error) throw new Error(`claim falhou: ${error.message}`);
  result.claimed = jobs.length;

  for (const job of jobs) {
    const now = new Date();
    const update = (patch: Partial<Job>) => db.from("notification_jobs").update({ ...patch, locked_at: null }).eq("id", job.id);

    // 1. origem ainda relevante?
    const check = job.source_type ? stillRelevant[job.source_type] : undefined;
    if (check && !(await check(job))) {
      await update({ status: "skipped" });
      result.skipped++;
      continue;
    }

    // 2. horário silencioso (não essenciais esperam)
    if (!job.essential) {
      const [{ data: settings }, { data: profile }] = await Promise.all([
        db.from("user_settings").select("quiet_start, quiet_end").eq("user_id", job.user_id).single(),
        db.from("profiles").select("tz").eq("id", job.user_id).single(),
      ]);
      const tz = profile?.tz ?? "America/Sao_Paulo";
      if (settings && isQuiet(now, tz, settings.quiet_start, settings.quiet_end)) {
        if (skipWhenQuiet.has(job.category)) {
          await update({ status: "skipped", last_error: "horário silencioso" });
          result.skipped++;
          continue;
        }
        await update({ status: "pending", attempts: job.attempts - 1, scheduled_for: quietEndsAt(now, tz, settings.quiet_end).toISOString() });
        result.deferred++;
        continue;
      }
    }

    // 3. envia para cada aparelho ativo
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", job.user_id)
      .is("revoked_at", null);
    if (!subs?.length) {
      await update({ status: "failed", last_error: "nenhum aparelho com lembretes ativos" });
      result.failed++;
      continue;
    }

    const payload = JSON.stringify({ title: job.title, body: job.body, url: job.url, tag: job.dedupe_key ?? job.id });
    let delivered = 0;
    let lastError = "";
    for (const sub of subs) {
      try {
        const res = await sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
          { TTL: 60 * 60 * 6, urgency: job.essential ? "high" : "normal" },
        );
        delivered++;
        await Promise.all([
          db.from("notification_logs").insert({ job_id: job.id, subscription_id: sub.id, status_code: res.statusCode }),
          db.from("push_subscriptions").update({ last_success_at: now.toISOString() }).eq("id", sub.id),
        ]);
      } catch (e) {
        const code = e instanceof WebPushError ? e.statusCode : null;
        lastError = e instanceof Error ? e.message.slice(0, 300) : "erro desconhecido";
        await db.from("notification_logs").insert({ job_id: job.id, subscription_id: sub.id, status_code: code, error: lastError });
        // aparelho desinstalou ou revogou: remove
        if (code === 404 || code === 410) {
          await db.from("push_subscriptions").update({ revoked_at: now.toISOString() }).eq("id", sub.id);
        }
      }
    }

    if (delivered > 0) {
      await update({ status: "sent", sent_at: now.toISOString(), last_error: null });
      result.sent++;
    } else if (job.attempts < MAX_ATTEMPTS) {
      const backoffMin = 2 ** job.attempts; // 2, 4 min
      await update({ status: "pending", last_error: lastError, scheduled_for: new Date(now.getTime() + backoffMin * 60_000).toISOString() });
      result.deferred++;
    } else {
      await update({ status: "failed", last_error: lastError });
      result.failed++;
    }
  }
  return result;
}
