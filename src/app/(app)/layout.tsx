import { TabBar } from "@/components/nav/tab-bar";
import { requireViewer } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireViewer();
  return (
    <>
      <div className="pb-[calc(96px+env(safe-area-inset-bottom,0px))]">{children}</div>
      <TabBar />
    </>
  );
}
