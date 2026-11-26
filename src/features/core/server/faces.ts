import "server-only";
import { cache } from "react";
import { getSpaces } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { signedPhotoUrls } from "./photos";

export type Face = { id: string; name: string; url: string | null };

/** Você, a outra pessoa do casal e a foto do casal, com links temporários. Uma ida ao Storage para tudo. */
export const getFaces = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const spaces = await getSpaces(viewer);
  const shared = spaces.find((s) => s.kind === "shared") ?? null;
  const personal = spaces.find((s) => s.kind === "personal") ?? null;
  const ids = [viewer.id, ...(shared?.members.map((m) => m.id).filter((id) => id !== viewer.id) ?? [])];
  const [{ data: people }, { data: ws }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, avatar_path").in("id", ids),
    shared ? supabase.from("workspaces").select("cover_path").eq("id", shared.id).single() : Promise.resolve({ data: null }),
  ]);
  const paths = [...(people ?? []).map((p) => p.avatar_path), ws?.cover_path].filter((p): p is string => !!p);
  const urls = await signedPhotoUrls(paths);
  const face = (id: string): Face => {
    const p = people?.find((x) => x.id === id);
    return { id, name: p?.display_name ?? "", url: p?.avatar_path ? (urls.get(p.avatar_path) ?? null) : null };
  };
  const partnerId = ids.find((id) => id !== viewer.id);
  return {
    me: face(viewer.id),
    partner: partnerId ? face(partnerId) : null,
    cover: ws?.cover_path ? (urls.get(ws.cover_path) ?? null) : null,
    sharedId: shared?.id ?? null,
    // a foto de perfil fica no espaço do casal (para a outra pessoa ver); sem casal, no pessoal
    avatarSpace: shared?.id ?? personal?.id ?? null,
  };
});
