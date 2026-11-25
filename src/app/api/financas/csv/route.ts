import { NextResponse } from "next/server";
import { getCsvRows } from "@/features/finance/server/report-queries";
import { toCSV } from "@/features/finance/report";
import { requireViewer } from "@/lib/supabase/server";

/** Exporta os lançamentos do mês (?m=aaaa-mm) com o token do usuário: a RLS decide o que entra. */
export async function GET(request: Request) {
  const viewer = await requireViewer();
  const m = new URL(request.url).searchParams.get("m") ?? "";
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)) return NextResponse.json({ error: "use ?m=aaaa-mm" }, { status: 400 });
  const rows = await getCsvRows(viewer, `${m}-01`);
  const csv = toCSV(["Data", "Descrição", "Tipo", "Categoria", "Conta", "Status", "Espaço", "Valor (R$)"], rows);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finch-${m}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
