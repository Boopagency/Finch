import { NextResponse } from "next/server";
import { baseUrl } from "@/features/mcp/oauth";

/** RFC 8414: como fazer login no Finch a partir do Claude (código + PKCE, registro dinâmico). */
export function GET(req: Request) {
  const base = baseUrl(req);
  return NextResponse.json(
    {
      issuer: base,
      authorization_endpoint: `${base}/oauth/authorize`,
      token_endpoint: `${base}/api/oauth/token`,
      registration_endpoint: `${base}/api/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["finch"],
    },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
