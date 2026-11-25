import "server-only";
import { cache } from "react";
import { homeSpace } from "@/features/core/server/home-space";
import { signedPhotoUrls } from "@/features/core/server/photos";
import { todayFor } from "@/features/health/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { homeAlerts } from "../home";

export type HomeItem = {
  id: string; name: string; kind: string; bought_on: string | null; price_cents: number | null; warranty_until: string | null;
  notes: string | null; photo_path: string | null; photo_url?: string | null;
  maintenance: { id: string; done_on: string; description: string; cost_cents: number | null; next_on: string | null }[];
};

export const getHome = cache(async (viewer: Viewer, withPhotos = false) => {
  const supabase = await createClient();
  const space = await homeSpace(viewer);
  const { data } = await supabase
    .from("home_items")
    .select("id, name, kind, bought_on, price_cents, warranty_until, notes, photo_path, home_maintenance(id, done_on, description, cost_cents, next_on)")
    .eq("workspace_id", space.id)
    .order("name");
  const today = todayFor(viewer);
  let items: HomeItem[] = (data ?? []).map(({ home_maintenance, ...i }) => ({
    ...i,
    price_cents: i.price_cents === null ? null : Number(i.price_cents),
    maintenance: [...home_maintenance].map((m) => ({ ...m, cost_cents: m.cost_cents === null ? null : Number(m.cost_cents) })).sort((a, b) => b.done_on.localeCompare(a.done_on)),
  }));
  if (withPhotos) {
    const urls = await signedPhotoUrls(items.flatMap((i) => (i.photo_path ? [i.photo_path] : [])));
    items = items.map((i) => ({ ...i, photo_url: i.photo_path ? (urls.get(i.photo_path) ?? null) : null }));
  }
  const alerts = homeAlerts(items, items.flatMap((i) => i.maintenance.map((m) => ({ ...m, item_id: i.id }))), today);
  return { space, today, items, alerts };
});
