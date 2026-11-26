"use server";

import { z } from "zod";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { randomToken, sha256hex } from "../oauth";
import { anonClient } from "./session";

const schema = z.object({
  client_id: z.string().min(1).max(100),
  redirect_uri: z.string().min(1).max(500),
  code_challenge: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  state: z.string().max(500).optional().default(""),
  password: z.string().min(1).max(200),
});

function back(redirect: string, params: Record<string, string>) {
  const u = new URL(redirect);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  return u.toString();
}

/** Aprova o acesso: confirma a senha, cria uma sessão só para o Claude e devolve o código de uso único. */
export async function approveMcp(_prev: { ok: boolean; message?: string; url?: string } | null, form: FormData) {
  const viewer = await requireViewer();
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: "Pedido inválido." };
  const v = p.data;
  const { data: client } = await anonClient().rpc("mcp_client", { p_id: v.client_id });
  if (!client?.[0]?.redirect_uris.includes(v.redirect_uri)) return { ok: false, message: "Aplicativo desconhecido." };
  // sessão dedicada (não mexe no login deste aparelho); a senha confere que é você mesmo
  const { data: s, error } = await anonClient().auth.signInWithPassword({ email: viewer.email, password: v.password });
  if (error || !s.session || s.user?.id !== viewer.id) return { ok: false, message: "Senha não confere." };
  const code = randomToken();
  const { error: e2 } = await (await createClient()).rpc("mcp_create_code", {
    p_client: v.client_id, p_redirect: v.redirect_uri, p_challenge: v.code_challenge, p_code_hash: sha256hex(code),
    p_sb_access: s.session.access_token, p_sb_refresh: s.session.refresh_token, p_sb_expires: new Date((s.session.expires_at ?? 0) * 1000).toISOString(),
  });
  if (e2) return { ok: false, message: "Não consegui autorizar. Tente de novo." };
  return { ok: true, url: back(v.redirect_uri, { code, state: v.state }) };
}

export async function denyMcp(clientId: string, redirect: string, state: string) {
  await requireViewer();
  const { data: client } = await anonClient().rpc("mcp_client", { p_id: z.string().max(100).parse(clientId) });
  if (!client?.[0]?.redirect_uris.includes(redirect)) return null;
  return back(redirect, { error: "access_denied", state });
}

export async function revokeMcp(id: string) {
  await requireViewer();
  await (await createClient()).rpc("mcp_revoke", { p_id: z.uuid().parse(id) });
}
