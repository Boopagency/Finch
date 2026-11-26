import { NextResponse } from "next/server";
import { baseUrl } from "@/features/mcp/oauth";

/** RFC 9728: quem protege o /api/mcp. */
export function GET(req: Request) {
  const base = baseUrl(req);
  return NextResponse.json(
    { resource: `${base}/api/mcp`, authorization_servers: [base], bearer_methods_supported: ["header"], resource_name: "Finch" },
    { headers: { "Access-Control-Allow-Origin": "*" } },
  );
}
