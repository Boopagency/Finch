import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { MealPlanView } from "@/features/kitchen/components/meal-plan-view";
import { PantryView } from "@/features/kitchen/components/pantry-view";
import { RecipesView } from "@/features/kitchen/components/recipes-view";
import { isLow } from "@/features/kitchen/kitchen";
import { getKitchen } from "@/features/kitchen/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Cozinha" };

const TABS = [["despensa", "Despensa"], ["receitas", "Receitas"], ["cardapio", "Cardápio"]] as const;

export default async function KitchenPage({ searchParams }: PageProps<"/vida/cozinha">) {
  const viewer = await requireViewer();
  const v = (await searchParams).v;
  const tab = TABS.some(([k]) => k === v) ? (v as string) : "despensa";
  const k = await getKitchen(viewer);
  const low = k.pantry.filter(isLow).length;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Cozinha" meta={k.space.kind === "shared" ? "de vocês dois" : undefined} />
      <nav aria-label="Seções da cozinha" className="flex gap-1 rounded-full bg-surface-2 p-1">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/vida/cozinha?v=${key}`}
            replace
            aria-current={tab === key ? "page" : undefined}
            className={`flex min-h-10 flex-1 items-center justify-center rounded-full text-[14px] font-semibold transition-colors ${tab === key ? "bg-surface shadow-sm" : "text-ink-2"}`}
          >
            {label}{key === "despensa" && low > 0 ? ` · ${low}` : ""}
          </Link>
        ))}
      </nav>
      {tab === "despensa" && <PantryView pantry={k.pantry} today={k.today} />}
      {tab === "receitas" && <RecipesView recipes={k.recipes} />}
      {tab === "cardapio" && <MealPlanView week={k.week} today={k.today} meals={k.meals} recipes={k.recipes} />}
    </main>
  );
}
