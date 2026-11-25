import { Dumbbell, HeartPulse, Home, Images, ShoppingBasket, Sparkles, Target, Utensils, Wallet, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Vida" };

// Áreas da vida. Cada uma vira link quando o módulo ficar pronto.
const areas = [
  { label: "Hábitos", Icon: Sparkles, tone: "bg-sunflower text-on-color", stage: 2 },
  { label: "Mercado", Icon: ShoppingBasket, tone: "bg-frog text-on-color", stage: 2 },
  { label: "Finanças", Icon: Wallet, tone: "bg-coral text-on-color", stage: 3 },
  { label: "Treino", Icon: Dumbbell, tone: "bg-ink text-bg", stage: 4 },
  { label: "Saúde", Icon: HeartPulse, tone: "bg-cobalt text-on-cobalt", stage: 4 },
  { label: "Casa", Icon: Home, tone: "bg-tangerine text-on-color", stage: 5 },
  { label: "Alimentação", Icon: Utensils, tone: "bg-frog text-on-color", stage: 5 },
  { label: "Nós", Icon: Users, tone: "bg-lavender text-on-color", stage: 6 },
  { label: "Metas", Icon: Target, tone: "bg-sunflower text-on-color", stage: 6 },
  { label: "Álbum", Icon: Images, tone: "bg-coral text-on-color", stage: 2 },
] as const;

export default function LifePage() {
  return (
    <main className="mx-auto max-w-2xl px-gutter pt-safe">
      <PageHeader title="Vida" meta="áreas da rotina" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {areas.map(({ label, Icon, tone, stage }) => (
          <li key={label} className="flex min-h-32 flex-col justify-between rounded-[20px] bg-surface p-4">
            <span className={`grid size-10 place-items-center rounded-[12px] ${tone}`}>
              <Icon className="size-5" strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-[17px] font-semibold">{label}</span>
              <span className="text-[12px] text-ink-3">chega na Etapa {stage}</span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
