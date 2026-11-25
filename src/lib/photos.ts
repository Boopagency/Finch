"use client";

import { createClient } from "@/lib/supabase/client";

/**
 * Reduz a foto no aparelho (máx. 1600 px, JPEG) e envia para o bucket privado em "<espaço>/<uuid>.jpg".
 * Redesenhar no canvas descarta os metadados (EXIF: localização, aparelho). A RLS confere o espaço.
 */
export async function uploadPhoto(workspaceId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem.");
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Não consegui ler a imagem."))), "image/jpeg", 0.82));
  const path = `${workspaceId}/${crypto.randomUUID()}.jpg`;
  const { error } = await createClient().storage.from("photos").upload(path, blob, { contentType: "image/jpeg", upsert: false, cacheControl: "60" } /* foto apagada sai do cache do CDN em ~1 min */);
  if (error) throw new Error("Não consegui enviar a foto.");
  return path;
}
