import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { hashInviteToken } from "../invite-token";

/** Busca convite válido pelo token (service role; o token é o segredo). */
export async function findValidInvite(token: string) {
  const db = createServiceClient();
  const { data } = await db
    .from("invitations")
    .select("id, invited_email, expires_at, accepted_at, revoked_at, workspace_id, workspaces(name), created_by")
    .eq("token_hash", hashInviteToken(token))
    .maybeSingle();
  if (!data || data.revoked_at || data.accepted_at || new Date(data.expires_at) < new Date()) return null;
  const { data: inviter } = await db.from("profiles").select("display_name").eq("id", data.created_by).single();
  return {
    email: data.invited_email,
    workspaceName: (data.workspaces as { name: string } | null)?.name ?? "Nós",
    inviterName: inviter?.display_name ?? "Alguém",
  };
}
