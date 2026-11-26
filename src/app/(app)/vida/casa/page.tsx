import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { HomeView } from "@/features/home/components/home-view";
import { getHome } from "@/features/home/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Casa" };

export default async function HomePage() {
  const viewer = await requireViewer();
  const h = await getHome(viewer, true);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Casa" meta={<Link prefetch href="/tarefas?v=casa" className="font-semibold text-ink-2 underline">rotina da casa →</Link>} />
      <HomeView items={h.items} alerts={h.alerts} today={h.today} spaceId={h.space.id} />
    </main>
  );
}
