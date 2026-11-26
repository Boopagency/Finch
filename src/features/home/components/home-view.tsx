"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";

import { AlertTriangle, Plus, Wrench } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { brl } from "@/features/finance/money";
import { uploadPhoto } from "@/lib/photos";
import { alertText, KINDS, type Alert } from "../home";
import type { HomeItem } from "../server/queries";
import { addMaintenance, deleteItem, deleteMaintenance, saveItem } from "../server/actions";

type R = { ok: boolean; message: string };
const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).replace(".", "");

function MaintenanceForm({ itemId, today, onDone }: { itemId: string; today: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: R | null, f: FormData) => {
    const r = await addMaintenance(prev, f);
    if (r.ok) {
      toast(r.message);
      onDone();
    }
    return r;
  }, null);
  return (
    <form action={action} className="flex flex-col gap-2 rounded-[16px] bg-bg p-3">
      <input type="hidden" name="item_id" value={itemId} />
      <Field id={`m-desc-${itemId}`} name="description" label="O que foi feito" required maxLength={200} placeholder="Limpeza do filtro" />
      <div className="grid grid-cols-3 gap-2">
        <Field id={`m-done-${itemId}`} name="done_on" type="date" label="Quando" defaultValue={today} max={today} required />
        <Field id={`m-cost-${itemId}`} name="cost" label="Custo (R$)" inputMode="decimal" />
        <Field id={`m-next-${itemId}`} name="next_on" type="date" label="Próxima" min={today} />
      </div>
      {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
      <div className="flex gap-2"><Button type="submit" disabled={pending}>Salvar manutenção</Button><Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button></div>
    </form>
  );
}

function ItemCard({ item, today }: { item: HomeItem; today: string }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, start] = useTransition();
  const next = item.maintenance.find((m) => m.next_on)?.next_on ?? null;
  return (
    <li className="rounded-[20px] bg-surface">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-tangerine text-on-color"><Wrench className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[16px]">{item.name}</b>
          <span className="text-[12px] text-ink-3">
            {KINDS[item.kind]}
            {item.warranty_until && ` · garantia ${item.warranty_until >= today ? "até" : "acabou em"} ${fmt(item.warranty_until)}`}
            {next && ` · próxima manutenção ${fmt(next)}`}
          </span>
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 px-4 pb-4">
          <dl className="grid grid-cols-2 gap-2 text-[14px]">
            {item.bought_on && <div><dt className="text-[12px] text-ink-3">Compra</dt><dd>{fmt(item.bought_on)}</dd></div>}
            {item.price_cents !== null && <div><dt className="text-[12px] text-ink-3">Valor</dt><dd className="tabular">{brl(item.price_cents)}</dd></div>}
          </dl>
          {item.notes && <p className="whitespace-pre-line text-[14px] text-ink-2">{item.notes}</p>}
          {item.photo_url && (
            <a href={item.photo_url} target="_blank" rel="noreferrer" className="block">
              {/* eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário */}
              <img src={item.photo_url} alt={`Nota de ${item.name}`} loading="lazy" className="max-h-60 w-full rounded-[14px] object-cover" />
            </a>
          )}
          <section aria-label={`Manutenções de ${item.name}`} className="flex flex-col gap-2">
            <h3 className="text-[13px] font-semibold text-ink-2">Manutenções</h3>
            {item.maintenance.length === 0 && <p className="text-[14px] text-ink-3">Nenhuma ainda.</p>}
            {item.maintenance.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-[14px]">
                <span className="flex-1"><b>{m.description}</b> <span className="text-ink-3">· {fmt(m.done_on)}{m.cost_cents !== null ? ` · ${brl(m.cost_cents)}` : ""}</span></span>
                <ConfirmButton compact disabled={busy} label={`Apagar manutenção ${m.description}`} onConfirm={() => start(async () => { await deleteMaintenance(m.id); toast("Manutenção apagada"); })} />
              </div>
            ))}
            {adding ? <MaintenanceForm itemId={item.id} today={today} onDone={() => setAdding(false)} /> : (
              <Button variant="secondary" onClick={() => setAdding(true)} className="self-start"><Plus className="size-4" /> Manutenção</Button>
            )}
          </section>
          <ConfirmButton disabled={busy} onConfirm={() => start(async () => { await deleteItem(item.id); toast(`${item.name} removido`); })} className="self-start">
            Remover {item.name}
          </ConfirmButton>
        </div>
      )}
    </li>
  );
}

export function HomeView({ items, alerts, today, spaceId }: { items: HomeItem[]; alerts: Alert[]; today: string; spaceId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(async (prev: R | null, f: FormData) => {
    const file = f.get("photo");
    f.delete("photo");
    if (file instanceof File && file.size > 0) {
      try {
        f.set("photo_path", await uploadPhoto(spaceId, file));
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Não consegui enviar a foto." };
      }
    }
    const r = await saveItem(prev, f);
    if (r.ok) {
      toast(r.message);
      setOpen(false);
    }
    return r;
  }, null);

  return (
    <div className="flex flex-col gap-3">
      {alerts.length > 0 && (
        <section aria-label="Avisos da casa" className="flex flex-col gap-1 rounded-[22px] bg-sunflower p-4 text-on-color">
          {alerts.map((a) => (
            <p key={`${a.item_id}-${a.kind}`} className="flex items-center gap-2 text-[15px] font-semibold">
              <AlertTriangle className="size-4 shrink-0" /> {a.name}: {alertText(a)}
            </p>
          ))}
        </section>
      )}
      {items.length === 0 && !open && (
        <EmptyState title="Nada cadastrado ainda">Geladeira, ar-condicionado, carro: com a data da compra e da garantia, e uma foto da nota. O app avisa antes da garantia acabar e quando a manutenção estiver chegando.</EmptyState>
      )}
      <ul className="stagger flex flex-col gap-2" aria-label="Coisas da casa">
        {items.map((i) => <ItemCard key={i.id} item={i} today={today} />)}
      </ul>
      {open ? (
        <section aria-label="Novo item" className="rounded-[22px] bg-surface p-4">
          <form action={action} className="flex flex-col gap-3">
            <Field id="h-name" name="name" label="Item" required maxLength={80} placeholder="Geladeira" />
            <label className="flex flex-col gap-1.5" htmlFor="h-kind"><span className="text-[13px] font-semibold text-ink-2">Tipo</span>
              <select id="h-kind" name="kind" defaultValue="eletro" className="min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]">
                {Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Field id="h-bought" name="bought_on" type="date" label="Compra" max={today} />
              <Field id="h-price" name="price" label="Valor (R$)" inputMode="decimal" />
            </div>
            <Field id="h-warranty" name="warranty_until" type="date" label="Garantia até" />
            <Field id="h-notes" name="notes" label="Notas (modelo, nº de série, assistência)" maxLength={1000} />
            <label className="flex flex-col gap-1.5" htmlFor="h-photo"><span className="text-[13px] font-semibold text-ink-2">Foto da nota ou garantia (opcional)</span>
              <input id="h-photo" name="photo" type="file" accept="image/*" className="text-[15px] file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-surface-2 file:px-4 file:font-semibold" />
            </label>
            {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
            <div className="flex gap-2"><Button type="submit" disabled={pending}>Cadastrar</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
          </form>
        </section>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)} className="self-start"><Plus className="size-4" /> Novo item</Button>
      )}
    </div>
  );
}
