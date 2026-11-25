"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { parseMoneyBRL } from "../report";

type Result = { ok: boolean; message: string };

const schema = z.object({
  workspace_id: z.uuid(),
  kind: z.enum(["expense", "income"]),
  description: z.string().trim().min(1, "Dê um nome (ex.: Aluguel).").max(200),
  amount: z.string(),
  account_id: z.uuid({ error: "Escolha a conta." }),
  category_id: z.uuid().or(z.literal("")),
  day_of_month: z.coerce.number().int().min(1, "Dia entre 1 e 31.").max(31, "Dia entre 1 e 31."),
});

export async function saveRecurring(_prev: Result | null, form: FormData): Promise<Result> {
  await requireViewer();
  const p = schema.safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Confira os dados." };
  const { amount, category_id, ...rest } = p.data;
  const cents = parseMoneyBRL(amount);
  if (!cents) return { ok: false, message: "Valor inválido (ex.: 1.200,00)." };
  const supabase = await createClient();
  const { error } = await supabase.from("fin_recurring").insert({ ...rest, amount_cents: cents, category_id: category_id || null });
  if (error) return { ok: false, message: "Não consegui salvar (confira conta e categoria do mesmo espaço)." };
  revalidatePath("/financas", "layout");
  return { ok: true, message: "Recorrência criada: já aparece no mês." };
}

export async function toggleRecurring(id: string, active: boolean) {
  await requireViewer();
  await (await createClient()).from("fin_recurring").update({ active }).eq("id", z.uuid().parse(id));
  revalidatePath("/financas", "layout");
}

export async function deleteRecurring(id: string) {
  await requireViewer();
  // os lançamentos já gerados ficam (histórico); só para de gerar
  await (await createClient()).from("fin_recurring").delete().eq("id", z.uuid().parse(id));
  revalidatePath("/financas", "layout");
}
