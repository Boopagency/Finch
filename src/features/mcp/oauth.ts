import { createHash, randomBytes } from "node:crypto";

/** Utilidades do OAuth do MCP. Tokens do Finch são aleatórios (256 bits) e guardados só como sha-256. */
export const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");
export const randomToken = () => randomBytes(32).toString("base64url");
/** PKCE S256: base64url(sha256(verifier)) — RFC 7636. */
export const s256 = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");
export const validVerifier = (v: string) => /^[A-Za-z0-9._~-]{43,128}$/.test(v);

/** Origem pela qual o cliente chegou (o "resource" do OAuth precisa bater com o endereço usado no Claude). */
export function baseUrl(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? new URL(req.url).host;
  const proto = h.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  return `${proto}://${host}`;
}

/** Só volta para um caminho interno do próprio app (nada de //outro-site ou http:). */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![\/\\])[^\s\\]*$/.test(next) ? next : "/";
}
