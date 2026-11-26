"use server";

import { callTool } from "@/features/mcp/server/handler";
import { ToolError } from "@/features/mcp/server/tools";
import { requireViewer } from "@/lib/supabase/server";

/** A pessoa tocou em Confirmar: executa a ação proposta (validada de novo, com a sessão dela). */
export async function confirmProposal(tool: string, args: Record<string, unknown>): Promise<{ ok: boolean; message: string }> {
  const viewer = await requireViewer();
  try {
    const r = (await callTool(viewer, tool, { ...args, confirm: true })) as { ok?: boolean; message?: string } | null;
    return r?.ok === false ? { ok: false, message: r.message ?? "Não consegui." } : { ok: true, message: r?.message ?? "Feito." };
  } catch (e) {
    return { ok: false, message: e instanceof ToolError ? `Não consegui: ${e.message}` : "Não consegui agora." };
  }
}
