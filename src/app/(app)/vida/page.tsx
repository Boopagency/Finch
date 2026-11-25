import { CheckSquare, Droplet, Dumbbell, HeartPulse, Home, Images, ShoppingBasket, Sparkles, Target, Users, Utensils, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Vida" };

// Áreas da vida. `href` liga quando o módulo existe; o resto mostra a etapa prevista.
const areas = [
  { label: "Tarefas", Icon: CheckSquare, tone: "bg-sunflower text-on-color", href: "/tarefas" },
  { label: "Casa", Icon: Home, tone: "bg-tangerine text-on-color", href: "/tarefas?v=casa" },
  { label: "Água", Icon: Droplet, tone: "bg-cobalt text-on-cobalt", href: "/vida/agua" },
  { label: "Hábitos", Icon: Sparkles, tone: "bg-sunflower text-on-color", href: "/vida/habitos" },
  { label: "Mercado", Icon: ShoppingBasket, tone: "bg-frog text-on-color", href: "/mercado" },
  { label: "Álbum", Icon: Images, tone: "bg-coral text-on-color", href: "/vida/album" },
  { label: "Finanças", Icon: Wallet, tone: "bg-coral text-on-color", href: "/financas" },
  { label: "Treino", Icon: Dumbbell, tone: "bg-ink text-bg", stage: 4 },
  { label: "Saúde", Icon: HeartPulse, tone: "bg-cobalt text-on-cobalt", stage: 4 },
  { label: "Alimentação", Icon: Utensils, tone: "bg-frog text-on-color", stage: 5 },
  { label: "Nós", Icon: Users, tone: "bg-lavender text-on-color", stage: 6 },
  { label: "Metas", Icon: Target, tone: "bg-sunflower text-on-color", stage: 6 },
] as const;

export default function LifePage() {
  return (
    <main className="mx-auto max-w-2xl px-gutter pt-safe">
      <PageHeader title="Vida" meta="áreas da rotina" />
      <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
        {areas.map((a) => {
          const body = (
            <>
              <span className={`grid size-10 place-items-center rounded-[12px] ${a.tone} ${"href" in a ? "" : "opacity-50"}`}>
                <a.Icon className="size-5" strokeWidth={2.2} />
              </span>
              <span>
                <span className={`block text-[17px] font-semibold ${"href" in a ? "" : "text-ink-2"}`}>{a.label}</span>
                <span className="text-[12px] text-ink-3">{"href" in a ? "abrir" : `chega na Etapa ${a.stage}`}</span>
              </span>
            </>
          );
          return (
            <li key={a.label}>
              {"href" in a ? (
                <Link href={a.href} className="press flex min-h-32 flex-col justify-between rounded-[20px] bg-surface p-4">
                  {body}
                </Link>
              ) : (
                <div className="flex min-h-32 flex-col justify-between rounded-[20px] bg-surface/60 p-4">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
