import { PageHeader } from "@/components/ui/page-header";
import { FinanceView } from "@/features/finance/components/finance-view";
import { getFinance } from "@/features/finance/server/queries";
import { todayFor } from "@/features/health/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Finanças" };

export default async function FinancePage({ searchParams }: PageProps<"/financas">) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const month = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? `${sp.m}-01` : `${todayFor(viewer).slice(0, 7)}-01`;
  const data = await getFinance(viewer, month);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2 px-gutter pt-safe">
      <PageHeader back="/vida" title="Finanças" meta="privado por padrão" />
      <FinanceView data={data} />
    </main>
  );
}
