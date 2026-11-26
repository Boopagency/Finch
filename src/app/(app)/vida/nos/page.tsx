import { Segmented } from "@/components/ui/segmented";
import { PageHeader } from "@/components/ui/page-header";
import { DatesView, MemoriesView, PlacesView } from "@/features/couple/components/couple-views";
import { getCouple, withPhotoUrls } from "@/features/couple/server/queries";
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
      <Segmented
        label="Seções"
        value={tab}
        options={TABS.map(([key, label]) => ({ value: key as string, label, href: `/vida/nos?v=${key}` }))}
      />
      {tab === "datas" && <DatesView dates={c.dates} today={c.today} />}
      {tab === "lugares" && <PlacesView places={c.places} />}
      {tab === "memorias" && <MemoriesView memories={await withPhotoUrls(c.memories)} today={c.today} spaceId={c.space.id} />}
    </main>
  );
}
