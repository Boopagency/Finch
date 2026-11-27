import "server-only";
import { cache } from "react";
import { homeSpace } from "@/features/core/server/home-space";
import { signedPhotoUrls } from "@/features/core/server/photos";
import { todayFor } from "@/features/health/server/queries";
import { getSpaces } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { nextOccurrence } from "../couple";
import type { Care, Species } from "../pet";

export type SpecialDate = { id: string; title: string; on_date: string; yearly: boolean; next: { date: string; days: number; years: number } };
export type Place = { id: string; name: string; kind: string; status: string; rating: number | null; note: string | null; visited_on: string | null };
export type Memory = { id: string; title: string; body: string; happened_on: string; photo_path: string | null; photo_url: string | null };
export type Message = { id: string; author_id: string; body: string | null; photo_path: string | null; photo_url: string | null; created_at: string; edited_at: string | null; read_at: string | null };
export type Pet = { id: string; species: Species; name: string; love: number; cared_at: string; today_cares: number; feeds: { id: string; user_id: string; kind: Care; note: string | null; created_at: string }[] };

export type Goal = { id: string; workspace_id: string; title: string; target: number; current: number; unit: string | null; due_on: string | null; done_at: string | null };

export const getCouple = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const space = await homeSpace(viewer);
  const today = todayFor(viewer);
  const [{ data: dates }, { data: places }, { data: memories }] = await Promise.all([
    supabase.from("special_dates").select("id, title, on_date, yearly").eq("workspace_id", space.id),
    supabase.from("places").select("id, name, kind, status, rating, note, visited_on").eq("workspace_id", space.id).order("created_at", { ascending: false }),
    supabase.from("memories").select("id, title, body, happened_on, photo_path").eq("workspace_id", space.id).order("happened_on", { ascending: false }).limit(100),
  ]);
  const upcoming = (dates ?? [])
    .map((d) => ({ ...d, next: nextOccurrence(d.on_date, d.yearly, today) }))
    .filter((d): d is SpecialDate => d.next !== null)
    .sort((a, b) => a.next.days - b.next.days);
  return { space, today, dates: upcoming, places: (places ?? []) as Place[], memories: (memories ?? []).map((m) => ({ ...m, photo_url: null })) as Memory[] };
});

/** Só a tela de memórias gera links das fotos (o Hoje usa getCouple sem precisar delas). */
export async function withPhotoUrls(memories: Memory[]): Promise<Memory[]> {
  const urls = await signedPhotoUrls(memories.flatMap((m) => (m.photo_path ? [m.photo_path] : [])));
  return memories.map((m) => ({ ...m, photo_url: m.photo_path ? (urls.get(m.photo_path) ?? null) : null }));
}

/** Datas que chegam nos próximos `days` dias (para o Hoje). */
export async function getUpcomingDates(viewer: Viewer, days = 7) {
  return (await getCouple(viewer)).dates.filter((d) => d.next.days <= days);
}

export const getGoals = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const [spaces, { data }] = await Promise.all([
    getSpaces(viewer),
    supabase.from("goals").select("id, workspace_id, title, target, current, unit, due_on, done_at").order("done_at", { ascending: true, nullsFirst: true }).order("created_at"),
  ]);
  return {
    today: todayFor(viewer),
    spaces,
    goals: (data ?? []).map((g) => ({ ...g, target: Number(g.target), current: Number(g.current) })) as Goal[],
  };
});

/** Recados do casal (mais novo por último, como numa conversa) com link temporário das fotos. */
export const getMessages = cache(async (viewer: Viewer, limit = 200) => {
  const supabase = await createClient();
  const space = await homeSpace(viewer);
  if (space.kind !== "shared") return { space, messages: [] as Message[], unread: 0 };
  const { data } = await supabase
    .from("couple_messages")
    .select("id, author_id, body, photo_path, created_at, edited_at, read_at")
    .eq("workspace_id", space.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).reverse();
  const urls = await signedPhotoUrls(rows.flatMap((m) => (m.photo_path ? [m.photo_path] : [])));
  return {
    space,
    messages: rows.map((m) => ({ ...m, photo_url: m.photo_path ? (urls.get(m.photo_path) ?? null) : null })) as Message[],
    unread: rows.filter((m) => m.author_id !== viewer.id && !m.read_at).length,
  };
});

/** Quantos recados do outro estão por ler (o Hoje usa isso; não traz o conteúdo). */
export async function unreadCount(viewer: Viewer): Promise<number> {
  const space = await homeSpace(viewer);
  if (space.kind !== "shared") return 0;
  const { count } = await (await createClient())
    .from("couple_messages")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", space.id)
    .neq("author_id", viewer.id)
    .is("read_at", null);
  return count ?? 0;
}

/** O bichinho do espaço da casa, com os cuidados recentes (os de hoje definem o humor). */
export const getPet = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const space = await homeSpace(viewer);
  const { data: row } = await supabase.from("pets").select("id, species, name, love, cared_at").eq("workspace_id", space.id).maybeSingle();
  if (!row) return { space, pet: null };
  const { data: feeds } = await supabase
    .from("pet_feeds")
    .select("id, user_id, kind, note, created_at, local_date")
    .eq("pet_id", row.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const today = todayFor(viewer);
  return {
    space,
    pet: {
      ...row,
      species: row.species as Species,
      today_cares: (feeds ?? []).filter((f) => f.local_date === today).length,
      feeds: (feeds ?? []).slice(0, 12).map((f) => ({ id: f.id, user_id: f.user_id, note: f.note, created_at: f.created_at, kind: f.kind as Care })),
    } as Pet,
  };
});
