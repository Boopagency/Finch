import { NextResponse } from "next/server";
import { z } from "zod";
import { getAgenda } from "@/features/agenda/server/queries";
import { requireViewer } from "@/lib/supabase/server";

const query = z.object({ from: z.iso.date(), to: z.iso.date() }).refine((q) => q.from <= q.to && Date.parse(q.to) - Date.parse(q.from) <= 400 * 86_400_000);

/** Eventos e tarefas de um intervalo, para a Agenda carregar os meses vizinhos antes do toque (RLS da pessoa). */
export async function GET(request: Request) {
  const u = new URL(request.url);
  const q = query.safeParse({ from: u.searchParams.get("from"), to: u.searchParams.get("to") });
  if (!q.success) return NextResponse.json({ error: "invalid range" }, { status: 400 });
  const a = await getAgenda(await requireViewer(), q.data.from, q.data.to);
  return NextResponse.json({ events: a.events, tasks: a.tasks }, { headers: { "Cache-Control": "private, no-store" } });
}
