import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { Attachment } from "@/features/assistant/tools";
import { createClient, type Viewer } from "@/lib/supabase/server";

/**
 * Anexos da mensagem atual, à disposição das ferramentas que guardam foto (memória, item da casa, recado).
 * A foto só sobe para o bucket quando uma ferramenta realmente usa: anexo mandado "só para ver" não vira arquivo.
 */
const store = new AsyncLocalStorage<Attachment[]>();

export const withAttachments = <T>(files: Attachment[], fn: () => Promise<T>) => store.run(files, fn);
export const attachments = () => store.getStore() ?? [];

/** Lista para o modelo: ele escolhe pelo número, nunca por caminho de arquivo. */
export function attachmentList() {
  return attachments().map((a, i) => ({ anexo: i + 1, nome: a.name, tipo: a.type.startsWith("image/") ? "imagem" : a.type === "application/pdf" ? "pdf" : "texto" }));
}

export class NoAttachment extends Error {}

/**
 * Guarda o anexo `n` (1 = o primeiro) como foto do espaço e devolve o caminho.
 * Só imagem; a conversão para JPEG já foi feita no aparelho.
 */
export async function saveAttachmentPhoto(n: number | undefined, spaceId: string, viewer: Viewer): Promise<string | null> {
  if (n === undefined) return null;
  const files = attachments();
  const a = files[n - 1];
  if (!a) throw new NoAttachment(files.length ? `anexo ${n} não existe (há ${files.length})` : "a pessoa não anexou nenhuma foto nesta mensagem");
  if (!a.type.startsWith("image/")) throw new NoAttachment(`o anexo ${n} (${a.name}) não é uma imagem`);
  const bytes = Buffer.from(a.data, "base64");
  if (!bytes.length || bytes.length > 5_000_000) throw new NoAttachment("imagem vazia ou grande demais");
  const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
  const { error } = await (await createClient()).storage.from("photos").upload(path, bytes, { contentType: "image/jpeg", upsert: false });
  if (error) throw new NoAttachment("não consegui guardar a foto");
  void viewer; // a RLS do bucket já confere que o espaço é de quem está falando
  return path;
}
