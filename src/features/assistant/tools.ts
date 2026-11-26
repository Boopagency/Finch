import { z } from "zod";

/**
 * Validadores das ferramentas antigas que `execute` ainda atende (o conector e o assistente usam o registro em
 * features/mcp/server/tools.ts). O modelo nunca escolhe usuário nem espaço: tudo roda com a sessão de quem pergunta (RLS).
 */
export const toolInput = {
  get_today: z.object({}).strict(),
  get_finances_month: z.object({}).strict(),
  create_task: z.object({ text: z.string().trim().min(1).max(200) }).strict(),
  log_water: z.object({ amount_ml: z.number().int().min(10).max(1500) }).strict(),
  add_shopping_items: z.object({ text: z.string().trim().min(1).max(500) }).strict(),
  propose_expense: z.object({ text: z.string().trim().min(1).max(200) }).strict(),
} as const;
export type ToolName = keyof typeof toolInput;

/** Histórico vindo do aparelho: só texto, alternando, começando pelo usuário, no máximo 20 mensagens. */
export const historySchema = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
  .min(1)
  .max(20)
  .refine((m) => m[0]!.role === "user" && m.at(-1)!.role === "user" && m.every((x, i) => i === 0 || x.role !== m[i - 1]!.role), "histórico inválido");

/** Ação que espera a pessoa tocar em Confirmar (excluir, dinheiro). `args` volta para o servidor e é validado de novo. */
export type Proposal = { tool: string; args: Record<string, unknown>; summary: string };

/** Anexos da mensagem atual: imagem/PDF em base64 (a IA lê) ou texto (CSV, OFX, TXT). */
export const ATTACH_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain"] as const;
export const MAX_ATTACH_CHARS = 3_800_000; // abaixo do limite de 4,5 MB do corpo na Vercel
export const chatSchema = z.object({
  messages: historySchema,
  attachments: z
    .array(z.object({ name: z.string().trim().min(1).max(120), type: z.enum(ATTACH_TYPES), data: z.string().min(1) }).strict())
    .max(3)
    .default([])
    .refine((a) => a.reduce((n, x) => n + x.data.length, 0) <= MAX_ATTACH_CHARS, "anexos grandes demais"),
});
export type Attachment = z.infer<typeof chatSchema>["attachments"][number];
