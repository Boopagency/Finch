"use client";

import { ChefHat, Clock, Minus, Plus, ShoppingCart } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { Recipe } from "../server/queries";
import { deleteRecipe, recipeToList, saveRecipe } from "../server/actions";

const area = "rounded-[14px] border border-line bg-surface px-4 py-3 text-[16px]";

function RecipeForm({ recipe, onDone }: { recipe?: Recipe; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, form: FormData) => {
    const r = await saveRecipe(prev, form);
    if (r.ok) {
      toast(r.message);
      onDone();
    }
    return r;
  }, null);
  const k = recipe?.id ?? "new";
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={recipe?.id ?? ""} />
      <Field id={`r-title-${k}`} name="title" label="Receita" defaultValue={recipe?.title} required maxLength={80} placeholder="Risoto de cogumelos" />
      <div className="grid grid-cols-2 gap-2">
        <Field id={`r-serv-${k}`} name="servings" type="number" inputMode="numeric" min={1} max={50} label="Porções" defaultValue={recipe?.servings ?? 2} />
        <Field id={`r-prep-${k}`} name="prep_min" type="number" inputMode="numeric" min={1} max={1440} label="Preparo (min)" defaultValue={recipe?.prep_min ?? ""} />
      </div>
      <label className="flex flex-col gap-1.5" htmlFor={`r-ing-${k}`}>
        <span className="text-[13px] font-semibold text-ink-2">Ingredientes (um por linha)</span>
        <textarea id={`r-ing-${k}`} name="ingredients" rows={5} maxLength={4000} defaultValue={recipe?.ingredients} placeholder={"300 g arroz arbóreo\n200 g cogumelo\n1 cebola"} className={area} />
      </label>
      <label className="flex flex-col gap-1.5" htmlFor={`r-steps-${k}`}>
        <span className="text-[13px] font-semibold text-ink-2">Modo de preparo</span>
        <textarea id={`r-steps-${k}`} name="steps" rows={4} maxLength={8000} defaultValue={recipe?.steps} className={area} />
      </label>
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>Salvar receita</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

function RecipeCard({ r, onEdit }: { r: Recipe; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [servings, setServings] = useState(r.servings);
  const [pending, start] = useTransition();
  return (
    <li className="rounded-[20px] bg-surface">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-tangerine text-on-color"><ChefHat className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[16px]">{r.title}</b>
          <span className="flex items-center gap-1 text-[12px] text-ink-3">
            {r.servings} porções{r.prep_min ? <> · <Clock className="size-3" /> {r.prep_min} min</> : null}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          {r.ingredients && (
            <ul className="list-disc pl-5 text-[15px] leading-relaxed">
              {r.ingredients.split("\n").filter((l) => l.trim()).map((l, i) => <li key={i}>{l.replace(/^[-•*]\s*/, "")}</li>)}
            </ul>
          )}
          {r.steps && <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink-2">{r.steps}</p>}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-ink-2">Para</span>
            <button onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Menos porções" className="grid size-10 place-items-center rounded-full bg-surface-2"><Minus className="size-4" /></button>
            <b className="tabular w-6 text-center" aria-label="Porções">{servings}</b>
            <button onClick={() => setServings(Math.min(50, servings + 1))} aria-label="Mais porções" className="grid size-10 place-items-center rounded-full bg-surface-2"><Plus className="size-4" /></button>
            <span className="text-[13px] text-ink-3">porções</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending || !r.ingredients.trim()} onClick={() => start(async () => toast((await recipeToList(r.id, servings)).message))}>
              <ShoppingCart className="size-4" /> Ingredientes para a lista
            </Button>
            <Button variant="secondary" onClick={onEdit}>Editar</Button>
            <Button variant="danger" disabled={pending} onClick={() => start(async () => { await deleteRecipe(r.id); toast("Receita apagada"); })}>Apagar</Button>
          </div>
        </div>
      )}
    </li>
  );
}

export function RecipesView({ recipes }: { recipes: Recipe[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      {recipes.length === 0 && editing !== "new" && (
        <EmptyState title="Nenhuma receita ainda">Guardem as receitas de vocês com os ingredientes um por linha. Um toque manda o que falta para a lista do mercado.</EmptyState>
      )}
      <ul className="stagger flex flex-col gap-2">
        {recipes.map((r) =>
          editing === r.id ? (
            <li key={r.id} className="rounded-[22px] bg-surface p-4"><RecipeForm recipe={r} onDone={() => setEditing(null)} /></li>
          ) : (
            <RecipeCard key={r.id} r={r} onEdit={() => setEditing(r.id)} />
          ),
        )}
      </ul>
      {editing === "new" ? (
        <section aria-label="Nova receita" className="rounded-[22px] bg-surface p-4"><RecipeForm onDone={() => setEditing(null)} /></section>
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")} className="self-start"><Plus className="size-4" /> Nova receita</Button>
      )}
    </div>
  );
}
