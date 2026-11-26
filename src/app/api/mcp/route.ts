import { NextResponse } from "next/server";
import { handleRpc } from "@/features/mcp/server/handler";
import { resolveBearer } from "@/features/mcp/server/session";
import { baseUrl } from "@/features/mcp/oauth";
import { runAsBearer } from "@/lib/supabase/server";

export const maxDuration = 60;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id", "Access-Control-Expose-Headers": "WWW-Authenticate" };

function unauthorized(req: Request) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Conecte o Finch no Claude (login necessário)." } },
    { status: 401, headers: { ...CORS, "WWW-Authenticate": `Bearer resource_metadata="${baseUrl(req)}/.well-known/oauth-protected-resource"` } },
  );
}

/** Servidor MCP do Finch (HTTP sem estado, respostas JSON). */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return unauthorized(req);
  const auth = await resolveBearer(token);
  if (!auth) return unauthorized(req);
  const body = await req.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
  const msgs = Array.isArray(body) ? body.slice(0, 20) : [body];
  const out = (await runAsBearer(auth.jwt, auth.viewer, () => Promise.all(msgs.map((m) => handleRpc(m, auth.viewer))))).filter((r) => r !== null);
  if (!out.length) return new NextResponse(null, { status: 202, headers: CORS });
  return NextResponse.json(Array.isArray(body) ? out : out[0], { headers: CORS });
}

export function GET() {
  return new NextResponse(null, { status: 405, headers: { ...CORS, Allow: "POST" } });
}
export const DELETE = GET;
export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, "Access-Control-Allow-Methods": "POST, OPTIONS" } });
}
