import "server-only";
import { addDays } from "@/features/health/habits";
import { todayFor } from "@/features/health/server/queries";
import type { createClient, Viewer } from "@/lib/supabase/server";
import { parseQuickTask } from "../quick-parse";
import { ensureOccurrences } from "./queries";

type Db = Awaited<ReturnType<typeof createClient>>;

/**
 * Cria a tarefa a partir da frase ("lavar roupa toda quarta #casa @nós"). Usada pela adição rápida e pela
 * fila offline; com `id` (gerado no aparelho), reenviar não duplica.
 */
export async function createTaskFromText(supabase: Db, viewer: Viewer, text: string, workspaceId?: string | null, id?: string) {
  const today = todayFor(viewer);
  const p = parseQuickTask(text.trim(), today);
  if (!p.title) return { ok: false as const, message: "Faltou o nome da tarefa." };

  const { data: spaces } = await supabase.from("workspaces").select("id, kind");
  const shared = spaces?.find((s) => s.kind === "shared");
  const personal = spaces?.find((s) => s.kind === "personal");
  const chosen = p.shared && shared ? shared.id : spaces?.some((s) => s.id === workspaceId) ? workspaceId! : personal?.id;
  if (!chosen) return { ok: false as const, message: "Não encontrei seu espaço." };

  const isShared = chosen === shared?.id;
  const { data: members } = isShared ? await supabase.from("workspace_members").select("user_id").eq("workspace_id", chosen) : { data: null };
  const start = p.due_date ?? today;
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      ...(id ? { id } : {}),
      workspace_id: chosen,
      title: p.title,
      category: p.category ?? (isShared ? "casa" : "geral"),
      priority: p.priority ?? 0,
      due_date: p.repeat ? null : (p.due_date ?? null),
      due_time: p.due_time ?? null,
      repeat: p.repeat ?? null,
      repeat_start: p.repeat ? start : null,
      // tarefa recorrente da casa alterna entre os dois por padrão
      rotation: p.repeat && isShared && (members?.length ?? 0) > 1 ? members!.map((m) => m.user_id) : null,
    })
    .select("id, repeat, repeat_start, rotation, assignee_id")
    .single();
  if (error?.code === "23505") return { ok: true as const, message: `Criada: ${p.title}` }; // reenvio: já existe
  if (error || !task) return { ok: false as const, message: "Não consegui criar a tarefa." };
  if (task.repeat) await ensureOccurrences(supabase, [task], today, addDays(today, 14));
  return { ok: true as const, message: p.repeat ? `Criada: ${p.title} (recorrente)` : `Criada: ${p.title}` };
}
