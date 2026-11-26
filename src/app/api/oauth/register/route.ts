import { NextResponse } from "next/server";
import { z } from "zod";
import { anonClient } from "@/features/mcp/server/session";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
const schema = z.object({ redirect_uris: z.array(z.string().max(500)).min(1).max(10), client_name: z.string().max(100).optional() });

/** RFC 7591: registro dinâmico de cliente (o Claude se registra sozinho). Cliente público (PKCE, sem segredo). */
export async function POST(req: Request) {
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400, headers: CORS });
  const { data, error } = await anonClient().rpc("mcp_register_client", { p_name: p.data.client_name ?? "Cliente MCP", p_redirect_uris: p.data.redirect_uris });
  if (error || !data) return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400, headers: CORS });
  return NextResponse.json(
    {
      client_id: data,
      client_name: p.data.client_name ?? "Cliente MCP",
      redirect_uris: p.data.redirect_uris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201, headers: CORS },
  );
}
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
