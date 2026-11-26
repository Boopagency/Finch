import { PageHeader } from "@/components/ui/page-header";
import { RecurringView } from "@/features/finance/components/recurring-view";
import { getSpaces } from "@/features/tasks/server/queries";
import { createClient, requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Recorrentes" };

export default async function RecurringPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const spaces = await getSpaces(viewer);
  await Promise.all(spaces.map((s) => supabase.rpc("fin_ensure_categories", { p_workspace: s.id })));
  const [rules, accounts, categories] = await Promise.all([
    supabase.from("fin_recurring").select("id, workspace_id, kind, description, amount_cents, account_id, category_id, day_of_month, active").order("day_of_month"),
    supabase.from("fin_accounts").select("id, name, workspace_id").is("archived_at", null).order("created_at"),
    supabase.from("fin_categories").select("id, name, workspace_id, kind").is("archived_at", null).order("name"),
  ]);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader back="/financas" title="Recorrentes" meta="entram sozinhos todo mês" />
      <RecurringView
        rules={(rules.data ?? []).map((r) => ({ ...r, amount_cents: Number(r.amount_cents) }))}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        spaces={spaces.map((s) => ({ id: s.id, name: s.name, kind: s.kind }))}
      />
    </main>
  );
}
