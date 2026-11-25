import { TabBar } from "@/components/nav/tab-bar";
import { SyncAgent } from "@/components/sync/sync-agent";
import { Toaster } from "@/components/ui/toast";
import { getHabits, getWaterToday } from "@/features/health/server/queries";
import { getLists } from "@/features/shopping/server/queries";
import { getSpaces } from "@/features/tasks/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await requireViewer();
  const [water, habits, spaces, shopping] = await Promise.all([getWaterToday(viewer), getHabits(viewer, 7), getSpaces(viewer), getLists(viewer)]);
  return (
    <>
      <div className="pb-[calc(96px+env(safe-area-inset-bottom,0px))]">{children}</div>
      <TabBar
        quick={{
          today: water.today,
          water: { logs: water.logs, goal: water.settings.water_goal_ml, presets: water.settings.water_presets },
          habits: habits.habits,
          habitLogs: habits.logs,
          spaces: spaces.map(({ id, kind, name }) => ({ id, kind, name })),
          shoppingList: shopping.lists[0] ? { id: shopping.lists[0].id, name: shopping.lists[0].name } : null,
        }}
      />
      <SyncAgent />
      <Toaster />
    </>
  );
}
