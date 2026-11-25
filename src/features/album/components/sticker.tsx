import {
  AlarmClock, Apple, Bath, Bed, Bike, BookOpen, Brush, CakeSlice, Calculator, CalendarDays, Camera, Carrot, Cherry, Clapperboard, Coffee, Coins,
  CreditCard, Croissant, Droplet, Dumbbell, Egg, Footprints, Gem, Gift, Grape, Heart, HeartPulse, Hourglass, House, IceCreamCone, Key, Lamp,
  Landmark, Leaf, ListChecks, Map, Medal, MessageCircleHeart, Moon, Music, Pencil, PiggyBank, Pizza, Plane, Rainbow, Receipt, Rocket, Sandwich,
  ShoppingBasket, Sofa, Soup, Sparkles, Sprout, Sun, Tent, TrendingUp, Wallet, WashingMachine, Wine, Zap, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  AlarmClock, Apple, Bath, Bed, Bike, BookOpen, Brush, CakeSlice, Calculator, CalendarDays, Camera, Carrot, Cherry, Clapperboard, Coffee, Coins,
  CreditCard, Croissant, Droplet, Dumbbell, Egg, Footprints, Gem, Gift, Grape, Heart, HeartPulse, Hourglass, House, IceCreamCone, Key, Lamp,
  Landmark, Leaf, ListChecks, Map, Medal, MessageCircleHeart, Moon, Music, Pencil, PiggyBank, Pizza, Plane, Rainbow, Receipt, Rocket, Sandwich,
  ShoppingBasket, Sofa, Soup, Sparkles, Sprout, Sun, Tent, TrendingUp, Wallet, WashingMachine, Wine, Zap,
};
export const TONE_BG: Record<string, string> = {
  sunflower: "bg-sunflower text-on-color", tangerine: "bg-tangerine text-on-color", frog: "bg-frog text-on-color",
  coral: "bg-coral text-on-color", cobalt: "bg-cobalt text-on-cobalt", lavender: "bg-lavender text-on-color",
};

/** Figurinha recortada: borda branca, leve rotação estável pelo código, ícone grande. Arte original do Finch. */
export function Sticker({ code, name, icon, tone, rarity, size = "md", dim = false }: {
  code: string; name: string; icon: string; tone: string; rarity: string; size?: "sm" | "md" | "lg"; dim?: boolean;
}) {
  const Icon = ICONS[icon] ?? Sparkles;
  const tilt = ((code.charCodeAt(code.length - 1) + code.charCodeAt(code.length - 2)) % 7) - 3;
  const box = size === "lg" ? "w-32 p-3" : size === "sm" ? "w-full p-1.5" : "w-full p-2";
  return (
    <figure
      className={`relative flex aspect-[3/4] flex-col items-center justify-between rounded-[14px] border-4 border-white shadow-[0_4px_12px_rgb(0_0_0/.12)] ${box} ${TONE_BG[tone] ?? TONE_BG.sunflower} ${dim ? "opacity-40 grayscale" : ""} ${rarity === "especial" ? "ring-2 ring-sunflower ring-offset-2 ring-offset-bg" : ""}`}
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <span className="tabular self-start text-[9px] font-bold opacity-70">{code}</span>
      <Icon className={size === "lg" ? "size-14" : "size-7"} strokeWidth={2} aria-hidden="true" />
      <figcaption className={`w-full truncate text-center font-bold leading-tight ${size === "lg" ? "text-[13px]" : "text-[9px]"}`}>{name}</figcaption>
      {rarity !== "comum" && <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-ink text-[10px] text-sunflower">★</span>}
    </figure>
  );
}
