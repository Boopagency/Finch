import { PageHeader } from "@/components/ui/page-header";
import { ImportView } from "@/features/finance/components/import-view";
import { createClient, requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Importar extrato" };

export default async function ImportPage() {
  await requireViewer();
  const { data } = await (await createClient()).from("fin_accounts").select("id, name, kind").is("archived_at", null).order("created_at");
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader back="/financas" title="Importar" meta="extrato do banco" />
      <ImportView accounts={data ?? []} />
    </main>
  );
}
