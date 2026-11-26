import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { SessionRunner } from "@/features/training/components/session-runner";
import { getSession } from "@/features/training/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Treino" };

export default async function SessionPage({ params }: PageProps<"/vida/treino/[id]">) {
  await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const data = await getSession(id);
  if (!data) notFound();
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2 px-gutter pt-safe">
      <PageHeader back="/vida/treino" title={data.session.name} meta={data.session.finished_at ? "concluído" : undefined} />
      <SessionRunner session={data.session} plan={data.plan} serverSets={data.sets} previousBest={data.previousBest} exercises={data.exercises} />
    </main>
  );
}
