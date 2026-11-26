import { CheckSquare, Droplet, Dumbbell, HeartPulse, Home, Images, ShoppingBasket, Sparkles, Target, Users, Utensils, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Vida" };

// Áreas da vida.
const areas = [
  { label: "Tarefas", Icon: CheckSquare, tone: "bg-sunflower text-on-color", href: "/tarefas" },
  { label: "Casa", Icon: Home, tone: "bg-tangerine text-on-color", href: "/vida/casa" },
  { label: "Água", Icon: Droplet, tone: "bg-cobalt text-on-cobalt", href: "/vida/agua" },
  { label: "Hábitos", Icon: Sparkles, tone: "bg-sunflower text-on-color", href: "/vida/habitos" },
  { label: "Mercado", Icon: ShoppingBasket, tone: "bg-frog text-on-color", href: "/mercado" },
  { label: "Álbum", Icon: Images, tone: "bg-coral text-on-color", href: "/vida/album" },
  { label: "Finanças", Icon: Wallet, tone: "bg-coral text-on-color", href: "/financas" },
  { label: "Treino", Icon: Dumbbell, tone: "bg-ink text-bg", href: "/vida/treino" },
  { label: "Saúde", Icon: HeartPulse, tone: "bg-cobalt text-on-cobalt", href: "/vida/saude" },
  { label: "Cozinha", Icon: Utensils, tone: "bg-frog text-on-color", href: "/vida/cozinha" },
  { label: "Nós", Icon: Users, tone: "bg-lavender text-on-color", href: "/vida/nos" },
  { label: "Metas", Icon: Target, tone: "bg-sunflower text-on-color", href: "/vida/metas" },
] as const;

export default function LifePage() {
  return (
    <main className="mx-auto max-w-2xl px-gutter pt-safe">
      <PageHeader title="Vida" meta="áreas da rotina" />
      <ul className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
        {areas.map((a) => (
          <li key={a.label}>
            <Link href={a.href} prefetch className="press flex min-h-32 flex-col justify-between rounded-[20px] bg-surface p-4">
              <span className={`grid size-10 place-items-center rounded-[12px] ${a.tone}`}>
                <a.Icon className="size-5" strokeWidth={2.2} />
              </span>
              <span className="block text-[17px] font-semibold">{a.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
