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

// ---------- fotos de perfil e do casal ----------
const photoPath = z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/);

export async function setAvatar(path: string | null): Promise<{ ok: boolean; message: string }> {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const p = path === null ? null : photoPath.parse(path);
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", viewer.id).single();
  const { error } = await supabase.rpc("set_avatar", { p_path: p as string });
  if (error) return { ok: false, message: "Não consegui salvar a foto." };
  if (before?.avatar_path && before.avatar_path !== p) await supabase.storage.from("photos").remove([before.avatar_path]);
  revalidatePath("/", "layout");
  return { ok: true, message: p ? "Foto de perfil atualizada." : "Foto removida." };
}

export async function setCover(spaceId: string, path: string | null): Promise<{ ok: boolean; message: string }> {
  await requireViewer();
  const supabase = await createClient();
  const id = z.uuid().parse(spaceId);
  const p = path === null ? null : photoPath.parse(path);
  const { data: before } = await supabase.from("workspaces").select("cover_path").eq("id", id).single();
  const { error } = await supabase.rpc("set_space_cover", { p_space: id, p_path: p as string });
  if (error) return { ok: false, message: "Não consegui salvar a foto." };
  if (before?.cover_path && before.cover_path !== p) await supabase.storage.from("photos").remove([before.cover_path]);
  revalidatePath("/", "layout");
  return { ok: true, message: p ? "Foto do casal atualizada." : "Foto removida." };
}
