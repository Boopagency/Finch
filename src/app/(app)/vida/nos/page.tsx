import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { DatesView, MemoriesView, PlacesView } from "@/features/couple/components/couple-views";
import { getCouple } from "@/features/couple/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Nós" };

const TABS = [["datas", "Datas"], ["lugares", "Lugares"], ["memorias", "Memórias"]] as const;

export default async function CouplePage({ searchParams }: PageProps<"/vida/nos">) {
  const viewer = await requireViewer();
  const v = (await searchParams).v;
  const tab = TABS.some(([k]) => k === v) ? (v as string) : "datas";
  const c = await getCouple(viewer);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Nós" meta={c.space.kind === "shared" ? "de vocês dois" : "convide alguém em Ajustes"} />
      <nav aria-label="Seções de Nós" className="flex gap-1 rounded-full bg-surface-2 p-1">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/vida/nos?v=${key}`} replace aria-current={tab === key ? "page" : undefined}
            className={`flex min-h-10 flex-1 items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${tab === key ? "bg-surface shadow-sm" : "text-ink-2"}`}>
            {label}
          </Link>
        ))}
      </nav>
      {tab === "datas" && <DatesView dates={c.dates} today={c.today} />}
      {tab === "lugares" && <PlacesView places={c.places} />}
      {tab === "memorias" && <MemoriesView memories={c.memories} today={c.today} />}
    </main>
  );
}
