import "server-only";
import { getSpaces } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";

export type StickerDef = { code: string; page_code: string; name: string; icon: string; rarity: "comum" | "rara" | "especial"; achievement: string | null; position: number };
export type Item = { id: string; owner_id: string; sticker_code: string; pasted_at: string | null };
export type Album = {
  pages: { code: string; name: string; tone: string }[];
  stickers: StickerDef[];
  mine: Item[];
  partnerItems: Item[];
  partner: { id: string; name: string } | null;
  packs: string[];
  points: number;
  rules: { key: string; label: string; points: number; daily_cap: number }[];
  trades: { id: string; from_user: string; to_user: string; give_code: string; want_code: string | null; give_item: string; want_item: string | null }[];
};

/** Estado do álbum. `album_refresh` garante pacote de boas-vindas e conquistas em dia. */
export async function getAlbum(viewer: Viewer): Promise<Album> {
  const supabase = await createClient();
  await supabase.rpc("album_refresh");
  const [pages, stickers, items, packs, xp, rules, trades, spaces] = await Promise.all([
    supabase.from("sticker_pages").select("code, name, tone").order("position"),
    supabase.from("stickers").select("code, page_code, name, icon, rarity, achievement, position").order("position"),
    supabase.from("sticker_items").select("id, owner_id, sticker_code, pasted_at"),
    supabase.from("sticker_packs").select("id").is("opened_at", null).order("created_at"),
    supabase.from("xp_events").select("points").is("revoked_at", null),
    supabase.from("xp_rules").select("key, label, points, daily_cap").order("points"),
    supabase.from("sticker_trades").select("id, from_user, to_user, give_item, want_item").eq("status", "pending"),
    getSpaces(viewer),
  ]);
  const all = (items.data ?? []) as Item[];
  const codeOf = new Map(all.map((i) => [i.id, i.sticker_code]));
  const partner = spaces.find((s) => s.kind === "shared")?.members.find((m) => m.id !== viewer.id) ?? null;
  return {
    pages: pages.data ?? [],
    stickers: (stickers.data ?? []) as StickerDef[],
    mine: all.filter((i) => i.owner_id === viewer.id),
    partnerItems: all.filter((i) => i.owner_id !== viewer.id),
    partner,
    packs: (packs.data ?? []).map((p) => p.id),
    points: (xp.data ?? []).reduce((n, e) => n + e.points, 0),
    rules: rules.data ?? [],
    trades: (trades.data ?? []).map((t) => ({ ...t, give_code: codeOf.get(t.give_item) ?? "?", want_code: t.want_item ? (codeOf.get(t.want_item) ?? "?") : null })),
  };
}

/** Resumo leve para o Hoje. */
export async function getAlbumSummary() {
  const supabase = await createClient();
  const { count } = await supabase.from("sticker_packs").select("id", { count: "exact", head: true }).is("opened_at", null);
  return { packs: count ?? 0 };
}
