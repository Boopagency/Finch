import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env";
import { runDispatcher } from "@/features/notifications/server/dispatch";
import { planReminders } from "@/features/notifications/server/planner";

export const maxDuration = 60;

function authorized(header: string | null): boolean {
  const expected = Buffer.from(`Bearer ${serverEnv.cronSecret()}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

// Chamado a cada minuto pelo Supabase Cron (pg_net). Ver supabase/setup/cron.sql.
export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const planned = await planReminders();
    return NextResponse.json({ planned, ...(await runDispatcher()) });
  } catch (e) {
    console.error("[cron/notifications]", e);
    return NextResponse.json({ error: "dispatch failed" }, { status: 500 });
  }
}
