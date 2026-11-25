import "server-only";
import { createClient } from "@/lib/supabase/server";

export const PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** Links temporários (1 h) para fotos do bucket privado; a RLS decide quais saem. */
export async function signedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  if (!paths.length) return new Map();
  const { data } = await (await createClient()).storage.from("photos").createSignedUrls(paths, 3600);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

export async function removePhoto(path: string | null | undefined) {
  if (path && PHOTO_PATH.test(path)) await (await createClient()).storage.from("photos").remove([path]);
}
