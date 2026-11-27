import "server-only";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createEventQuick, deleteEvent } from "@/features/agenda/server/actions";
import { getAgenda } from "@/features/agenda/server/queries";
import { execute } from "@/features/assistant/server/execute";
import {
  addToGoal, carePet, deleteDate, deleteGoal, deleteMemory, deleteMessage, deletePlace, editMessage, markRead, markVisited,
  saveDate, saveGoal, saveMemory, savePet, savePlace, sendMessage,
} from "@/features/couple/server/actions";
import { getCouple, getGoals, getMessages, getPet } from "@/features/couple/server/queries";
import { CARES, SPECIES, level, mood, moodLine, type Care } from "@/features/couple/pet";
import { brl } from "@/features/finance/money";
import { archiveAccount, confirmEntry, createAccount, quickExpense, recordEntry, setBudget, settle, voidEntry } from "@/features/finance/server/actions";
import { getFinance } from "@/features/finance/server/queries";
import { addDays, habitStatus } from "@/features/health/habits";
import { archiveHabit, saveHabit } from "@/features/health/server/actions";
import { getHabits, getWaterToday, getWaterWeek, todayFor } from "@/features/health/server/queries";
import { addMaintenance, deleteItem as deleteHomeItem, deleteMaintenance, saveItem as saveHomeItem } from "@/features/home/server/actions";
import { getHome } from "@/features/home/server/queries";
import {
  adjustPantry, deletePantryItem, deleteRecipe, planMeal, recipeToList, restockLow, savePantryItem, saveRecipe, weekToList,
} from "@/features/kitchen/server/actions";
import { getKitchen } from "@/features/kitchen/server/queries";
import { parseItems, parseMoney } from "@/features/shopping/parse";
import { createList, finishShopping } from "@/features/shopping/server/actions";
import { getList, getLists } from "@/features/shopping/server/queries";
import type { Op } from "@/features/sync/ops";
import { applyOp } from "@/features/sync/server/apply";
import { addSubtask, deleteSubtask, snoozeTask, toggleSubtask } from "@/features/tasks/server/actions";
import { getSpaces, getTaskItems } from "@/features/tasks/server/queries";
import { deleteBodyLog, saveBodyLog, startSession } from "@/features/training/server/actions";
import { getBodyLogs, getSession, getTraining } from "@/features/training/server/queries";
import { attachmentList, saveAttachmentPhoto } from "./attachments";
import { createClient, type Viewer } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/**
 * Ferramentas do conector MCP. Todas rodam como a pessoa (RLS) e reaproveitam as ações das telas.
 * `confirm`: a ferramenta só age com `confirm: true`; sem isso devolve o que faria, para a pessoa aprovar.
 */
export class ToolError extends Error {}

type Args = Record<string, unknown>;
export type Tool = {
  title: string;
  description: string;
  input: z.ZodObject;
  readOnly?: boolean;
  confirm?: "destructive" | "financial" | "outward"; // outward: sai do app e chega em outra pessoa
  /** Texto do que vai acontecer (só nas que pedem confirmação); lança ToolError se o item não existe. */
  preview?: (v: Viewer, a: never) => Promise<string>;
  run: (v: Viewer, a: never) => Promise<unknown>;
};

const id = z.uuid("id inválido");
const date = z.iso.date("data aaaa-mm-dd");
const time = z.string().regex(/^\d{2}:\d{2}$/, "hora hh:mm");
const text = (max: number) => z.string().trim().min(1).max(max);
const money = z.union([z.number().positive(), z.string().trim().min(1).max(20)]).describe("Valor em reais: 35.9 ou \"35,90\"");
const cents = (m: number | string) => {
  const c = typeof m === "number" ? Math.round(m * 100) : parseMoney(m);
  if (!c || c <= 0) throw new ToolError("valor inválido");
  return c;
};
const reais = (m: number | string) => (typeof m === "number" ? m.toFixed(2).replace(".", ",") : m);

/** FormData como o das telas (listas viram campos repetidos; null/undefined ficam de fora). */
function fd(o: Record<string, unknown>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) {
    if (v === undefined || v === null || v === false) continue;
    for (const x of Array.isArray(v) ? v : [v]) f.append(k, v === true ? "on" : String(x));
  }
  return f;
}

type Loose = { from: (t: string) => { select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: Record<string, unknown> | null }> } } } };
/** Lê uma linha pela RLS; inexistente ou de outra pessoa → erro. */
async function row(table: string, cols: string, rowId: string) {
  const { data } = await ((await createClient()) as unknown as Loose).from(table).select(cols).eq("id", rowId).maybeSingle();
  if (!data) throw new ToolError("não encontrei esse item (confira o id com a ferramenta de leitura)");
  return data;
}
const label = (table: string, col: string, what: string) => async (_v: Viewer, a: Args) => `${what} “${(await row(table, col, String(Object.values(a)[0])))[col]}”`;

/** Atualiza só os campos informados e refaz os lembretes pendentes (o planejador recria). */
async function update(table: "tasks" | "events", rowId: string, patch: Record<string, unknown>, message: string) {
  const supabase = await createClient();
  const clean = Object.fromEntries(Object.entries(patch).filter(([, x]) => x !== undefined));
  const { error } = table === "tasks"
    ? await supabase.from("tasks").update(clean as Database["public"]["Tables"]["tasks"]["Update"]).eq("id", rowId)
    : await supabase.from("events").update(clean as Database["public"]["Tables"]["events"]["Update"]).eq("id", rowId);
  if (error) throw new ToolError("não consegui salvar");
  await supabase.from("notification_jobs").delete().eq("source_id", rowId).eq("status", "pending");
  revalidatePath("/", "layout");
  return { ok: true, message };
}

async function op(v: Viewer, o: Op) {
  const err = await applyOp(await createClient(), v.id, o);
  if (err) throw new ToolError(err.message.slice(0, 200));
  return { ok: true };
}
const now = () => new Date().toISOString();
const uuid = () => crypto.randomUUID();

async function space(v: Viewer, workspaceId?: string) {
  const spaces = await getSpaces(v);
  if (workspaceId) {
    const s = spaces.find((x) => x.id === workspaceId);
    if (!s) throw new ToolError("espaço não encontrado (use get_spaces)");
    return s;
  }
  return spaces.find((s) => s.kind === "shared") ?? spaces.find((s) => s.kind === "personal")!;
}
/** A outra pessoa do espaço Nós (o modelo nunca escolhe usuário). */
async function partner(v: Viewer) {
  const shared = (await getSpaces(v)).find((s) => s.kind === "shared");
  const others = shared?.members.filter((m) => m.id !== v.id) ?? [];
  if (!shared || others.length !== 1) throw new ToolError("acerto só no espaço Nós com duas pessoas");
  return { space: shared, to: others[0]! };
}
/** Número do anexo da mensagem (1 = o primeiro). Só vale no assistente do app, onde a pessoa anexa a foto. */
const photoRef = z.number().int().min(1).max(3).optional().describe("Número do anexo desta mensagem para usar como foto (1 = o primeiro)");
const workspace = id.optional().describe("Espaço (get_spaces). Padrão: Nós, ou o pessoal se não houver.");

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

// ---------------------------------------------------------------- ferramentas
export const TOOLS: Record<string, Tool> = {
  // ---------- visão geral
  get_today: {
    title: "Ver o dia",
    description: "Resumo de hoje da pessoa: tarefas (com horário e se estão feitas), compromissos da agenda, água bebida e meta, hábitos pendentes. Use antes de responder qualquer pergunta sobre o dia.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => (await execute(v, "get_today", {})).result,
  },
  get_spaces: {
    title: "Ver espaços",
    description: "Espaços da pessoa (pessoal e Nós) com ids e membros. Use para escolher workspace_id.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => (await getSpaces(v)).map((s) => ({ id: s.id, kind: s.kind, name: s.name, members: s.members })),
  },

  // ---------- tarefas
  list_tasks: {
    title: "Ver tarefas",
    description: "Tarefas de hoje (inclui atrasadas) e dos próximos 14 dias, com ids, data, horário, espaço e subtarefas. Por padrão só as abertas.",
    input: z.strictObject({ include_done: z.boolean().optional() }),
    readOnly: true,
    run: async (v, a: { include_done?: boolean }) => {
      const today = todayFor(v);
      const { items } = await getTaskItems(v, 14);
      return items
        .filter((t) => (a.include_done || t.status !== "done") && (!t.date || t.date <= addDays(today, 14)))
        .map((t) => ({
          task_id: t.task_id, occurrence_id: t.occurrence_id, title: t.title, notes: t.notes, date: t.date, time: t.time, status: t.status,
          overdue: !!t.date && t.date < today && t.status !== "done", category: t.category, priority: t.priority, space: t.space.name,
          assignee: t.assignee?.name ?? null, repeat: t.repeatLabel ?? null, subtasks: t.subtasks,
        }));
    },
  },
  create_task: {
    title: "Criar tarefa",
    description: "Cria uma tarefa a partir de uma frase em português, que pode trazer data, hora e repetição. Ex.: 'pagar internet sexta 9h', 'lixo toda terça e sexta', 'lavar o carro sábado @nós'.",
    input: z.strictObject({ text: text(200).describe("A tarefa como a pessoa diria") }),
    run: async (v, a: { text: string }) => (await execute(v, "create_task", a)).result,
  },
  complete_task: {
    title: "Concluir tarefa",
    description: "Marca uma tarefa como feita (ou reabre com done: false). Em tarefa que repete, informe o occurrence_id do dia (list_tasks).",
    input: z.strictObject({ task_id: id, occurrence_id: id.optional(), done: z.boolean().default(true) }),
    run: (v, a: { task_id: string; occurrence_id?: string; done: boolean }) =>
      op(v, { id: uuid(), type: "task.toggle", task_id: a.task_id, occurrence_id: a.occurrence_id ?? null, done: a.done }),
  },
  update_task: {
    title: "Editar tarefa",
    description: "Muda nome, notas, data, horário, prioridade (0–3) ou categoria de uma tarefa. Só os campos informados mudam; date/time vazios (\"\") tiram a data/hora.",
    input: z.strictObject({
      task_id: id,
      title: text(200).optional(),
      notes: z.string().max(2000).optional(),
      date: date.or(z.literal("")).optional(),
      time: time.or(z.literal("")).optional(),
      priority: z.number().int().min(0).max(3).optional(),
      category: z.enum(["geral", "casa", "contas", "trabalho", "saude", "compras", "nos"]).optional(),
    }),
    run: async (_v, a: { task_id: string; title?: string; notes?: string; date?: string; time?: string; priority?: number; category?: string }) => {
      const t = await row("tasks", "repeat", a.task_id);
      if (a.date !== undefined && t.repeat) throw new ToolError("tarefa que repete não tem data única: use snooze_task com o occurrence_id");
      // ponytail: só campos simples; mudar repetição/responsável/espaço continua pela tela
      const patch = { title: a.title, notes: a.notes === undefined ? undefined : a.notes || null, priority: a.priority, category: a.category, due_date: a.date === undefined ? undefined : a.date || null, due_time: a.time === undefined ? undefined : a.time || null };
      return update("tasks", a.task_id, patch, "Tarefa salva.");
    },
  },
  snooze_task: {
    title: "Adiar tarefa",
    description: "Adia uma tarefa para outra data. Em tarefa que repete, informe o occurrence_id (só aquele dia muda).",
    input: z.strictObject({ task_id: id, occurrence_id: id.optional(), to: date }),
    run: async (_v, a: { task_id: string; occurrence_id?: string; to: string }) => {
      await row("tasks", "id", a.task_id);
      await snoozeTask(a.task_id, a.occurrence_id ?? null, a.to);
      return { ok: true, message: `Adiada para ${a.to}.` };
    },
  },
  delete_task: {
    title: "Excluir tarefa",
    description: "Apaga uma tarefa (se repete, apaga a série inteira).",
    input: z.strictObject({ task_id: id }),
    confirm: "destructive",
    preview: label("tasks", "title", "Apagar a tarefa"),
    run: (v, a: { task_id: string }) => op(v, { id: uuid(), type: "task.delete", task_id: a.task_id }),
  },
  add_subtask: {
    title: "Adicionar subtarefa",
    description: "Adiciona um passo (subtarefa) a uma tarefa.",
    input: z.strictObject({ task_id: id, title: text(200) }),
    run: async (_v, a: { task_id: string; title: string }) => {
      await row("tasks", "id", a.task_id);
      await addSubtask(a.task_id, a.title);
      return { ok: true, message: "Subtarefa adicionada." };
    },
  },
  complete_subtask: {
    title: "Marcar subtarefa",
    description: "Marca (ou desmarca, done: false) uma subtarefa. Ids em list_tasks → subtasks.",
    input: z.strictObject({ subtask_id: id, done: z.boolean().default(true) }),
    run: async (_v, a: { subtask_id: string; done: boolean }) => {
      await row("subtasks", "id", a.subtask_id);
      await toggleSubtask(a.subtask_id, a.done);
      return { ok: true };
    },
  },
  delete_subtask: {
    title: "Excluir subtarefa",
    description: "Apaga uma subtarefa.",
    input: z.strictObject({ subtask_id: id }),
    confirm: "destructive",
    preview: label("subtasks", "title", "Apagar a subtarefa"),
    run: async (_v, a: { subtask_id: string }) => (await deleteSubtask(a.subtask_id), { ok: true }),
  },

  // ---------- agenda
  get_agenda: {
    title: "Ver agenda",
    description: "Compromissos entre duas datas (aaaa-mm-dd), com ids. Sem datas: hoje e os próximos 7 dias. Máximo 62 dias.",
    input: z.strictObject({ from: date.optional(), to: date.optional() }),
    readOnly: true,
    run: async (v, a: { from?: string; to?: string }) => {
      const from = a.from ?? todayFor(v);
      const to = a.to ?? addDays(from, 7);
      if (to < from || addDays(from, 62) < to) throw new ToolError("intervalo inválido (máx. 62 dias)");
      const ag = await getAgenda(v, from, to);
      return ag.events.map((e) => ({ event_id: e.event.id, title: e.event.title, date: e.date, start: e.start, end: e.end, location: e.event.location, notes: e.event.notes, repeats: !!e.event.repeat }));
    },
  },
  create_event: {
    title: "Criar compromisso",
    description: "Cria um compromisso na agenda a partir de uma frase: 'jantar sexta 20h @nós', 'dentista dia 12 9h'. Sem hora = dia inteiro.",
    input: z.strictObject({ text: text(300) }),
    run: (v, a: { text: string }) => createEventQuick(a.text, undefined, todayFor(v)),
  },
  update_event: {
    title: "Editar compromisso",
    description: "Muda nome, data, horário, local ou notas de um compromisso (event_id em get_agenda). Só os campos informados mudam. all_day: true tira o horário.",
    input: z.strictObject({
      event_id: id, title: text(200).optional(), date: date.optional(), end_date: date.optional(), start_time: time.optional(), end_time: time.optional(),
      all_day: z.boolean().optional(), location: z.string().max(200).optional(), notes: z.string().max(2000).optional(),
    }),
    run: async (_v, a: { event_id: string; title?: string; date?: string; end_date?: string; start_time?: string; end_time?: string; all_day?: boolean; location?: string; notes?: string }) => {
      const e = await row("events", "start_date, end_date, start_time, end_time", a.event_id);
      const start = a.date ?? (e.start_date as string);
      const end = a.end_date ?? addDays(start, daysBetween(e.start_date as string, e.end_date as string));
      const allDay = a.all_day ?? (a.start_time === undefined && !e.start_time);
      const st = allDay ? null : (a.start_time ?? (e.start_time as string | null)?.slice(0, 5) ?? null);
      const et = allDay ? null : (a.end_time ?? (e.end_time as string | null)?.slice(0, 5) ?? null);
      if (end < start || (!allDay && (!st || !et)) || (st && et && end === start && et <= st)) throw new ToolError("confira início e fim (com horário, informe os dois)");
      const patch = { title: a.title, start_date: start, end_date: end, start_time: st, end_time: et, location: a.location === undefined ? undefined : a.location || null, notes: a.notes === undefined ? undefined : a.notes || null };
      return update("events", a.event_id, patch, "Compromisso salvo.");
    },
  },
  delete_event: {
    title: "Excluir compromisso",
    description: "Apaga um compromisso (se repete, apaga a série inteira).",
    input: z.strictObject({ event_id: id }),
    confirm: "destructive",
    preview: label("events", "title", "Apagar o compromisso"),
    run: async (_v, a: { event_id: string }) => (await deleteEvent(a.event_id), { ok: true, message: "Compromisso apagado." }),
  },

  // ---------- água e hábitos
  get_water: {
    title: "Ver água",
    description: "Água de hoje (cada registro com id, para desfazer), meta e total de cada um dos últimos 7 dias.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => {
      const [w, week] = await Promise.all([getWaterToday(v), getWaterWeek(v)]);
      return { today_ml: w.logs.reduce((n, l) => n + l.amount_ml, 0), goal_ml: w.settings.water_goal_ml, logs: w.logs.map((l) => ({ log_id: l.id, ml: l.amount_ml, at: l.logged_at })), week };
    },
  },
  log_water: {
    title: "Registrar água",
    description: "Registra água bebida agora, em ml (10 a 1500 por registro).",
    input: z.strictObject({ amount_ml: z.number().int().min(10).max(1500).describe("Mililitros") }),
    run: async (v, a: { amount_ml: number }) => (await execute(v, "log_water", a)).result,
  },
  remove_water: {
    title: "Desfazer água",
    description: "Apaga um registro de água (log_id em get_water).",
    input: z.strictObject({ log_id: id }),
    confirm: "destructive",
    preview: async (_v, a: { log_id: string }) => `Apagar o registro de ${(await row("water_logs", "amount_ml", a.log_id)).amount_ml} ml de água`,
    run: (v, a: { log_id: string }) => op(v, { id: uuid(), type: "water.remove", target_id: a.log_id }),
  },
  get_habits: {
    title: "Ver hábitos",
    description: "Hábitos ativos com id, progresso de hoje (ou da semana) e se estão agendados para hoje.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => {
      const h = await getHabits(v, 7);
      return h.habits.map((x) => ({ habit_id: x.id, name: x.name, kind: x.kind, period: x.period, unit: x.unit, ...habitStatus(x, h.logs, h.today) }));
    },
  },
  mark_habit: {
    title: "Marcar hábito",
    description: "Registra o hábito agora. Hábito de quantidade: informe value (ex.: 20 páginas). Hábito de marcar: sem value.",
    input: z.strictObject({ habit_id: id, value: z.number().int().min(1).max(1000).optional() }),
    run: async (v, a: { habit_id: string; value?: number }) => {
      await row("habits", "id", a.habit_id);
      return op(v, { id: uuid(), type: "habit.add", habit_id: a.habit_id, value: a.value ?? 1, logged_at: now() });
    },
  },
  unmark_habit: {
    title: "Desmarcar hábito",
    description: "Tira os registros de hoje de um hábito.",
    input: z.strictObject({ habit_id: id }),
    run: (v, a: { habit_id: string }) => op(v, { id: uuid(), type: "habit.clear", habit_id: a.habit_id, local_date: todayFor(v) }),
  },
  create_habit: {
    title: "Criar hábito",
    description: "Cria um hábito. kind: check (feito/não feito) ou quantity (com meta e unidade). period: day (em dias da semana, 0=domingo) ou week (target vezes por semana).",
    input: z.strictObject({
      name: text(60), kind: z.enum(["check", "quantity"]).default("check"), period: z.enum(["day", "week"]).default("day"),
      target: z.number().int().min(1).max(1000).default(1), unit: z.string().max(12).optional(),
      days: z.array(z.number().int().min(0).max(6)).min(1).default([0, 1, 2, 3, 4, 5, 6]), reminder_time: time.optional(),
    }),
    run: (_v, a: Args) => saveHabit(null, fd({ ...a, tone: "coral" })),
  },
  archive_habit: {
    title: "Arquivar hábito",
    description: "Arquiva um hábito (some da lista; o histórico fica).",
    input: z.strictObject({ habit_id: id }),
    confirm: "destructive",
    preview: label("habits", "name", "Arquivar o hábito"),
    run: async (_v, a: { habit_id: string }) => (await archiveHabit(a.habit_id), { ok: true, message: "Hábito arquivado." }),
  },

  // ---------- mercado
  get_shopping_list: {
    title: "Ver lista do mercado",
    description: "Itens que faltam comprar (com ids) numa lista. Sem list_id: a lista principal. Também devolve as outras listas abertas.",
    input: z.strictObject({ list_id: id.optional(), include_checked: z.boolean().optional() }),
    readOnly: true,
    run: async (v, a: { list_id?: string; include_checked?: boolean }) => {
      const { lists } = await getLists(v);
      const main = a.list_id ? lists.find((l) => l.id === a.list_id) : (lists.find((l) => l.shared) ?? lists[0]);
      const others = lists.map((l) => ({ list_id: l.id, name: l.name, pending: l.pending }));
      if (!main) return { list: null, items: [], lists: others };
      const data = await getList(v, main.id);
      const items = (data?.items ?? []).filter((i) => a.include_checked || !i.checked);
      return { list_id: main.id, list: main.name, items: items.map((i) => ({ item_id: i.id, name: i.name, qty: i.qty, unit: i.unit, checked: i.checked, note: i.note })), lists: others };
    },
  },
  add_shopping_items: {
    title: "Pôr no mercado",
    description: "Adiciona itens a uma lista de mercado (padrão: a principal). Texto livre: '2 leite, ovos e 1 kg arroz'.",
    input: z.strictObject({ text: text(500), list_id: id.optional() }),
    run: async (v, a: { text: string; list_id?: string }) => {
      if (!a.list_id) return (await execute(v, "add_shopping_items", { text: a.text })).result;
      const items = parseItems(a.text);
      const list = (await getLists(v)).lists.find((l) => l.id === a.list_id);
      if (!list || !items.length) throw new ToolError("lista não encontrada ou sem itens");
      for (const i of items) await op(v, { id: uuid(), type: "shop.add", list_id: list.id, name: i.name, qty: i.qty, unit: i.unit, category: i.category });
      return { ok: true, list: list.name, added: items.map((i) => i.name) };
    },
  },
  check_shopping_item: {
    title: "Marcar item comprado",
    description: "Marca um item da lista como pego no carrinho (ou desmarca com checked: false).",
    input: z.strictObject({ item_id: id, checked: z.boolean().default(true) }),
    run: async (v, a: { item_id: string; checked: boolean }) => {
      await row("shopping_items", "id", a.item_id);
      return op(v, { id: uuid(), type: "shop.check", item_id: a.item_id, checked: a.checked });
    },
  },
  remove_shopping_item: {
    title: "Tirar item da lista",
    description: "Tira um item da lista de mercado.",
    input: z.strictObject({ item_id: id }),
    confirm: "destructive",
    preview: label("shopping_items", "name", "Tirar da lista"),
    run: (v, a: { item_id: string }) => op(v, { id: uuid(), type: "shop.remove", item_id: a.item_id }),
  },
  create_shopping_list: {
    title: "Criar lista",
    description: "Cria uma lista de compras (ex.: 'Farmácia').",
    input: z.strictObject({ name: text(60), workspace_id: workspace }),
    run: async (v, a: { name: string; workspace_id?: string }) => createList(a.name, (await space(v, a.workspace_id)).id),
  },
  finish_shopping: {
    title: "Finalizar compra",
    description: "Fecha a compra da lista: guarda o total e, se a pessoa pagou e tem conta compatível, lança a despesa em Finanças. Itens não pegos voltam para a próxima lista com carry_over.",
    input: z.strictObject({
      list_id: id, total: money, payment: z.enum(["pix", "debito", "credito", "dinheiro", "vr", "va", "outro"]), store: z.string().max(80).optional(),
      purchased_on: date.optional(), carry_over: z.boolean().default(true),
    }),
    confirm: "financial",
    preview: async (_v, a: { list_id: string; total: number | string; payment: string; store?: string }) =>
      `Finalizar a compra da lista “${(await row("shopping_lists", "name", a.list_id)).name}”: R$ ${reais(a.total)} no ${a.payment}${a.store ? ` · ${a.store}` : ""} (vira despesa em Finanças)`,
    run: (v, a: { list_id: string; total: number | string; payment: string; store?: string; purchased_on?: string; carry_over: boolean }) =>
      finishShopping(null, fd({ list_id: a.list_id, total: reais(a.total), payment: a.payment, store: a.store, purchased_on: a.purchased_on ?? todayFor(v), carry_over: a.carry_over })),
  },

  // ---------- finanças
  get_finances_month: {
    title: "Resumo financeiro",
    description: "Totais do mês atual que a pessoa pode ver: receitas, despesas, previstos, disponível em contas e as maiores categorias de despesa.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => (await execute(v, "get_finances_month", {})).result,
  },
  get_finance_details: {
    title: "Ver finanças",
    description: "Detalhe de um mês (aaaa-mm; padrão: o atual): contas e cartões com saldo e fatura, categorias, lançamentos com ids, orçamentos e o saldo do casal.",
    input: z.strictObject({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }),
    readOnly: true,
    run: async (v, a: { month?: string }) => {
      const f = await getFinance(v, `${a.month ?? todayFor(v).slice(0, 7)}-01`);
      const acc = new Map(f.accounts.map((x) => [x.id, x.name]));
      const cat = new Map(f.categories.map((c) => [c.id, c.name]));
      const who = new Map(f.spaces.flatMap((s) => s.members.map((m) => [m.id, m.name] as const)));
      return {
        month: f.month.slice(0, 7),
        accounts: f.accounts.filter((x) => !x.archived && x.kind !== "credit_card").map((x) => ({ account_id: x.id, name: x.name, kind: x.kind, balance: brl(x.balance) })),
        cards: f.cards.map((c) => ({ account_id: c.id, name: c.name, statement: brl(c.statement), available: brl(c.available), due: c.due })),
        categories: f.categories.map((c) => ({ category_id: c.id, name: c.name, kind: c.kind, workspace_id: c.workspace_id })),
        entries: f.entries.map((e) => ({
          entry_id: e.id, date: e.occurred_on, kind: e.kind, status: e.status, description: e.description, amount: brl(e.amount), category: e.category,
          account: e.account_id ? acc.get(e.account_id) : null, installment: e.installments && e.installments > 1 ? `${e.installment_no}/${e.installments}` : null,
        })),
        budgets: f.budgets.map((b) => ({ category: cat.get(b.category_id), limit: brl(Number(b.limit_cents)) })),
        couple: f.couple ? Object.entries(f.couple.balance).map(([u, c]) => ({ name: u === v.id ? "você" : who.get(u), balance: brl(c as number) })) : null,
      };
    },
  },
  log_expense: {
    title: "Lançar gasto/receita",
    description: "Lança um gasto ou receita de hoje no formato do lançamento rápido: '180 mercado crédito', '45 uber', 'recebi 500 freela', '600 tv 6x crédito'.",
    input: z.strictObject({ text: text(200) }),
    confirm: "financial",
    preview: async (v, a: { text: string }) => {
      const r = (await execute(v, "propose_expense", a)).result as { ok: boolean; summary?: string; message?: string };
      if (!r.ok) throw new ToolError(r.message ?? "não entendi o lançamento");
      return r.summary!;
    },
    run: (_v, a: { text: string }) => quickExpense(a.text),
  },
  record_entry: {
    title: "Lançamento completo",
    description:
      "Lançamento com todos os campos (ids em get_finance_details). kind: expense, income, transfer (conta→conta), card_payment (conta→cartão), refund. " +
      "planned: fica como previsto. split no espaço Nós: equal, income (pela renda) ou percent (com my_percent).",
    input: z.strictObject({
      kind: z.enum(["expense", "income", "transfer", "card_payment", "refund"]), account_id: id, amount: money, description: z.string().max(200).optional(),
      category_id: id.optional(), date: date.optional(), to_account_id: id.optional(), planned: z.boolean().optional(),
      installments: z.number().int().min(1).max(36).default(1), split: z.enum(["equal", "income", "percent"]).optional(), my_percent: z.number().min(0).max(100).optional(),
    }),
    confirm: "financial",
    preview: async (v, a: { kind: string; account_id: string; amount: number | string; description?: string; date?: string; installments: number; planned?: boolean }) => {
      const k = { expense: "Despesa", income: "Receita", transfer: "Transferência", card_payment: "Pagamento de fatura", refund: "Estorno" }[a.kind];
      return `${k} de R$ ${reais(a.amount)} em “${(await row("fin_accounts", "name", a.account_id)).name}”${a.description ? ` · ${a.description}` : ""} · ${a.date ?? todayFor(v)}${a.installments > 1 ? ` · ${a.installments}x` : ""}${a.planned ? " · prevista" : ""}`;
    },
    run: async (v, a: { kind: string; account_id: string; amount: number | string; description?: string; category_id?: string; date?: string; to_account_id?: string; planned?: boolean; installments: number; split?: string; my_percent?: number }) => {
      cents(a.amount);
      const { workspace_id } = await row("fin_accounts", "workspace_id", a.account_id);
      return recordEntry(null, fd({ ...a, id: uuid(), workspace_id, amount: reais(a.amount), occurred_on: a.date ?? todayFor(v), date: undefined, split: a.split ?? "" }));
    },
  },
  confirm_entry: {
    title: "Confirmar previsto",
    description: "Confirma um lançamento previsto (vira realizado). entry_id em get_finance_details.",
    input: z.strictObject({ entry_id: id }),
    confirm: "financial",
    preview: label("fin_entries", "description", "Confirmar como realizado o lançamento"),
    run: (_v, a: { entry_id: string }) => confirmEntry(a.entry_id),
  },
  void_entry: {
    title: "Cancelar lançamento",
    description: "Cancela um lançamento (some dos totais; fica no histórico).",
    input: z.strictObject({ entry_id: id }),
    confirm: "financial",
    preview: label("fin_entries", "description", "Cancelar o lançamento"),
    run: (_v, a: { entry_id: string }) => voidEntry(a.entry_id),
  },
  settle_couple: {
    title: "Acerto do casal",
    description: "Registra um acerto no espaço Nós: a pessoa pagou `amount` para a outra (o saldo está em get_finance_details → couple).",
    input: z.strictObject({ amount: money }),
    confirm: "financial",
    preview: async (v, a: { amount: number | string }) => `Acerto: você pagou R$ ${reais(a.amount)} para ${(await partner(v)).to.name}`,
    run: async (v, a: { amount: number | string }) => {
      const { space: s, to } = await partner(v);
      return settle(s.id, to.id, cents(a.amount));
    },
  },
  set_budget: {
    title: "Definir orçamento",
    description: "Define o limite mensal de uma categoria de despesa (amount 0 remove).",
    input: z.strictObject({ category_id: id, amount: z.union([z.number().min(0), z.string().max(20)]) }),
    confirm: "financial",
    preview: async (_v, a: { category_id: string; amount: number | string }) => `Orçamento de “${(await row("fin_categories", "name", a.category_id)).name}”: ${Number(a.amount) === 0 ? "remover" : `R$ ${reais(a.amount)} por mês`}`,
    run: async (_v, a: { category_id: string; amount: number | string }) => {
      const { workspace_id } = await row("fin_categories", "workspace_id", a.category_id);
      return setBudget(String(workspace_id), a.category_id, Number(a.amount) === 0 ? "" : reais(a.amount));
    },
  },
  create_account: {
    title: "Cadastrar conta",
    description: "Cadastra conta (checking, savings, cash, wallet, investment, meal=VR, food=VA) com saldo inicial, ou cartão (credit_card) com limite, fechamento e vencimento.",
    input: z.strictObject({
      name: text(60), kind: z.enum(["checking", "savings", "cash", "wallet", "investment", "meal", "food", "credit_card"]), opening: money.optional(), limit: money.optional(),
      closing_day: z.number().int().min(1).max(31).optional(), due_day: z.number().int().min(1).max(31).optional(), workspace_id: id.optional().describe("Padrão: espaço pessoal"),
    }),
    confirm: "financial",
    preview: async (_v, a: { name: string; kind: string }) => `Cadastrar ${a.kind === "credit_card" ? "o cartão" : "a conta"} “${a.name}”`,
    run: async (v, a: { name: string; kind: string; opening?: number | string; limit?: number | string; closing_day?: number; due_day?: number; workspace_id?: string }) => {
      const ws = a.workspace_id ? (await space(v, a.workspace_id)).id : (await getSpaces(v)).find((s) => s.kind === "personal")!.id;
      return createAccount(null, fd({ ...a, workspace_id: ws, opening: a.opening === undefined ? undefined : reais(a.opening), limit: a.limit === undefined ? undefined : reais(a.limit) }));
    },
  },
  archive_account: {
    title: "Arquivar conta",
    description: "Arquiva uma conta ou cartão (o histórico fica).",
    input: z.strictObject({ account_id: id }),
    confirm: "destructive",
    preview: label("fin_accounts", "name", "Arquivar a conta"),
    run: (_v, a: { account_id: string }) => archiveAccount(a.account_id),
  },

  // ---------- saúde e treino
  get_health: {
    title: "Ver saúde",
    description: "Registros recentes de peso (g), cintura (mm), sono (min) e humor (1–5), com ids. Dados privados: não repita sem a pessoa pedir.",
    input: z.strictObject({}),
    readOnly: true,
    run: async () => (await getBodyLogs()).map(({ id: log_id, ...l }) => ({ log_id, ...l })),
  },
  log_body: {
    title: "Registrar medidas",
    description: "Registra peso (kg, '82,5'), cintura (cm), sono ('7h30' ou '7,5') e/ou humor (1–5). Ao menos um.",
    input: z.strictObject({ weight: z.string().max(10).optional(), waist: z.string().max(6).optional(), sleep: z.string().max(10).optional(), mood: z.number().int().min(1).max(5).optional(), note: z.string().max(280).optional() }),
    run: (_v, a: Args) => saveBodyLog(null, fd(a)),
  },
  delete_body_log: {
    title: "Excluir medida",
    description: "Apaga um registro de saúde (log_id em get_health).",
    input: z.strictObject({ log_id: id }),
    confirm: "destructive",
    preview: label("body_logs", "local_date", "Apagar o registro de saúde do dia"),
    run: async (_v, a: { log_id: string }) => (await deleteBodyLog(a.log_id), { ok: true }),
  },
  get_training: {
    title: "Ver treino",
    description: "Fichas (com exercícios), treino aberto, histórico recente, recordes e a biblioteca de exercícios (ids).",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => {
      const t = await getTraining(v);
      const name = new Map(t.exercises.map((e) => [e.id, e.name]));
      return {
        workouts: t.workouts.map((w) => ({ workout_id: w.id, name: w.name, exercises: w.items.map((i) => ({ exercise_id: i.exercise_id, name: name.get(i.exercise_id), sets: i.sets, reps: i.reps })) })),
        open_session_id: t.open?.id ?? null,
        history: t.history.map((h) => ({ session_id: h.id, name: h.name, date: h.local_date, sets: h.sets, finished: !!h.finished_at })),
        records: t.prs,
        exercises: t.exercises.map((e) => ({ exercise_id: e.id, name: e.name, muscle: e.muscle })),
      };
    },
  },
  start_workout: {
    title: "Começar treino",
    description: "Começa um treino (de uma ficha, ou livre sem workout_id). Se já houver um aberto, devolve esse.",
    input: z.strictObject({ workout_id: id.optional() }),
    run: (_v, a: { workout_id?: string }) => startSession(a.workout_id ?? null),
  },
  log_set: {
    title: "Registrar série",
    description: "Registra uma série no treino aberto: carga em kg e repetições, ou duração em segundos.",
    input: z.strictObject({ session_id: id, exercise_id: id, weight_kg: z.number().min(0).max(1000).optional(), reps: z.number().int().min(0).max(500).optional(), duration_s: z.number().int().min(0).max(86400).optional() }),
    run: (v, a: { session_id: string; exercise_id: string; weight_kg?: number; reps?: number; duration_s?: number }) =>
      op(v, { id: uuid(), type: "set.add", session_id: a.session_id, exercise_id: a.exercise_id, weight_g: a.weight_kg === undefined ? null : Math.round(a.weight_kg * 1000), reps: a.reps ?? null, duration_s: a.duration_s ?? null, done_at: now() }),
  },
  get_workout_session: {
    title: "Ver treino em andamento",
    description: "Plano, séries feitas e melhor marca anterior de uma sessão de treino.",
    input: z.strictObject({ session_id: id }),
    readOnly: true,
    run: async (_v, a: { session_id: string }) => {
      const s = await getSession(a.session_id);
      if (!s) throw new ToolError("treino não encontrado");
      return { session: s.session, plan: s.plan, sets: s.sets, previous_best: s.previousBest };
    },
  },
  finish_workout: {
    title: "Terminar treino",
    description: "Termina o treino aberto (+30 pontos no álbum).",
    input: z.strictObject({ session_id: id }),
    run: (v, a: { session_id: string }) => op(v, { id: uuid(), type: "workout.finish", session_id: a.session_id, finished_at: now() }),
  },

  // ---------- nós e metas
  get_couple: {
    title: "Ver Nós",
    description: "Datas especiais (com contagem), lugares (queremos ir/fomos) e memórias do espaço Nós, com ids.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => {
      const c = await getCouple(v);
      return {
        dates: c.dates.map((d) => ({ date_id: d.id, title: d.title, on_date: d.on_date, yearly: d.yearly, next: d.next })),
        places: c.places.map(({ id: place_id, ...p }) => ({ place_id, ...p })),
        memories: c.memories.map((m) => ({ memory_id: m.id, title: m.title, body: m.body, happened_on: m.happened_on })),
      };
    },
  },
  add_special_date: {
    title: "Guardar data especial",
    description: "Guarda uma data especial (aniversário, namoro…). yearly: repete todo ano.",
    input: z.strictObject({ title: text(60), on_date: date, yearly: z.boolean().default(true) }),
    run: (_v, a: Args) => saveDate(null, fd(a)),
  },
  update_special_date: {
    title: "Editar data especial",
    description: "Muda o nome, a data ou o “repete todo ano” de uma data (date_id em get_couple).",
    input: z.strictObject({ date_id: id, title: text(60).optional(), on_date: date.optional(), yearly: z.boolean().optional() }),
    run: async (_v, a: { date_id: string; title?: string; on_date?: string; yearly?: boolean }) => {
      const d = await row("special_dates", "title, on_date, yearly", a.date_id);
      return saveDate(null, fd({ id: a.date_id, title: a.title ?? d.title, on_date: a.on_date ?? d.on_date, yearly: a.yearly ?? d.yearly }));
    },
  },
  delete_special_date: {
    title: "Excluir data especial", description: "Apaga uma data especial.", input: z.strictObject({ date_id: id }), confirm: "destructive",
    preview: label("special_dates", "title", "Apagar a data"),
    run: async (_v, a: { date_id: string }) => (await deleteDate(a.date_id), { ok: true }),
  },
  add_place: {
    title: "Guardar lugar",
    description: "Põe um lugar na lista 'queremos ir'.",
    input: z.strictObject({ name: text(80), kind: z.enum(["restaurante", "viagem", "passeio", "outro"]).default("outro"), note: z.string().max(500).optional() }),
    run: (_v, a: Args) => savePlace(null, fd(a)),
  },
  update_place: {
    title: "Editar lugar",
    description: "Muda o nome, o tipo ou a nota de um lugar (place_id em get_couple).",
    input: z.strictObject({ place_id: id, name: text(80).optional(), kind: z.enum(["restaurante", "viagem", "passeio", "outro"]).optional(), note: z.string().max(500).optional() }),
    run: async (_v, a: { place_id: string; name?: string; kind?: string; note?: string }) => {
      const p = await row("places", "name, kind, note", a.place_id);
      return savePlace(null, fd({ id: a.place_id, name: a.name ?? p.name, kind: a.kind ?? p.kind, note: a.note ?? p.note ?? "" }));
    },
  },
  mark_place_visited: {
    title: "Marcar lugar visitado",
    description: "Marca um lugar como visitado com nota 1–5 (rating null volta para 'queremos ir').",
    input: z.strictObject({ place_id: id, rating: z.number().int().min(1).max(5).nullable() }),
    run: async (_v, a: { place_id: string; rating: number | null }) => {
      await row("places", "id", a.place_id);
      await markVisited(a.place_id, a.rating);
      return { ok: true };
    },
  },
  delete_place: {
    title: "Excluir lugar", description: "Apaga um lugar da lista.", input: z.strictObject({ place_id: id }), confirm: "destructive",
    preview: label("places", "name", "Apagar o lugar"),
    run: async (_v, a: { place_id: string }) => (await deletePlace(a.place_id), { ok: true }),
  },
  add_memory: {
    title: "Guardar memória",
    description: "Guarda uma memória na linha do tempo do casal. Se a pessoa anexou uma foto nesta mensagem, passe `photo` com o número do anexo (veja get_attachments) e a foto entra na memória.",
    input: z.strictObject({ title: text(80), body: z.string().max(4000).optional(), happened_on: date, photo: photoRef }),
    run: async (v, a: { title: string; body?: string; happened_on: string; photo?: number }) => {
      const ws = await space(v);
      const photo_path = await saveAttachmentPhoto(a.photo, ws.id, v);
      return saveMemory(null, fd({ title: a.title, body: a.body, happened_on: a.happened_on, photo_path }));
    },
  },
  update_memory: {
    title: "Editar memória",
    description: "Muda título, texto ou data de uma memória (memory_id em get_couple). Só o que você informar muda. `photo` troca a foto pelo anexo; `remove_photo: true` tira a foto.",
    input: z.strictObject({ memory_id: id, title: text(80).optional(), body: z.string().max(4000).optional(), happened_on: date.optional(), photo: photoRef, remove_photo: z.boolean().optional() }),
    run: async (v, a: { memory_id: string; title?: string; body?: string; happened_on?: string; photo?: number; remove_photo?: boolean }) => {
      const m = await row("memories", "title, body, happened_on, workspace_id", a.memory_id);
      const photo_path = await saveAttachmentPhoto(a.photo, String(m.workspace_id), v);
      return saveMemory(null, fd({
        id: a.memory_id, title: a.title ?? m.title, body: a.body ?? m.body ?? "", happened_on: a.happened_on ?? m.happened_on,
        photo_path, remove_photo: a.remove_photo && !photo_path ? true : undefined,
      }));
    },
  },
  delete_memory: {
    title: "Excluir memória", description: "Apaga uma memória (e a foto dela).", input: z.strictObject({ memory_id: id }), confirm: "destructive",
    preview: label("memories", "title", "Apagar a memória"),
    run: async (_v, a: { memory_id: string }) => (await deleteMemory(a.memory_id), { ok: true }),
  },
  get_goals: {
    title: "Ver metas",
    description: "Metas pessoais e do casal com id, progresso, alvo e prazo.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => (await getGoals(v)).goals.map(({ id: goal_id, ...g }) => ({ goal_id, ...g })),
  },
  create_goal: {
    title: "Criar meta",
    description: "Cria uma meta (ex.: juntar 5000 reais até 2027-06-30; ler 12 livros).",
    input: z.strictObject({ title: text(80), target: z.number().positive().max(1e12), unit: z.string().max(12).optional(), due_on: date.optional(), workspace_id: workspace }),
    run: async (v, a: { title: string; target: number; unit?: string; due_on?: string; workspace_id?: string }) =>
      saveGoal(null, fd({ workspace_id: (await space(v, a.workspace_id)).id, title: a.title, target: String(a.target).replace(".", ","), unit: a.unit ?? "", due_on: a.due_on ?? "" })),
  },
  update_goal: {
    title: "Editar meta",
    description: "Muda nome, alvo, unidade ou prazo de uma meta (goal_id em get_goals). O progresso já somado continua.",
    input: z.strictObject({ goal_id: id, title: text(80).optional(), target: z.number().positive().max(1e12).optional(), unit: z.string().max(12).optional(), due_on: date.or(z.literal("")).optional() }),
    run: async (_v, a: { goal_id: string; title?: string; target?: number; unit?: string; due_on?: string }) => {
      const g = await row("goals", "title, target, unit, due_on, workspace_id", a.goal_id);
      return saveGoal(null, fd({
        id: a.goal_id, workspace_id: g.workspace_id, title: a.title ?? g.title,
        target: String(a.target ?? g.target).replace(".", ","), unit: a.unit ?? g.unit ?? "", due_on: a.due_on ?? g.due_on ?? "",
      }));
    },
  },
  add_to_goal: {
    title: "Somar na meta",
    description: "Soma (ou subtrai, com valor negativo) no progresso de uma meta.",
    input: z.strictObject({ goal_id: id, amount: z.number().refine((n) => n !== 0, "valor não pode ser zero") }),
    run: (_v, a: { goal_id: string; amount: number }) => addToGoal(a.goal_id, String(a.amount).replace(".", ",")),
  },
  delete_goal: {
    title: "Excluir meta", description: "Apaga uma meta.", input: z.strictObject({ goal_id: id }), confirm: "destructive",
    preview: label("goals", "title", "Apagar a meta"),
    run: async (_v, a: { goal_id: string }) => (await deleteGoal(a.goal_id), { ok: true }),
  },

  // ---------- cozinha
  get_kitchen: {
    title: "Ver cozinha",
    description: "Despensa (quantidade, mínimo, validade), receitas (com ingredientes) e cardápio da semana, com ids.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => {
      const k = await getKitchen(v);
      return {
        pantry: k.pantry.map(({ id: item_id, ...p }) => ({ item_id, ...p })),
        recipes: k.recipes.map(({ id: recipe_id, ...r }) => ({ recipe_id, ...r })),
        week: k.week,
        meals: k.meals.map(({ day, slot, title, recipe_id }) => ({ day, slot, title, recipe_id })),
      };
    },
  },
  save_pantry_item: {
    title: "Salvar na despensa",
    description: "Cadastra um item na despensa ou atualiza (com item_id). min_qty: abaixo disso entra no 'Repor'.",
    input: z.strictObject({ item_id: id.optional(), name: text(80), qty: z.number().min(0).max(9999), unit: z.string().max(10).optional(), min_qty: z.number().min(0).max(9999).default(0), expires_on: date.optional() }),
    run: (_v, a: { item_id?: string; name: string; qty: number; unit?: string; min_qty: number; expires_on?: string }) =>
      savePantryItem(null, fd({ id: a.item_id ?? "", name: a.name, qty: a.qty, unit: a.unit ?? "", min_qty: a.min_qty, expires_on: a.expires_on ?? "" })),
  },
  adjust_pantry: {
    title: "Ajustar despensa",
    description: "Soma ou tira quantidade de um item da despensa (ex.: delta -1 ao usar).",
    input: z.strictObject({ item_id: id, delta: z.number().min(-100).max(100) }),
    run: async (_v, a: { item_id: string; delta: number }) => {
      await row("pantry_items", "id", a.item_id);
      await adjustPantry(a.item_id, a.delta);
      return { ok: true };
    },
  },
  delete_pantry_item: {
    title: "Excluir da despensa", description: "Apaga um item da despensa.", input: z.strictObject({ item_id: id }), confirm: "destructive",
    preview: label("pantry_items", "name", "Apagar da despensa"),
    run: async (_v, a: { item_id: string }) => (await deletePantryItem(a.item_id), { ok: true }),
  },
  restock_low: {
    title: "Repor despensa",
    description: "Põe na lista do mercado tudo que está abaixo do mínimo na despensa.",
    input: z.strictObject({}),
    run: () => restockLow(),
  },
  save_recipe: {
    title: "Salvar receita",
    description: "Cria ou atualiza (com recipe_id) uma receita. ingredients: um por linha ('2 xícaras farinha').",
    input: z.strictObject({ recipe_id: id.optional(), title: text(80), servings: z.number().int().min(1).max(50), prep_min: z.number().int().min(1).max(1440).optional(), ingredients: z.string().max(4000), steps: z.string().max(8000).default("") }),
    run: (_v, a: { recipe_id?: string; title: string; servings: number; prep_min?: number; ingredients: string; steps: string }) =>
      saveRecipe(null, fd({ id: a.recipe_id ?? "", title: a.title, servings: a.servings, prep_min: a.prep_min ?? "", ingredients: a.ingredients, steps: a.steps })),
  },
  delete_recipe: {
    title: "Excluir receita", description: "Apaga uma receita.", input: z.strictObject({ recipe_id: id }), confirm: "destructive",
    preview: label("recipes", "title", "Apagar a receita"),
    run: async (_v, a: { recipe_id: string }) => (await deleteRecipe(a.recipe_id), { ok: true }),
  },
  recipe_to_list: {
    title: "Receita para a lista",
    description: "Põe na lista do mercado os ingredientes de uma receita (escalados para `servings`), pulando o que tem em casa.",
    input: z.strictObject({ recipe_id: id, servings: z.number().int().min(1).max(50).optional() }),
    run: async (_v, a: { recipe_id: string; servings?: number }) => recipeToList(a.recipe_id, a.servings ?? Number((await row("recipes", "servings", a.recipe_id)).servings)),
  },
  plan_meal: {
    title: "Planejar refeição",
    description: "Põe uma refeição no cardápio (slot: cafe, almoco, jantar): uma receita salva (recipe_id) ou um texto livre (title). Sem os dois, tira a refeição.",
    input: z.strictObject({ day: date, slot: z.enum(["cafe", "almoco", "jantar"]), recipe_id: id.optional(), title: z.string().max(80).optional() }),
    run: (_v, a: { day: string; slot: string; recipe_id?: string; title?: string }) => planMeal(a.day, a.slot, a.recipe_id ? `r:${a.recipe_id}` : (a.title ?? "")),
  },
  week_to_list: {
    title: "Cardápio para a lista",
    description: "Põe na lista do mercado os ingredientes das receitas do cardápio da semana, pulando o que tem em casa.",
    input: z.strictObject({}),
    run: () => weekToList(),
  },

  // ---------- coisas da casa
  get_home: {
    title: "Ver coisas da casa",
    description: "Itens da casa (garantia, preço) com manutenções e os avisos (garantia acabando, manutenção vencida), com ids.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => {
      const h = await getHome(v);
      return {
        items: h.items.map((i) => ({ item_id: i.id, name: i.name, kind: i.kind, bought_on: i.bought_on, price: i.price_cents === null ? null : brl(i.price_cents), warranty_until: i.warranty_until, notes: i.notes, maintenance: i.maintenance })),
        alerts: h.alerts,
      };
    },
  },
  add_home_item: {
    title: "Cadastrar item da casa",
    description: "Cadastra um item (eletro, movel, veiculo, eletronico, imovel, outro) com data de compra, preço e fim da garantia. `photo`: número do anexo com a foto da nota fiscal.",
    input: z.strictObject({ name: text(80), kind: z.enum(["eletro", "movel", "veiculo", "eletronico", "imovel", "outro"]).default("outro"), bought_on: date.optional(), price: money.optional(), warranty_until: date.optional(), notes: z.string().max(1000).optional(), photo: photoRef }),
    run: async (v, a: { name: string; kind: string; bought_on?: string; price?: number | string; warranty_until?: string; notes?: string; photo?: number }) => {
      const { photo, ...rest } = a;
      const photo_path = await saveAttachmentPhoto(photo, (await space(v)).id, v);
      return saveHomeItem(null, fd({ ...rest, price: a.price === undefined ? "" : reais(a.price), photo_path }));
    },
  },
  delete_home_item: {
    title: "Excluir item da casa", description: "Apaga um item da casa (e as manutenções dele).", input: z.strictObject({ item_id: id }), confirm: "destructive",
    preview: label("home_items", "name", "Apagar o item"),
    run: async (_v, a: { item_id: string }) => (await deleteHomeItem(a.item_id), { ok: true }),
  },
  add_maintenance: {
    title: "Registrar manutenção",
    description: "Registra uma manutenção feita num item da casa, com custo e a próxima data (vira aviso).",
    input: z.strictObject({ item_id: id, description: text(200), done_on: date.optional(), cost: money.optional(), next_on: date.optional() }),
    run: (v, a: { item_id: string; description: string; done_on?: string; cost?: number | string; next_on?: string }) =>
      addMaintenance(null, fd({ ...a, done_on: a.done_on ?? todayFor(v), cost: a.cost === undefined ? "" : reais(a.cost) })),
  },
  get_attachments: {
    title: "Ver anexos",
    description: "O que a pessoa anexou nesta mensagem (número, nome e tipo). Use o número em `photo` para guardar a foto numa memória ou num item da casa.",
    input: z.strictObject({}),
    readOnly: true,
    run: async () => attachmentList(),
  },

  // ---------- recados
  get_messages: {
    title: "Ver recados",
    description: "Recados trocados no Nós (mais novos por último), com id, quem escreveu e se já foram lidos.",
    input: z.strictObject({ limit: z.number().int().min(1).max(100).default(30) }),
    readOnly: true,
    run: async (v, a: { limit: number }) => {
      const { messages, unread } = await getMessages(v, a.limit);
      return {
        unread,
        messages: messages.map((m) => ({ message_id: m.id, mine: m.author_id === v.id, text: m.body, has_photo: !!m.photo_path, at: m.created_at, read: !!m.read_at, edited: !!m.edited_at })),
      };
    },
  },
  send_message: {
    title: "Mandar recado",
    description: "Manda um recado para a outra pessoa no Nós (ela recebe um aviso no celular). `photo`: número do anexo para mandar junto.",
    input: z.strictObject({ text: text(2000).optional(), photo: photoRef }),
    confirm: "outward",
    preview: async (_v, a: { text?: string; photo?: number }) => `Mandar para a outra pessoa: “${a.text ?? ""}”${a.photo ? " (com a foto anexada)" : ""}`,
    run: async (v, a: { text?: string; photo?: number }) => {
      const ws = await space(v);
      const photo_path = await saveAttachmentPhoto(a.photo, ws.id, v);
      return sendMessage(null, fd({ body: a.text ?? "", photo_path }));
    },
  },
  edit_message: {
    title: "Editar recado",
    description: "Muda o texto de um recado seu (message_id em get_messages).",
    input: z.strictObject({ message_id: id, text: text(2000) }),
    run: (_v, a: { message_id: string; text: string }) => editMessage(a.message_id, a.text),
  },
  delete_message: {
    title: "Apagar recado",
    description: "Apaga um recado seu.",
    input: z.strictObject({ message_id: id }),
    confirm: "destructive",
    preview: async (_v, a: { message_id: string }) => `Apagar o recado “${String((await row("couple_messages", "body", a.message_id)).body ?? "(foto)").slice(0, 60)}”`,
    run: async (_v, a: { message_id: string }) => (await deleteMessage(a.message_id), { ok: true }),
  },
  mark_messages_read: {
    title: "Marcar recados lidos",
    description: "Marca como lidos os recados que a outra pessoa mandou.",
    input: z.strictObject({}),
    run: async () => ({ ok: true, marked: await markRead() }),
  },

  // ---------- bichinho
  get_pet: {
    title: "Ver bichinho",
    description: "O bichinho do casal: espécie, nome, amor, nível, humor de hoje e os últimos cuidados.",
    input: z.strictObject({}),
    readOnly: true,
    run: async (v) => {
      const { pet } = await getPet(v);
      if (!pet) return { pet: null, message: "Ainda não adotaram um bichinho (dá para adotar em Nós → Bichinho, ou com adopt_pet)." };
      const m = mood(pet.cared_at, pet.today_cares);
      return {
        pet_id: pet.id, species: pet.species, name: pet.name, love: pet.love, level: level(pet.love), mood: m, line: moodLine(pet.name, m),
        cared_at: pet.cared_at, cares_today: pet.today_cares,
        recent: pet.feeds.map((f) => ({ kind: f.kind, note: f.note, at: f.created_at })),
      };
    },
  },
  adopt_pet: {
    title: "Adotar bichinho",
    description: `Adota o bichinho do casal, ou muda o nome/espécie do que já existe. Espécies: ${Object.keys(SPECIES).join(", ")}.`,
    input: z.strictObject({ species: z.enum(Object.keys(SPECIES) as [string, ...string[]]), name: text(30) }),
    run: (_v, a: Args) => savePet(null, fd(a)),
  },
  care_pet: {
    title: "Cuidar do bichinho",
    description: `Dá um cuidado ao bichinho: ${Object.entries(CARES).map(([k, c]) => `${k} (+${c.love})`).join(", ")}. Cada tipo conta uma vez por dia para cada pessoa; repetir não tira nada.`,
    input: z.strictObject({ kind: z.enum(Object.keys(CARES) as [string, ...string[]]), note: z.string().max(140).optional() }),
    run: async (v, a: { kind: string; note?: string }) => {
      const { pet } = await getPet(v);
      if (!pet) throw new ToolError("ainda não há bichinho; use adopt_pet");
      return carePet(pet.id, a.kind as Care, a.note);
    },
  },

  delete_maintenance: {
    title: "Excluir manutenção", description: "Apaga um registro de manutenção.", input: z.strictObject({ maintenance_id: id }), confirm: "destructive",
    preview: label("home_maintenance", "description", "Apagar a manutenção"),
    run: async (_v, a: { maintenance_id: string }) => (await deleteMaintenance(a.maintenance_id), { ok: true }),
  },
};
