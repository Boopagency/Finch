import { NextResponse } from "next/server";
import { batchSchema, type OpResult } from "@/features/sync/ops";
import { createTaskFromText } from "@/features/tasks/server/create";
import { createClient, requireViewer } from "@/lib/supabase/server";

/**
 * Aplica a fila offline do aparelho, em ordem. Idempotente: cada op usa o próprio id
 * como chave do registro, então reenviar não duplica. Tudo com o token do usuário (RLS).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = batchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid batch" }, { status: 400 });

  const userId = auth.claims.sub;
  const results: OpResult[] = [];
  for (const op of parsed.data.ops) {
    let error: { message: string } | null = null;
    switch (op.type) {
      case "water.add":
        ({ error } = await supabase
          .from("water_logs")
          .upsert({ id: op.id, amount_ml: op.amount_ml, logged_at: op.logged_at }, { onConflict: "id", ignoreDuplicates: true }));
        break;
      case "water.remove":
        ({ error } = await supabase.from("water_logs").delete().eq("id", op.target_id));
        break;
      case "habit.add":
        ({ error } = await supabase
          .from("habit_logs")
          .upsert({ id: op.id, habit_id: op.habit_id, value: op.value, logged_at: op.logged_at }, { onConflict: "id", ignoreDuplicates: true }));
        break;
      case "habit.remove":
        ({ error } = await supabase.from("habit_logs").delete().eq("id", op.target_id));
        break;
      case "habit.clear":
        ({ error } = await supabase.from("habit_logs").delete().eq("habit_id", op.habit_id).eq("local_date", op.local_date));
        break;
      case "shop.add":
        ({ error } = await supabase
          .from("shopping_items")
          .upsert({ id: op.id, list_id: op.list_id, name: op.name, qty: op.qty, unit: op.unit, category: op.category }, { onConflict: "id", ignoreDuplicates: true }));
        break;
      case "shop.check":
        ({ error } = await supabase
          .from("shopping_items")
          .update({ checked: op.checked, checked_by: op.checked ? userId : null, checked_at: op.checked ? new Date().toISOString() : null })
          .eq("id", op.item_id));
        break;
      case "shop.remove":
        ({ error } = await supabase.from("shopping_items").delete().eq("id", op.item_id));
        break;
      case "set.add": {
        const { id, session_id, exercise_id, weight_g, reps, duration_s, done_at } = op;
        ({ error } = await supabase
          .from("workout_sets")
          .upsert({ id, session_id, exercise_id, weight_g, reps, duration_s, done_at }, { onConflict: "id", ignoreDuplicates: true }));
        break;
      }
      case "set.remove":
        ({ error } = await supabase.from("workout_sets").delete().eq("id", op.target_id));
        break;
      case "workout.finish":
        // só fecha uma vez: reenvio não muda o horário de fim
        ({ error } = await supabase.from("workout_sessions").update({ finished_at: op.finished_at }).eq("id", op.session_id).is("finished_at", null));
        break;
      case "task.create": {
        const r = await createTaskFromText(supabase, await requireViewer(), op.text, op.workspace_id, op.id);
        error = r.ok ? null : { message: r.message };
        break;
      }
      case "task.delete":
        ({ error } = await supabase.from("tasks").delete().eq("id", op.task_id));
        break;
      case "task.toggle": {
        const patch = { completed_at: op.done ? new Date().toISOString() : null, completed_by: op.done ? userId : null };
        ({ error } = op.occurrence_id
          ? await supabase.from("task_occurrences").update({ ...patch, status: op.done ? "done" : "open" }).eq("id", op.occurrence_id)
          : await supabase.from("tasks").update({ ...patch, status: op.done ? "done" : "open" }).eq("id", op.task_id));
        break;
      }
    }
    // rejeição é definitiva (dado inválido/sem permissão): o aparelho descarta e segue
    results.push(error ? { id: op.id, status: "rejected", error: error.message.slice(0, 200) } : { id: op.id, status: "ok" });
  }
  return NextResponse.json({ results });
}
