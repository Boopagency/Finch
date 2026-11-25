import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

/**
 * Ferramentas do assistente. O modelo nunca escolhe usuário nem espaço: tudo roda com a sessão de quem pergunta (RLS).
 * Risco: read/write executam na hora; "financial" só propõe — quem confirma é a pessoa, num cartão na tela.
 */
const obj = (properties: Record<string, unknown>, required: string[]) =>
  ({ type: "object", properties, required, additionalProperties: false }) as const;

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_today",
    description: "Resumo de hoje da pessoa: tarefas (com horário e se estão feitas), compromissos da agenda, água bebida e meta, hábitos pendentes. Use antes de responder qualquer pergunta sobre o dia.",
    input_schema: obj({}, []),
    strict: true,
  },
  {
    name: "get_finances_month",
    description: "Totais do mês atual que a pessoa pode ver: receitas, despesas, previstos, disponível em contas e as maiores categorias de despesa. Valores em centavos de real.",
    input_schema: obj({}, []),
    strict: true,
  },
  {
    name: "create_task",
    description: "Cria uma tarefa a partir de uma frase em português, que pode trazer data, hora e repetição. Ex.: 'pagar internet sexta 9h', 'lixo toda terça e sexta'.",
    input_schema: obj({ text: { type: "string", description: "A tarefa como a pessoa diria" } }, ["text"]),
    strict: true,
  },
  {
    name: "log_water",
    description: "Registra água bebida agora, em ml (10 a 1500 por registro).",
    input_schema: obj({ amount_ml: { type: "integer", description: "Mililitros" } }, ["amount_ml"]),
    strict: true,
  },
  {
    name: "add_shopping_items",
    description: "Adiciona itens à lista de mercado principal. Texto livre: '2 leite, ovos e 1 kg arroz'.",
    input_schema: obj({ text: { type: "string" } }, ["text"]),
    strict: true,
  },
  {
    name: "propose_expense",
    description: "Prepara um lançamento financeiro (gasto ou receita) para a pessoa confirmar na tela. Nunca grava sozinho. Texto no formato do lançamento rápido: '180 mercado crédito', '45 uber', 'recebi 500 freela'.",
    input_schema: obj({ text: { type: "string" } }, ["text"]),
    strict: true,
  },
];

export const toolInput = {
  get_today: z.object({}).strict(),
  get_finances_month: z.object({}).strict(),
  create_task: z.object({ text: z.string().trim().min(1).max(200) }).strict(),
  log_water: z.object({ amount_ml: z.number().int().min(10).max(1500) }).strict(),
  add_shopping_items: z.object({ text: z.string().trim().min(1).max(500) }).strict(),
  propose_expense: z.object({ text: z.string().trim().min(1).max(200) }).strict(),
} as const;
export type ToolName = keyof typeof toolInput;

/** Valida o pedido do modelo antes de executar; erro vira tool_result com is_error. */
export function parseToolCall(name: string, input: unknown): { ok: true; name: ToolName; input: never } | { ok: false; error: string } {
  if (!(name in toolInput)) return { ok: false, error: `ferramenta desconhecida: ${name}` };
  const r = toolInput[name as ToolName].safeParse(input);
  return r.success ? { ok: true, name: name as ToolName, input: r.data as never } : { ok: false, error: r.error.issues[0]?.message ?? "entrada inválida" };
}

/** Histórico vindo do aparelho: só texto, alternando, começando pelo usuário, no máximo 20 mensagens. */
export const historySchema = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
  .min(1)
  .max(20)
  .refine((m) => m[0]!.role === "user" && m.at(-1)!.role === "user" && m.every((x, i) => i === 0 || x.role !== m[i - 1]!.role), "histórico inválido");

export type Proposal = { kind: "expense"; text: string; summary: string };
