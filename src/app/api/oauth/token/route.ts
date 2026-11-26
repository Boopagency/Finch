import { NextResponse } from "next/server";
import { randomToken, s256, sha256hex, validVerifier } from "@/features/mcp/oauth";
import { anonClient } from "@/features/mcp/server/session";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Cache-Control": "no-store" };
const err = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: CORS });

async function params(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return ((await req.json().catch(() => ({}))) ?? {}) as Record<string, string>;
  return Object.fromEntries(new URLSearchParams(await req.text()));
}

/** Troca código (com PKCE) ou refresh por tokens do Finch. Tokens só existem aqui; o banco guarda o hash. */
export async function POST(req: Request) {
  const p = await params(req);
  const db = anonClient();
  const access = randomToken();
  const refresh = randomToken();
  const tokens = () => NextResponse.json({ access_token: access, token_type: "Bearer", expires_in: 3600, refresh_token: refresh, scope: "finch" }, { headers: CORS });

  if (p.grant_type === "authorization_code") {
    if (!p.code || !p.client_id || !p.redirect_uri || !p.code_verifier || !validVerifier(p.code_verifier)) return err("invalid_request");
    const { data } = await db.rpc("mcp_exchange_code", {
      p_code_hash: sha256hex(p.code), p_client: p.client_id, p_redirect: p.redirect_uri, p_verifier_challenge: s256(p.code_verifier),
      p_access_hash: sha256hex(access), p_refresh_hash: sha256hex(refresh),
    });
    return data ? tokens() : err("invalid_grant");
  }
  if (p.grant_type === "refresh_token") {
    if (!p.refresh_token || !p.client_id) return err("invalid_request");
    const { data } = await db.rpc("mcp_refresh_grant", {
      p_refresh_hash: sha256hex(p.refresh_token), p_client: p.client_id, p_access_hash: sha256hex(access), p_new_refresh_hash: sha256hex(refresh),
    });
    return data ? tokens() : err("invalid_grant");
  }
  return err("unsupported_grant_type");
}
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
