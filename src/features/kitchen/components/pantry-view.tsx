"use client";

import { AlertTriangle, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { expiringSoon, formatQty, isLow, type PantryItem } from "../kitchen";
import { adjustPantry, deletePantryItem, restockLow, savePantryItem } from "../server/actions";

function PantryForm({ item, onDone }: { item?: PantryItem; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, form: FormData) => {
    const r = await savePantryItem(prev, form);
    if (r.ok) {
      toast(r.message);
      onDone();
    }
    return r;
  }, null);
  const k = item?.id ?? "new";
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <Field id={`p-name-${k}`} name="name" label="Item" defaultValue={item?.name} required maxLength={80} placeholder="Arroz" />
      <div className="grid grid-cols-3 gap-2">
        <Field id={`p-qty-${k}`} name="qty" label="Tem" inputMode="decimal" defaultValue={item?.qty ?? 1} />
        <Field id={`p-unit-${k}`} name="unit" label="Unidade" defaultValue={item?.unit ?? ""} maxLength={10} placeholder="kg, un" />
        <Field id={`p-min-${k}`} name="min_qty" label="Mínimo" inputMode="decimal" defaultValue={item?.min_qty ?? 0} />
      </div>
      <Field id={`p-exp-${k}`} name="expires_on" type="date" label="Validade (opcional)" defaultValue={item?.expires_on ?? ""} />
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>Salvar</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}

export function PantryView({ pantry, today }: { pantry: PantryItem[]; today: string }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const low = pantry.filter(isLow);
  const expiring = expiringSoon(pantry, today);

  return (
    <div className="flex flex-col gap-4">
      {low.length > 0 && (
        <div className="flex items-center gap-3 rounded-[22px] bg-sunflower p-4 text-on-color">
          <span className="flex-1 text-[15px] font-semibold">{low.length === 1 ? "1 item abaixo do mínimo" : `${low.length} itens abaixo do mínimo`}</span>
          <Button disabled={pending} onClick={() => start(async () => toast((await restockLow()).message))} className="bg-ink text-bg">
            <ShoppingCart className="size-4" /> Repor
          </Button>
        </div>
      )}
      {expiring.length > 0 && (
        <section aria-label="Vencendo" className="rounded-[22px] bg-surface p-4">
          <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold"><AlertTriangle className="size-4 text-coral" /> Vencendo</h2>
          <ul className="flex flex-col gap-1 text-[15px]">
            {expiring.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className={p.expires_on! < today ? "font-semibold text-danger" : "text-ink-2"}>
                  {p.expires_on! < today ? "venceu" : new Date(`${p.expires_on}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pantry.length === 0 && editing !== "new" && (
        <EmptyState title="Despensa vazia">Cadastre o que vocês sempre querem ter em casa, com um mínimo. Quando baixar, um toque manda para a lista do mercado — e a compra finalizada repõe aqui.</EmptyState>
      )}

      {pantry.length > 0 && (
        <ul className="stagger flex flex-col divide-y divide-line rounded-[20px] bg-surface" aria-label="Itens da despensa">
          {pantry.map((p) =>
            editing === p.id ? (
              <li key={p.id} className="p-4"><PantryForm item={p} onDone={() => setEditing(null)} /></li>
            ) : (
              <li key={p.id} className="flex items-center gap-2 py-2 pl-4 pr-2">
                <button onClick={() => setEditing(p.id)} className="flex min-w-0 flex-1 flex-col text-left" aria-label={`Editar ${p.name}`}>
                  <span className="truncate text-[16px] font-semibold">{p.name}</span>
                  <span className={`tabular text-[12px] ${isLow(p) ? "font-semibold text-danger" : "text-ink-3"}`}>
                    {formatQty(p.qty, p.unit)}{p.min_qty > 0 ? ` · mín. ${formatQty(p.min_qty, p.unit)}` : ""}
                  </span>
                </button>
                <button onClick={() => start(() => adjustPantry(p.id, -1))} disabled={pending || p.qty <= 0} aria-label={`Menos ${p.name}`} className="press grid size-11 place-items-center rounded-full bg-surface-2 disabled:opacity-40"><Minus className="size-4" /></button>
                <button onClick={() => start(() => adjustPantry(p.id, 1))} disabled={pending} aria-label={`Mais ${p.name}`} className="press grid size-11 place-items-center rounded-full bg-surface-2"><Plus className="size-4" /></button>
                <button onClick={() => start(async () => { await deletePantryItem(p.id); toast(`${p.name} saiu da despensa`); })} aria-label={`Tirar ${p.name}`} className="grid size-10 place-items-center text-ink-3"><Trash2 className="size-4" /></button>
              </li>
            ),
          )}
        </ul>
      )}

      {editing === "new" ? (
        <section aria-label="Novo item" className="rounded-[22px] bg-surface p-4"><PantryForm onDone={() => setEditing(null)} /></section>
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")} className="self-start"><Plus className="size-4" /> Item na despensa</Button>
      )}
    </div>
  );
}
