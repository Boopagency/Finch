import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { NotConfigured, runAssistant } from "@/features/assistant/server/run";
import { historySchema } from "@/features/assistant/tools";
import { createClient, requireViewer } from "@/lib/supabase/server";

export const maxDuration = 60;
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 60);

/** Conversa com o assistente. Chave da IA só aqui no servidor; cota diária por pessoa no banco. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.AI_API_KEY) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const parsed = historySchema.safeParse((await request.json().catch(() => null))?.messages);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { data: allowed } = await supabase.rpc("ai_reserve", { p_daily_limit: DAILY_LIMIT });
  if (!allowed) return NextResponse.json({ error: "limit", message: "Chegamos ao limite de conversas de hoje. Amanhã tem mais." }, { status: 429 });

  const viewer = await requireViewer();
  try {
    const r = await runAssistant(viewer, parsed.data);
    await supabase.rpc("ai_track", { p_input: r.usage.input, p_output: r.usage.output });
    return NextResponse.json({ text: r.text, proposals: r.proposals, changed: r.changed });
  } catch (e) {
    if (e instanceof NotConfigured) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "busy", message: "Estou com muita gente agora. Tenta de novo em um minuto." }, { status: 503 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "not_configured" }, { status: 503 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: "upstream", message: "A IA não respondeu agora. Tenta de novo." }, { status: 502 });
    throw e;
  }
}
