import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { todayFor } from "@/features/health/server/queries";
import { ListRealtime } from "@/features/shopping/components/realtime";
import { ShoppingList } from "@/features/shopping/components/shopping-list";
import { DeleteListButton } from "@/features/shopping/components/delete-list";
import { getList } from "@/features/shopping/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Lista" };

export default async function ListPage({ params, searchParams }: PageProps<"/mercado/[id]">) {
  const viewer = await requireViewer();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getList(viewer, id);
  if (!data) notFound();
  const superMode = sp.modo === "super";
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-3 px-gutter pt-safe">
      <PageHeader title={superMode ? "No mercado" : data.list.name} meta={data.list.status === "done" ? "finalizada" : undefined} />
      <ListRealtime listId={id} />
      <ShoppingList
        listId={id}
        serverItems={data.items}
        products={data.products}
        members={data.members}
        superMode={superMode}
        viewerId={viewer.id}
        today={todayFor(viewer)}
        budget={data.list.budget_cents}
      />
      {!superMode && <DeleteListButton id={id} name={data.list.name} />}
    </main>
  );
}
