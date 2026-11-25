"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { runDispatcher } from "./dispatch";

const subSchema = z.object({
  endpoint: z.url().startsWith("https://"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function saveSubscription(raw: unknown, label: string) {
  await requireViewer();
  const sub = subSchema.parse(raw);
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.keys.p256dh,
    p_auth: sub.keys.auth,
    p_label: label.slice(0, 40),
    p_user_agent: "",
  });
  if (error) throw new Error("Não consegui salvar este aparelho.");
  revalidatePath("/ajustes");
}

export async function revokeDevice(id: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("push_subscriptions").update({ revoked_at: new Date().toISOString() }).eq("id", z.uuid().parse(id));
  revalidatePath("/ajustes");
}

/** Cria um lembrete de teste para o próprio usuário. minutes = 0 envia já. */
export async function sendTest(minutes: number): Promise<{ ok: boolean; message: string }> {
  const viewer = await requireViewer();
  const delay = z.number().int().min(0).max(60).parse(minutes);
  const supabase = await createClient();
  const { error } = await supabase.from("notification_jobs").insert({
    user_id: viewer.id,
    category: "test",
    essential: true,
    scheduled_for: new Date(Date.now() + delay * 60_000).toISOString(),
    title: delay ? "Lembrete agendado chegou" : "Oi, aqui é o Finch",
    body: delay ? `Agendado há ${delay} min. O Cron está funcionando.` : "Se você está lendo isto, os lembretes funcionam.",
    url: "/ajustes",
  });
  if (error) return { ok: false, message: "Não consegui criar o teste." };
  if (delay === 0) {
    const r = await runDispatcher(10);
    return r.sent > 0
      ? { ok: true, message: "Enviado. Deve chegar em alguns segundos." }
      : { ok: false, message: "Nenhum aparelho recebeu. Ative os lembretes neste iPhone primeiro." };
  }
  return { ok: true, message: `Agendado para daqui a ${delay} min. Pode fechar o app.` };
}
