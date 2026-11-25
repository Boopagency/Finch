import { NextResponse } from "next/server";
import { batchSchema, type OpResult } from "@/features/sync/ops";
import { createClient } from "@/lib/supabase/server";

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
    }
    // rejeição é definitiva (dado inválido/sem permissão): o aparelho descarta e segue
    results.push(error ? { id: op.id, status: "rejected", error: error.message.slice(0, 200) } : { id: op.id, status: "ok" });
  }
  return NextResponse.json({ results });
}
