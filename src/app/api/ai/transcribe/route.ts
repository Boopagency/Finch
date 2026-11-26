import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

/**
 * Áudio do microfone → texto (API compatível com a da OpenAI: /audio/transcriptions). A IA de conversa não recebe
 * áudio; quem transcreve é este serviço. Chave só no servidor.
 * ponytail: sem cota própria (cada áudio vira uma mensagem, que já passa pela cota do chat); limite de 4 MB ≈ 2 min.
 */
export async function POST(request: Request) {
  const { data: auth } = await (await createClient()).auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const key = process.env.TRANSCRIBE_API_KEY;
  if (!key) return NextResponse.json({ error: "not_configured", message: "Falta configurar a transcrição de voz (TRANSCRIBE_API_KEY)." }, { status: 503 });

  const audio = (await request.formData().catch(() => null))?.get("audio");
  if (!(audio instanceof Blob) || !audio.type.startsWith("audio/") || audio.size < 500 || audio.size > 4_000_000)
    return NextResponse.json({ error: "invalid", message: "Áudio inválido ou longo demais (máx. 2 min)." }, { status: 400 });

  const ext = /webm/.test(audio.type) ? "webm" : /ogg/.test(audio.type) ? "ogg" : /wav/.test(audio.type) ? "wav" : /mpeg/.test(audio.type) ? "mp3" : "mp4";
  const body = new FormData();
  body.append("file", audio, `voz.${ext}`);
  body.append("model", process.env.TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  body.append("language", "pt");
  try {
    const res = await fetch(`${process.env.TRANSCRIBE_BASE_URL || "https://api.openai.com/v1"}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(50_000),
    });
    if (!res.ok) {
      // motivo do serviço (sem segredos) no log e na mensagem, para dar para entender o que houve
      const why = ((await res.json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message?.slice(0, 160) ?? "";
      console.error("transcribe upstream", res.status, audio.type, audio.size, why);
      return NextResponse.json({ error: "upstream", message: `A transcrição recusou o áudio (${res.status}${why ? `: ${why}` : ""}).` }, { status: 502 });
    }
    const { text } = (await res.json()) as { text?: string };
    return NextResponse.json({ text: String(text ?? "").trim() });
  } catch {
    return NextResponse.json({ error: "upstream", message: "A transcrição demorou demais. Tenta de novo." }, { status: 502 });
  }
}
