import { PageHeader } from "@/components/ui/page-header";
import { Tabs } from "@/components/ui/tabs";
import { MealPlanView } from "@/features/kitchen/components/meal-plan-view";
import { PantryView } from "@/features/kitchen/components/pantry-view";
import { RecipesView } from "@/features/kitchen/components/recipes-view";
import { isLow } from "@/features/kitchen/kitchen";
import { getKitchen } from "@/features/kitchen/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Cozinha" };

const TABS = [["despensa", "Despensa"], ["receitas", "Receitas"], ["cardapio", "Cardápio"]] as const;
type Tab = (typeof TABS)[number][0];

export default async function KitchenPage({ searchParams }: PageProps<"/vida/cozinha">) {
  const viewer = await requireViewer();
  const v = (await searchParams).v;
  const tab: Tab = TABS.some(([k]) => k === v) ? (v as Tab) : "despensa";
  const k = await getKitchen(viewer);
  const low = k.pantry.filter(isLow).length;
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader back="/vida" title="Cozinha" meta={k.space.kind === "shared" ? "de vocês dois" : undefined} />
      <Tabs
        label="Seções"
        path="/vida/cozinha"
        initial={tab}
        options={TABS.map(([key, label]) => ({ value: key, label: key === "despensa" && low > 0 ? `${label} · ${low}` : label }))}
        panels={{
          despensa: <PantryView pantry={k.pantry} today={k.today} />,
          receitas: <RecipesView recipes={k.recipes} />,
          cardapio: <MealPlanView week={k.week} today={k.today} meals={k.meals} recipes={k.recipes} />,
        }}
      />
    </main>
  );
}
