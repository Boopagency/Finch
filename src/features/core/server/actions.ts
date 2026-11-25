"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { hashInviteToken, newInviteToken } from "../invite-token";

type Result = { ok: boolean; message: string; link?: string };

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Diga seu nome.").max(60),
  tz: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz), "Fuso inválido."),
});

export async function updateProfile(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", viewer.id);
  revalidatePath("/", "layout");
  return error ? { ok: false, message: "Não consegui salvar." } : { ok: true, message: "Salvo." };
}

const quietSchema = z.object({
  quiet_start: z.string().regex(/^\d{2}:\d{2}$/),
  quiet_end: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function updateQuietHours(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const parsed = quietSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Horário inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").update(parsed.data).eq("user_id", viewer.id);
  revalidatePath("/ajustes");
  return error ? { ok: false, message: "Não consegui salvar." } : { ok: true, message: "Salvo." };
}

export async function createSharedSpace(): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_shared_workspace", { p_name: "Nós" });
  revalidatePath("/", "layout");
  return error ? { ok: false, message: "Não consegui criar o espaço." } : { ok: true, message: "Espaço Nós criado." };
}

const inviteSchema = z.object({
  workspace_id: z.uuid(),
  email: z.email("E-mail inválido.").transform((e) => e.trim().toLowerCase()),
});

export async function createInvite(_prev: Result | null, form: FormData): Promise<Result> {
  const viewer = await requireViewer();
  const parsed = inviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Confira os dados." };
  if (parsed.data.email === viewer.email.toLowerCase()) return { ok: false, message: "Esse é o seu próprio e-mail." };
  const token = newInviteToken();
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    workspace_id: parsed.data.workspace_id,
    invited_email: parsed.data.email,
    token_hash: hashInviteToken(token),
    created_by: viewer.id,
  });
  if (error) return { ok: false, message: "Não consegui criar o convite." };
  revalidatePath("/ajustes");
  return { ok: true, message: "Convite criado. Vale por 7 dias e só uma vez.", link: `${serverEnv.appUrl()}/convite/${token}` };
}

export async function revokeInvite(id: string) {
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", z.uuid().parse(id));
  revalidatePath("/ajustes");
}
