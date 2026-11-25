import { z } from "zod";

/**
 * Operações da fila offline. O `id` é gerado no aparelho e vira a chave primária
 * do registro no servidor: reenviar a mesma operação nunca duplica.
 */
export const opSchema = z.discriminatedUnion("type", [
  z.object({ id: z.uuid(), type: z.literal("water.add"), amount_ml: z.number().int().min(10).max(1500), logged_at: z.iso.datetime({ offset: true }) }),
  z.object({ id: z.uuid(), type: z.literal("water.remove"), target_id: z.uuid() }),
  z.object({ id: z.uuid(), type: z.literal("habit.add"), habit_id: z.uuid(), value: z.number().int().min(1).max(1000), logged_at: z.iso.datetime({ offset: true }) }),
  z.object({ id: z.uuid(), type: z.literal("habit.remove"), target_id: z.uuid() }),
  z.object({ id: z.uuid(), type: z.literal("habit.clear"), habit_id: z.uuid(), local_date: z.iso.date() }),
  z.object({
    id: z.uuid(),
    type: z.literal("shop.add"),
    list_id: z.uuid(),
    name: z.string().trim().min(1).max(80),
    qty: z.number().positive().max(9999),
    unit: z.string().max(10).nullable(),
    category: z.string().max(20),
  }),
  z.object({ id: z.uuid(), type: z.literal("shop.check"), item_id: z.uuid(), checked: z.boolean() }),
  z.object({ id: z.uuid(), type: z.literal("shop.remove"), item_id: z.uuid() }),
  z.object({ id: z.uuid(), type: z.literal("task.toggle"), task_id: z.uuid(), occurrence_id: z.uuid().nullable(), done: z.boolean() }),
]);
export type Op = z.infer<typeof opSchema>;
export const batchSchema = z.object({ ops: z.array(opSchema).min(1).max(100) });

export type OpResult = { id: string; status: "ok" | "rejected"; error?: string };

/** Junta o que o servidor devolveu com o que ainda está na fila (UI otimista, dedupe por id). */
export function mergeWater<T extends { id: string; amount_ml: number }>(server: T[], ops: Op[]): { id: string; amount_ml: number }[] {
  const removed = new Set(ops.flatMap((o) => (o.type === "water.remove" ? [o.target_id] : [])));
  const known = new Set(server.map((l) => l.id));
  const pending = ops.flatMap((o) => (o.type === "water.add" && !known.has(o.id) ? [{ id: o.id, amount_ml: o.amount_ml }] : []));
  return [...server, ...pending].filter((l) => !removed.has(l.id));
}

export function mergeHabitLogs<T extends { id: string; habit_id: string; value: number; local_date: string }>(
  server: T[],
  ops: Op[],
  today: string,
): { id: string; habit_id: string; value: number; local_date: string }[] {
  // reaplica as ops na ordem: um "desmarcar" antigo não pode apagar um "marcar" mais novo
  const fromOps = new Set(ops.flatMap((o) => (o.type === "habit.add" ? [o.id] : [])));
  const byId = new Map(server.map((l) => [l.id, l]));
  let logs: { id: string; habit_id: string; value: number; local_date: string }[] = server.filter((l) => !fromOps.has(l.id));
  for (const o of ops) {
    if (o.type === "habit.add") logs.push(byId.get(o.id) ?? { id: o.id, habit_id: o.habit_id, value: o.value, local_date: today });
    if (o.type === "habit.remove") logs = logs.filter((l) => l.id !== o.target_id);
    if (o.type === "habit.clear") logs = logs.filter((l) => !(l.habit_id === o.habit_id && l.local_date === o.local_date));
  }
  return logs;
}

/** Estado de conclusão otimista: a última op de cada item vence. */
export function taskDoneOverrides(ops: Op[]): Map<string, boolean> {
  const m = new Map<string, boolean>();
  for (const o of ops) if (o.type === "task.toggle") m.set(o.occurrence_id ?? o.task_id, o.done);
  return m;
}

export type ShopItem = { id: string; name: string; qty: number; unit: string | null; category: string; checked: boolean; est_price_cents: number | null; note: string | null };

/** Lista otimista: itens novos da fila, marcações (última vence) e remoções. */
export function mergeShopping(server: ShopItem[], ops: Op[], listId: string): ShopItem[] {
  const known = new Set(server.map((i) => i.id));
  let items = [...server];
  for (const o of ops) {
    if (o.type === "shop.add" && o.list_id === listId && !known.has(o.id))
      items.push({ id: o.id, name: o.name, qty: o.qty, unit: o.unit, category: o.category, checked: false, est_price_cents: null, note: null });
    if (o.type === "shop.check") items = items.map((i) => (i.id === o.item_id ? { ...i, checked: o.checked } : i));
    if (o.type === "shop.remove") items = items.filter((i) => i.id !== o.item_id);
  }
  return items;
}
