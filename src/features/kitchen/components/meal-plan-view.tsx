"use client";

import { ShoppingCart } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { dayLabel, SLOTS } from "../kitchen";
import type { Meal, Recipe } from "../server/queries";
import { planMeal, weekToList } from "../server/actions";

export function MealPlanView({ week, today, meals, recipes }: { week: string[]; today: string; meals: Meal[]; recipes: Recipe[] }) {
  const [pending, start] = useTransition();
  const at = (day: string, slot: string) => meals.find((m) => m.day === day && m.slot === slot);
  const byTitle = new Map(recipes.map((r) => [r.title.toLowerCase(), r.id]));

  const save = (day: string, slot: string, raw: string, before: string) => {
    const v = raw.trim();
    if (v === before) return;
    const id = byTitle.get(v.toLowerCase());
    start(async () => {
      const r = await planMeal(day, slot, id ? `r:${id}` : v);
      toast(r.message);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <datalist id="receitas">{recipes.map((r) => <option key={r.id} value={r.title} />)}</datalist>
      <ol className="stagger flex flex-col gap-2">
        {week.map((d) => (
          <li key={d} className="rounded-[20px] bg-surface p-3">
            <h3 className={`mb-2 px-1 text-[13px] font-bold capitalize ${d === today ? "text-coral" : "text-ink-2"}`}>{d === today ? `Hoje · ${dayLabel(d)}` : dayLabel(d)}</h3>
            <div className="flex flex-col gap-1.5">
              {SLOTS.map(([slot, label]) => {
                const m = at(d, slot);
                return (
                  <label key={slot} className="flex items-center gap-2">
                    <span className="w-16 shrink-0 text-[12px] font-semibold text-ink-3">{label}</span>
                    <input
                      key={m?.title ?? ""}
                      list="receitas"
                      defaultValue={m?.title ?? ""}
                      maxLength={80}
                      placeholder="—"
                      aria-label={`${label} de ${dayLabel(d)}`}
                      onBlur={(e) => save(d, slot, e.target.value, m?.title ?? "")}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      className={`min-h-11 min-w-0 flex-1 rounded-[12px] border border-line bg-bg px-3 text-[16px] ${m?.recipe_id ? "font-semibold" : ""}`}
                    />
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>
      <Button disabled={pending} onClick={() => start(async () => toast((await weekToList()).message))} className="self-start">
        <ShoppingCart className="size-4" /> Lista da semana
      </Button>
      <p className="px-1 text-[13px] text-ink-3">Escreva qualquer coisa ou escolha uma receita salva (em negrito). A lista da semana junta os ingredientes das receitas e pula o que já tem na despensa.</p>
    </div>
  );
}
