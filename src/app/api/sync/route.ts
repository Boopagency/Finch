import { NextResponse } from "next/server";
import { batchSchema, type OpResult } from "@/features/sync/ops";
import { applyOp } from "@/features/sync/server/apply";
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

  const userId = auth.claims.sub;
  const results: OpResult[] = [];
  for (const op of parsed.data.ops) {
    const error = await applyOp(supabase, userId, op);
    // rejeição é definitiva (dado inválido/sem permissão): o aparelho descarta e segue
    results.push(error ? { id: op.id, status: "rejected", error: error.message.slice(0, 200) } : { id: op.id, status: "ok" });
  }
  return NextResponse.json({ results });
}
