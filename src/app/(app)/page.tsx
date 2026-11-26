import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CalendarDays, Check, Droplet, Settings } from "lucide-react";
import Link from "next/link";
import { countdownLabel } from "@/features/couple/couple";
import { getUpcomingDates } from "@/features/couple/server/queries";
import { isLow } from "@/features/kitchen/kitchen";
import { getKitchen } from "@/features/kitchen/server/queries";
import { alertText } from "@/features/home/home";
import { getHome } from "@/features/home/server/queries";
import { Avatar } from "@/components/ui/avatar";
import { getFaces } from "@/features/core/server/faces";
import { InstallHint } from "@/components/pwa/install-hint";
import { HabitList } from "@/features/health/components/habit-list";
import { WaterQuick } from "@/features/health/components/water-quick";
import { habitStatus } from "@/features/health/habits";
import { getHabits, getWaterToday, todayFor } from "@/features/health/server/queries";
import { formatWater } from "@/features/health/water";
import { getAlbumSummary } from "@/features/album/server/queries";
import { getAgenda } from "@/features/agenda/server/queries";
import { getLists } from "@/features/shopping/server/queries";
import { TaskList } from "@/features/tasks/components/task-list";
import { getTaskItems } from "@/features/tasks/server/queries";
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

  const [{ data: shared }, { count: devices }, { data: recent }, water, habitsData, tasksData, agenda, shopping, album, soonDates, kitchen, home, faces] = await Promise.all([
    supabase.from("workspaces").select("id, name, workspace_members(user_id, profiles(display_name))").eq("kind", "shared"),
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).is("revoked_at", null),
    supabase
      .from("notification_jobs")
      .select("id, title, body, sent_at, url")
      .eq("status", "sent")
      .neq("category", "test")
      .gte("sent_at", new Date(now.getTime() - 12 * 3600e3).toISOString())
      .order("sent_at", { ascending: false })
      .limit(10),
    getWaterToday(viewer),
    getHabits(viewer, 7),
    getTaskItems(viewer, 45),
    getAgenda(viewer, todayFor(viewer), todayFor(viewer)),
    getLists(viewer),
    getAlbumSummary(),
    getUpcomingDates(viewer, 7),
    getKitchen(viewer),
    getHome(viewer),
    getFaces(viewer),
  ]);
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const upcoming = agenda.events.filter((e) => !e.end || e.end > nowHm);
  const todayTasks = tasksData.items.filter((t) => t.date && t.date <= tasksData.today);
  const overdue = todayTasks.filter((t) => t.status !== "done" && t.date! < tasksData.today).length;
  const openToday = todayTasks.filter((t) => t.status !== "done").length;

  // Itens do dia: cada módulo contribui aqui (tarefas, contas e treino entram nas próximas etapas).
  const items: DayItem[] = [];
  const nextEvent = upcoming.find((e) => e.start && e.start !== "00:00");
  if (nextEvent) {
    items.push({ lead: "tem", highlight: nextEvent.event.title.toLowerCase(), tail: `às ${nextEvent.start}`, tone: "lavender", icon: "calendar", priority: 6 });
  }
  if (overdue > 0) {
    items.push({ lead: "tem", highlight: `${overdue} ${overdue === 1 ? "tarefa atrasada" : "tarefas atrasadas"}`, tone: "coral", icon: "check", priority: 5 });
  }
  if (openToday - overdue > 0) {
    const n = openToday - overdue;
    const only = todayTasks.find((t) => t.status !== "done" && t.date === tasksData.today);
    items.push(
      n === 1 && only
        ? { lead: "tem", highlight: only.title.toLowerCase(), tail: only.time ? `às ${only.time}` : undefined, tone: "sunflower", icon: "check", priority: 4 }
        : { lead: "tem", highlight: `${n} tarefas`, tone: "sunflower", icon: "check", priority: 4 },
    );
  }
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
  if (album.packs > 0) {
    bubbles.unshift({ key: "packs", title: "Álbum", text: album.packs === 1 ? "Tem um pacotinho de figurinhas esperando você." : `Tem ${album.packs} pacotinhos de figurinhas esperando você.`, tone: "coral", href: "/vida/album" });
  }
  for (const d of soonDates) {
    bubbles.unshift({ key: `date-${d.id}`, title: d.title, text: d.next.days === 0 ? `É hoje${d.next.years ? `: ${d.next.years} ${d.next.years === 1 ? "ano" : "anos"}` : ""}!` : `${countdownLabel(d.next.days)[0]!.toUpperCase()}${countdownLabel(d.next.days).slice(1)}.`, tone: "lavender", href: "/vida/nos" });
  }
  const dinner = kitchen.meals.find((m) => m.day === kitchen.today && m.slot === "jantar");
  if (dinner) bubbles.push({ key: "dinner", title: "Jantar de hoje", text: dinner.title, tone: "tangerine", href: "/vida/cozinha?v=cardapio" });
  for (const a of home.alerts) bubbles.push({ key: `home-${a.item_id}-${a.kind}`, title: a.name, text: `${alertText(a)[0]!.toUpperCase()}${alertText(a).slice(1)}.`, tone: a.kind === "overdue" ? "coral" : "tangerine", href: "/vida/casa" });
  const low = kitchen.pantry.filter(isLow).length;
  if (low) bubbles.push({ key: "pantry", title: "Despensa", text: low === 1 ? "1 item abaixo do mínimo." : `${low} itens abaixo do mínimo.`, tone: "sunflower", href: "/vida/cozinha" });
  for (const l of shopping.lists.filter((x) => x.pending > 0)) {
    bubbles.push({ key: `list-${l.id}`, title: l.name, text: `${l.pending} ${l.pending === 1 ? "item" : "itens"} para comprar.`, tone: "frog", href: `/mercado/${l.id}` });
  }
  // avisos recentes sem repetição (o mesmo lembrete de água três vezes não ajuda)
  const seenTitles = new Set<string>();
  for (const n of (recent ?? []).filter((x) => !seenTitles.has(x.title) && seenTitles.add(x.title)).slice(0, 2)) {
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
          {faces.partner && (
            <Link prefetch href="/vida/nos" aria-label="Nós" className="press flex -space-x-2.5">
              <Avatar name={faces.me.name} url={faces.me.url} size={40} className="ring-2 ring-[var(--stage)]" />
              <Avatar name={faces.partner.name} url={faces.partner.url} size={40} className="ring-2 ring-[var(--stage)]" />
            </Link>
          )}
          <Link prefetch href="/ajustes" aria-label="Ajustes" className="press grid size-10 place-items-center rounded-full bg-white/10">
            <Settings className="size-5" />
          </Link>
        </div>
      </header>

      <p className="sentence max-w-xl px-gutter pb-8 pt-6 font-display text-[26px] font-semibold leading-[1.28] tracking-[-0.02em] text-stage-muted">
        {sentence.map((s, i) =>
          s.sticker ? (
            <span key={i} style={{ animationDelay: `${i * 45}ms` }} className={`sticker mx-1 inline-grid h-7 w-9 -rotate-6 place-items-center rounded-[9px] align-[-4px] ${toneBg[s.sticker.tone]}`}>
              {s.sticker.icon === "drop" ? (
                <Droplet className="size-4" strokeWidth={2.6} />
              ) : s.sticker.icon === "calendar" ? (
                <CalendarDays className="size-4" strokeWidth={2.6} />
              ) : (
                <Check className="size-4" strokeWidth={3} />
              )}
            </span>
          ) : (
            <span key={i} style={{ animationDelay: `${i * 45}ms` }} className={s.strong ? "text-stage-ink" : undefined}>
              {s.text}
            </span>
          ),
        )}
      </p>

      <InstallHint />

      <section aria-labelledby="casal" className="min-h-[50dvh] rounded-t-[28px] bg-bg px-4 pb-6 pt-5 text-ink">
        <div className="mx-auto flex max-w-xl flex-col gap-3">
          {upcoming.length > 0 && (
            <ul aria-label="Agenda de hoje" className="flex flex-col gap-1.5">
              {upcoming.map((e) => (
                <li key={e.key}>
                  <Link prefetch href="/agenda" className="flex items-center gap-3 rounded-[18px] bg-surface px-4 py-3">
                    <span className="tabular w-11 text-[13px] font-bold text-ink-2">{e.start && e.start !== "00:00" ? e.start : "dia"}</span>
                    <span className="flex-1 truncate text-[15px] font-semibold">{e.event.title}</span>
                    <CalendarDays className="size-4 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {todayTasks.length > 0 && (
            <>
              <TaskList
                items={[...todayTasks].sort((a, b) => Number(a.status === "done") - Number(b.status === "done")).slice(0, 6)}
                spaces={tasksData.spaces}
                today={tasksData.today}
                group={overdue > 0}
              />
              {todayTasks.length > 6 && (
                <Link prefetch href="/tarefas" className="px-2 text-[13px] font-semibold text-ink-3">
                  Ver todas as {todayTasks.length} tarefas de hoje →
                </Link>
              )}
            </>
          )}
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
              <Link key={b.key} prefetch href={b.href} className="press block">
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
