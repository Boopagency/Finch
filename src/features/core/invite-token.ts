import { createHash, randomBytes } from "node:crypto";

/** Token em claro vai só no link; o banco guarda o SHA-256 (mesmo cálculo de accept_invitation). */
export function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
