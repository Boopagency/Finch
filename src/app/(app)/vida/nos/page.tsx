import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { DatesView, MemoriesView, PlacesView } from "@/features/couple/components/couple-views";
import { MessagesView } from "@/features/couple/components/messages-view";
import { PetView } from "@/features/couple/components/pet-view";
import { mood } from "@/features/couple/pet";
import { getCouple, getMessages, getPet, withPhotoUrls } from "@/features/couple/server/queries";
import { Avatar } from "@/components/ui/avatar";
import { getFaces } from "@/features/core/server/faces";
import { CoverButton } from "@/features/couple/components/cover-button";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Nós" };

const TABS = [["recados", "Recados"], ["bichinho", "Bichinho"], ["datas", "Datas"], ["lugares", "Lugares"], ["memorias", "Memórias"]] as const;
type Tab = (typeof TABS)[number][0];

export default async function CouplePage({ searchParams }: PageProps<"/vida/nos">) {
  const viewer = await requireViewer();
  const v = (await searchParams).v;
  const tab: Tab = TABS.some(([k]) => k === v) ? (v as Tab) : "recados";
  const [c, faces, chat, { pet }] = await Promise.all([getCouple(viewer), getFaces(viewer), getMessages(viewer), getPet(viewer)]);
  const memories = await withPhotoUrls(c.memories);
  const shared = c.space.kind === "shared";
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader back="/vida" title="Nós" meta={shared ? "de vocês dois" : "convide alguém em Ajustes"} />
      {faces.sharedId && (
        <div className="relative overflow-hidden rounded-[24px] bg-lavender">
          {faces.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário
            <img src={faces.cover} alt="Foto do casal" className="aspect-[16/9] w-full object-cover" />
          ) : (
            <div className="aspect-[16/9] w-full" />
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-black/55 to-transparent p-4 pt-12">
            <div className="flex -space-x-3">
              <Avatar name={faces.me.name} url={faces.me.url} size={44} className="ring-2 ring-white" />
              {faces.partner && <Avatar name={faces.partner.name} url={faces.partner.url} size={44} className="ring-2 ring-white" />}
            </div>
            <CoverButton spaceId={faces.sharedId} has={!!faces.cover} />
          </div>
        </div>
      )}
      <Tabs
        label="Seções"
        path="/vida/nos"
        initial={tab}
        options={TABS.map(([key, label]) => ({ value: key, label: key === "recados" && chat.unread > 0 ? `${label} (${chat.unread})` : label }))}
        panels={{
          recados: (
            <MessagesView
              messages={chat.messages}
              me={{ id: viewer.id, name: faces.me.name, url: faces.me.url }}
              partner={faces.partner}
              spaceId={c.space.id}
              today={c.today}
              shared={shared}
            />
          ),
          bichinho: <PetView pet={pet} petMood={pet ? mood(pet.cared_at, pet.today_cares) : "feliz"} canShare={shared} />,
          datas: <DatesView dates={c.dates} today={c.today} />,
          lugares: <PlacesView places={c.places} />,
          memorias: <MemoriesView memories={memories} today={c.today} spaceId={c.space.id} />,
        }}
      />
    </main>
  );
}
