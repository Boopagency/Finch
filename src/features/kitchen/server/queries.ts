import "server-only";
import { cache } from "react";
import { todayFor } from "@/features/health/server/queries";
import { getSpaces } from "@/features/tasks/server/queries";
import { createClient, type Viewer } from "@/lib/supabase/server";
import { weekFrom, type PantryItem } from "../kitchen";

/** A cozinha mora no espaço da casa: "Nós" quando existe, senão o pessoal. */
export const kitchenSpace = cache(async (viewer: Viewer) => {
  const spaces = await getSpaces(viewer);
  return spaces.find((s) => s.kind === "shared") ?? spaces.find((s) => s.kind === "personal")!;
});

export type Recipe = { id: string; title: string; servings: number; prep_min: number | null; ingredients: string; steps: string };
export type Meal = { id: string; day: string; slot: string; recipe_id: string | null; title: string };

export const getKitchen = cache(async (viewer: Viewer) => {
  const supabase = await createClient();
  const space = await kitchenSpace(viewer);
  const today = todayFor(viewer);
  const week = weekFrom(today);
  const [{ data: pantry }, { data: recipes }, { data: meals }] = await Promise.all([
    supabase.from("pantry_items").select("id, name, qty, unit, min_qty, category, expires_on").eq("workspace_id", space.id).order("name"),
    supabase.from("recipes").select("id, title, servings, prep_min, ingredients, steps").eq("workspace_id", space.id).order("title"),
    supabase.from("meal_plan").select("id, day, slot, recipe_id, title").eq("workspace_id", space.id).gte("day", week[0]).lte("day", week[6]),
  ]);
  return {
    space,
    today,
    week,
    pantry: (pantry ?? []).map((p) => ({ ...p, qty: Number(p.qty), min_qty: Number(p.min_qty) })) as PantryItem[],
    recipes: (recipes ?? []) as Recipe[],
    meals: (meals ?? []) as Meal[],
  };
});
