import { PageHeader } from "@/components/ui/page-header";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { isFuture } from "@/lib/time";
import { CoupleSection } from "./couple-section";
import { LogoutButton } from "./logout-button";
import { ProfileForm, QuietForm } from "./forms";
import { PushManager } from "./push-manager";

export const metadata = { title: "Ajustes" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="flex scroll-mt-6 flex-col gap-4 rounded-[24px] bg-surface p-5">
      <h2 id={`${id}-t`} className="font-display text-[22px] font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: settings }, { data: shared }, { data: devices }] = await Promise.all([
    supabase.from("user_settings").select("quiet_start, quiet_end").eq("user_id", viewer.id).single(),
    supabase
      .from("workspaces")
      .select("id, name, workspace_members(user_id, role, profiles(display_name)), invitations(id, invited_email, expires_at, accepted_at, revoked_at)")
      .eq("kind", "shared")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id, device_label, created_at, last_success_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const space = shared && {
    id: shared.id,
    name: shared.name,
    members: shared.workspace_members.map((m) => ({
      id: m.user_id,
      name: (m.profiles as { display_name: string } | null)?.display_name ?? "",
      me: m.user_id === viewer.id,
    })),
    pending: shared.invitations
      .filter((i) => !i.accepted_at && !i.revoked_at && isFuture(i.expires_at))
      .map((i) => ({ id: i.id, email: i.invited_email, expires_at: i.expires_at })),
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Ajustes" meta={viewer.email} />
      <Section id="perfil" title="Você">
        <ProfileForm name={viewer.name} tz={viewer.tz} />
      </Section>
      <Section id="lembretes" title="Lembretes">
        <PushManager devices={devices ?? []} />
        <QuietForm start={settings?.quiet_start.slice(0, 5) ?? "22:00"} end={settings?.quiet_end.slice(0, 5) ?? "07:30"} />
      </Section>
      <Section id="casal" title="Nós dois">
        <CoupleSection space={space ?? null} />
      </Section>
      <LogoutButton />
    </main>
  );
}
