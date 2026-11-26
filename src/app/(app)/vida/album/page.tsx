import { PageHeader } from "@/components/ui/page-header";
import { AlbumView } from "@/features/album/components/album-view";
import { getAlbum } from "@/features/album/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Álbum" };

export default async function AlbumPage() {
  const viewer = await requireViewer();
  const album = await getAlbum(viewer);
  const pasted = new Set(album.mine.filter((i) => i.pasted_at).map((i) => i.sticker_code)).size;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2 px-gutter pt-safe">
      <PageHeader back="/vida" title="Álbum" meta={`${pasted} de ${album.stickers.length}`} />
      <AlbumView album={album} />
    </main>
  );
}
