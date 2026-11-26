import "server-only";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Viewer } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { sha256hex } from "../oauth";

/** Cliente sem sessão (papel anon): só chega às funções do MCP, que conferem o token. */
export function anonClient(jwt?: string) {
  return createSupabase<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    ...(jwt ? { global: { headers: { Authorization: `Bearer ${jwt}` } } } : {}),
  });
}

/**
 * Token do Claude → JWT da pessoa (renova a sessão dedicada quando está para vencer) + quem é.
 * Devolve null para token inválido, vencido ou revogado.
 */
export async function resolveBearer(token: string): Promise<{ jwt: string; viewer: Viewer } | null> {
  const db = anonClient();
  const hash = sha256hex(token);
  const { data } = await db.rpc("mcp_session", { p_access_hash: hash });
  const row = data?.[0];
  if (!row) return null;
  let jwt = row.sb_access;
  if (Date.parse(row.sb_expires) - Date.now() < 60_000) {
    const { data: r, error } = await db.auth.refreshSession({ refresh_token: row.sb_refresh });
    if (error || !r.session) return null;
    jwt = r.session.access_token;
    await db.rpc("mcp_save_session", {
      p_grant: row.grant_id,
      p_access_hash: hash,
      p_sb_access: r.session.access_token,
      p_sb_refresh: r.session.refresh_token,
      p_sb_expires: new Date((r.session.expires_at ?? 0) * 1000).toISOString(),
    });
  }
  const { data: c } = await db.auth.getClaims(jwt);
  if (!c?.claims?.sub || c.claims.sub !== row.user_id) return null;
  const { data: profile } = await anonClient(jwt).from("profiles").select("display_name, tz").eq("id", row.user_id).single();
  return {
    jwt,
    viewer: { id: row.user_id, email: String(c.claims.email ?? ""), name: profile?.display_name || "você", tz: profile?.tz || "America/Sao_Paulo" },
  };
}
