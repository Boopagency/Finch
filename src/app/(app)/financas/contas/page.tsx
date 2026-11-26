import { PageHeader } from "@/components/ui/page-header";
import { AccountsView } from "@/features/finance/components/accounts-view";
import { getFinance } from "@/features/finance/server/queries";
import { todayFor } from "@/features/health/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Contas" };

export default async function AccountsPage() {
  const viewer = await requireViewer();
  const data = await getFinance(viewer, `${todayFor(viewer).slice(0, 7)}-01`);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2 px-gutter pt-safe">
      <PageHeader back="/financas" title="Contas" meta="e cartões" />
      <AccountsView data={data} viewerId={viewer.id} />
    </main>
  );
}
