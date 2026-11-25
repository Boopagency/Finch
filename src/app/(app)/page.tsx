import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, Check, Droplet, Settings } from "lucide-react";
import Link from "next/link";
import { InstallHint } from "@/components/pwa/install-hint";
import { HabitList } from "@/features/health/components/habit-list";
import { WaterQuick } from "@/features/health/components/water-quick";
import { habitStatus } from "@/features/health/habits";
import { getHabits, getWaterToday } from "@/features/health/server/queries";
import { formatWater } from "@/features/health/water";
import { buildSentence, type DayItem, type Tone } from "@/features/today/sentence";
import { createClient, requireViewer } from "@/lib/supabase/server";
import { nowIn } from "@/lib/time";

export const metadata = { title: "Hoje" };

const toneBg: Record<Tone, string> = {
  coral: "bg-coral text-on-color",
  sunflower: "bg-sunflower text-on-color",
  tangerine: "bg-tangerine text-on-color",
  cobalt: "bg-cobalt text-on-cobalt",
  lavender: "bg-lavender text-on-color",
  frog: "bg-frog text-on-color",
};

type Bubble = { key: string; title: string; text: string; tone: Tone; href?: string };

export default async function TodayPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const now = nowIn(viewer.tz);

  const [{ data: shared }, { count: devices }, { data: recent }, water, habitsData] = await Promise.all([
    supabase.from("workspaces").select("id, name, workspace_members(user_id, profiles(display_name))").eq("kind", "shared"),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).is("revoked_at", null),
    supabase
      .from("notification_jobs")
      .select("id, title, body, sent_at, url")
      .eq("status", "sent")
      .neq("category", "test")
      .order("sent_at", { ascending: false })
      .limit(3),
    getWaterToday(viewer),
    getHabits(viewer, 7),
  ]);

  // Itens do dia: cada módulo contribui aqui (tarefas, contas e treino entram nas próximas etapas).
  const items: DayItem[] = [];
  const waterTotal = water.logs.reduce((n, l) => n + l.amount_ml, 0);
  const waterGoal = water.settings.water_goal_ml;
  if (waterTotal < waterGoal) {
    items.push({ lead: "faltam", highlight: `${formatWater(waterGoal - waterTotal)} de água`, tone: "cobalt", icon: "drop", priority: 2 });
  }
  const pendingHabits = habitsData.habits.filter((h) => {
    const s = habitStatus(h, habitsData.logs, habitsData.today);
    return s.scheduled && !s.done && h.period === "day";
  });
  if (pendingHabits.length === 1) {
    items.push({ lead: "falta", highlight: pendingHabits[0]!.name, tone: pendingHabits[0]!.tone as Tone, icon: "check", priority: 1 });
  } else if (pendingHabits.length > 1) {
    items.push({ lead: "você tem", highlight: `${pendingHabits.length} hábitos`, tail: "para marcar", tone: "sunflower", icon: "check", priority: 1 });
  }
  const sentence = buildSentence(viewer.name, now.getHours(), items);

  const space = shared?.[0];
  const partners = (space?.workspace_members ?? [])
    .filter((m) => m.user_id !== viewer.id)
    .map((m) => (m.profiles as { display_name: string } | null)?.display_name ?? "");

  const bubbles: Bubble[] = [];
  if (!space) {
    bubbles.push({ key: "space", title: "Nós", text: "Crie o espaço de vocês dois e mande o convite.", tone: "coral", href: "/ajustes#casal" });
  } else if (partners.length === 0) {
    bubbles.push({ key: "invite", title: "Nós", text: "O espaço está pronto. Falta o convite ser aceito.", tone: "sunflower", href: "/ajustes#casal" });
  } else {
    bubbles.push({ key: "linked", title: space.name, text: `Você e ${partners.join(", ")} estão conectados.`, tone: "lavender" });
  }
  if (!devices) {
    bubbles.push({ key: "push", title: "Lembretes", text: "Ative os lembretes neste iPhone para o Finch te chamar.", tone: "cobalt", href: "/ajustes#lembretes" });
  }
  for (const n of recent ?? []) {
    bubbles.push({ key: n.id, title: n.title, text: n.body, tone: "frog", href: n.url });
  }

  return (
    <div className="min-h-dvh bg-stage text-stage-ink">
      <header className="flex items-start justify-between px-gutter pt-[calc(env(safe-area-inset-top,0px)+16px)]">
        <h1 className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em]">Hoje</h1>
        <div className="flex items-start gap-3">
          <p className="pt-1 text-right text-[13px] leading-tight text-stage-muted">
            <span className="font-semibold text-stage-ink before:mr-1.5 before:inline-block before:size-[7px] before:rounded-full before:bg-coral before:align-middle before:content-['']">
              {format(now, "d 'de' MMM", { locale: ptBR })}
            </span>
            <br />
            {format(now, "EEEE", { locale: ptBR })}
          </p>
          <Link href="/ajustes" aria-label="Ajustes" className="grid size-10 place-items-center rounded-full bg-white/10">
            <Settings className="size-5" />
          </Link>
        </div>
      </header>

      <p className="max-w-xl px-gutter pb-8 pt-6 font-display text-[26px] font-semibold leading-[1.28] tracking-[-0.02em] text-stage-muted">
        {sentence.map((s, i) =>
          s.sticker ? (
            <span key={i} className={`mx-1 inline-grid h-7 w-9 -rotate-6 place-items-center rounded-[9px] align-[-4px] ${toneBg[s.sticker.tone]}`}>
              {s.sticker.icon === "drop" ? <Droplet className="size-4" strokeWidth={2.6} /> : <Check className="size-4" strokeWidth={3} />}
            </span>
          ) : (
            <span key={i} className={s.strong ? "text-stage-ink" : undefined}>
              {s.text}
            </span>
          ),
        )}
      </p>

      <InstallHint />

      <section aria-labelledby="casal" className="min-h-[50dvh] rounded-t-[28px] bg-bg px-4 pb-6 pt-5 text-ink">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          <WaterQuick serverLogs={water.logs} goal={waterGoal} presets={water.settings.water_presets} />
          <HabitList habits={habitsData.habits} serverLogs={habitsData.logs} today={habitsData.today} onlyPendingToday />
          <div className="flex items-baseline justify-between px-2 pt-2">
            <h2 id="casal" className="text-[17px] font-bold">
              Pra você
            </h2>
            <span className="flex items-center gap-1 text-[12px] text-ink-3">
              <Bell className="size-3.5" /> {bubbles.length} {bubbles.length === 1 ? "novidade" : "novidades"}
            </span>
          </div>
          {bubbles.map((b, i) => {
            const body = (
              <div
                className={`relative rounded-[22px] px-4 py-3 after:absolute after:-bottom-1.5 after:size-3.5 after:rotate-45 after:rounded-[2px] after:bg-inherit after:content-[''] ${toneBg[b.tone]} ${i % 2 ? "after:right-6" : "after:left-6"}`}
              >
                <b className="block text-[14px]">{b.title}</b>
                <span className="text-[14px] leading-snug">{b.text}</span>
              </div>
            );
            return b.href ? (
              <Link key={b.key} href={b.href} className="block transition active:scale-[.98]">
                {body}
              </Link>
            ) : (
              <div key={b.key}>{body}</div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
