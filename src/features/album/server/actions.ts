"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, requireViewer } from "@/lib/supabase/server";

type Result = { ok: boolean; message: string };
const ERR: Record<string, string> = {
  "already pasted": "Você já colou essa.",
  "pasted items cannot be given": "Figurinha colada não pode sair do álbum.",
  "invalid recipient": "Só dá para dar para quem divide o espaço Nós com você.",
  "stickers no longer available": "Uma das figurinhas não está mais disponível.",
};
const msg = (e: { message: string } | null, ok: string): Result => (e ? { ok: false, message: ERR[e.message] ?? "Não deu certo. Tente de novo." } : { ok: true, message: ok });

export async function openPack(packId: string): Promise<{ codes: string[]; ids: string[] }> {
  await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("album_open_pack", { p_pack: z.uuid().parse(packId) });
  if (error || !data) throw new Error("Não consegui abrir o pacotinho.");
  revalidatePath("/vida/album");
  return { codes: data.map((i) => i.sticker_code), ids: data.map((i) => i.id) };
}

export async function pasteItems(ids: string[]): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  let pasted = 0;
  for (const id of z.array(z.uuid()).max(100).parse(ids)) {
    const { error } = await supabase.rpc("album_paste", { p_item: id });
    if (!error) pasted++;
  }
  revalidatePath("/vida/album");
  revalidatePath("/", "layout");
  return { ok: pasted > 0, message: pasted ? `${pasted} ${pasted === 1 ? "figurinha colada" : "figurinhas coladas"}` : "Nada novo para colar." };
}

export async function giftItem(itemId: string, to: string): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("album_gift", { p_item: z.uuid().parse(itemId), p_to: z.uuid().parse(to) });
  revalidatePath("/vida/album");
  return msg(error, "Presente enviado.");
}

export async function proposeTrade(give: string, want: string): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("album_propose_trade", { p_give: z.uuid().parse(give), p_want: z.uuid().parse(want) });
  revalidatePath("/vida/album");
  return msg(error, "Proposta de troca enviada.");
}

export async function answerTrade(id: string, accept: boolean): Promise<Result> {
  await requireViewer();
  const supabase = await createClient();
  const { error } = await supabase.rpc("album_answer_trade", { p_trade: z.uuid().parse(id), p_accept: accept });
  revalidatePath("/vida/album");
  return msg(error, accept ? "Troca feita." : "Proposta recusada.");
}
