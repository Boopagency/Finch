"use client";

import { Switch } from "@/components/ui/switch";

import { ConfirmButton } from "@/components/ui/confirm-button";

import { Check, ShoppingCart, Star, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { useOutboxOps } from "@/components/sync/use-outbox";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { mergeShopping, type ShopItem } from "@/features/sync/ops";
import { cancelPending, enqueue, forgetAcked } from "@/lib/outbox";
import { CATEGORIES, formatMoney, parseItems } from "../parse";
import { finishShopping, toggleFavorite, updateItem } from "../server/actions";

type Product = { id: string; name: string; category: string; unit: string | null; favorite: boolean; times_bought: number; last_price_cents: number | null };
const CAT_LABEL = Object.fromEntries(CATEGORIES);
const select = "min-h-12 w-full rounded-[14px] border border-line bg-surface px-3 text-[16px]";

export function addToList(listId: string, text: string) {
  const items = parseItems(text);
  for (const it of items) void enqueue({ id: crypto.randomUUID(), type: "shop.add", list_id: listId, ...it });
  if (items.length) toast(items.length === 1 ? `+ ${items[0]!.name}` : `+ ${items.length} itens`);
  return items.length;
}

export function QuickItems({ listId, onAdded }: { listId: string; onAdded?: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (addToList(listId, text)) {
          setText("");
          onAdded?.();
        }
      }}
      className="field-shell flex items-center gap-2 rounded-[22px] bg-surface p-2 pl-4 transition-shadow"
    >
      <label htmlFor={id} className="sr-only">Adicionar à lista</label>
      <input id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: 2 leite, ovos" maxLength={300} autoComplete="off" enterKeyHint="send" className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] field-inline" />
      <button type="submit" disabled={!text.trim()} className="min-h-11 rounded-full bg-frog px-4 text-[15px] font-bold text-on-color disabled:opacity-40">
        Adicionar
      </button>
    </form>
  );
}

export function ShoppingList({ listId, serverItems, products, members, superMode, viewerId, today, budget }: {
  listId: string;
  serverItems: ShopItem[];
  products: Product[];
  members: { id: string; name: string }[];
  superMode: boolean;
  viewerId: string;
  today: string;
  budget: number | null;
}) {
  const ops = useOutboxOps();
  useEffect(() => {
    void forgetAcked(new Set(serverItems.map((i) => i.id)));
  }, [serverItems]);
  const items = mergeShopping(serverItems, ops, listId);
  const [edit, setEdit] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const done = items.filter((i) => i.checked).length;
  const estimate = items.reduce((n, i) => n + (i.est_price_cents ?? 0) * (i.unit === "g" || i.unit === "ml" ? 1 : i.qty), 0);
  const inList = new Set(items.map((i) => i.name.toLowerCase()));
  const suggestions = products.filter((p) => !inList.has(p.name.toLowerCase())).slice(0, 12);

  // tela acesa no modo supermercado (quando o navegador permite)
  useEffect(() => {
    if (!superMode || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [superMode]);

  const check = (i: ShopItem) => void enqueue({ id: crypto.randomUUID(), type: "shop.check", item_id: i.id, checked: !i.checked });
  const remove = (i: ShopItem) => {
    const id = crypto.randomUUID();
    void enqueue({ id, type: "shop.remove", item_id: i.id }, { holdMs: 5000 });
    toast(`${i.name} removido`, { label: "Desfazer", run: () => void cancelPending(id) });
  };

  const groups = CATEGORIES.map(([key, label]) => ({
    key,
    label,
    list: items.filter((i) => i.category === key || (key === "outros" && !CAT_LABEL[i.category])).sort((a, b) => Number(a.checked) - Number(b.checked)),
  })).filter((g) => g.list.length);
  const ordered = superMode ? [...groups.map((g) => ({ ...g, list: g.list.filter((i) => !i.checked) })), { key: "carrinho", label: "No carrinho", list: items.filter((i) => i.checked) }].filter((g) => g.list.length) : groups;
  const editing = items.find((i) => i.id === edit);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-[22px] bg-surface p-4">
        <ShoppingCart className="size-6 text-frog" />
        <div className="flex flex-1 flex-col">
          <span className="tabular text-[15px] font-bold">{done} de {items.length} no carrinho</span>
          {(estimate > 0 || budget) && (
            <span className="tabular text-[13px] text-ink-3">
              {estimate > 0 && `estimado ${formatMoney(estimate)}`}
              {budget ? ` · orçamento ${formatMoney(budget)}` : ""}
            </span>
          )}
        </div>
        <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
          <div className="h-full rounded-full bg-frog transition-[width]" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }} />
        </div>
      </div>

      {!superMode && <QuickItems listId={listId} />}
      {!superMode && suggestions.length > 0 && (
        <div data-scroll-x className="-mx-4 flex gap-1.5 overflow-x-auto px-4" aria-label="Sugestões">
          {suggestions.map((p) => (
            <button key={p.id} onClick={() => addToList(listId, p.name)} className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-2 text-[13px] font-semibold">
              {p.favorite && <Star className="size-3 fill-sunflower text-sunflower" />}+ {p.name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 && <p className="px-2 py-8 text-center text-[15px] text-ink-3">Lista vazia. Escreva acima ou toque numa sugestão.</p>}

      {ordered.map((g) => (
        <section key={g.key} aria-label={g.label} className="flex flex-col gap-1.5">
          <h2 className="px-2 text-[13px] font-semibold text-ink-2">{g.label}</h2>
          <ul className="stagger flex flex-col gap-1.5">
            {g.list.map((i) => (
              <li key={i.id} className={`flex items-center gap-2 rounded-[18px] bg-surface pr-2 ${superMode ? "min-h-16" : ""}`}>
                <button onClick={() => check(i)} aria-pressed={i.checked} aria-label={i.checked ? `Tirar ${i.name} do carrinho` : `Pegar ${i.name}`} className={`flex min-h-12 flex-1 items-center gap-3 py-2 pl-3 text-left ${superMode ? "text-[19px]" : "text-[16px]"}`}>
                  <span className={`grid size-7 shrink-0 place-items-center rounded-full border-2 transition ${i.checked ? "check-on border-frog bg-frog text-on-color" : "border-ink-3"}`}>
                    {i.checked && <Check className="size-4" strokeWidth={3.5} />}
                  </span>
                  <span className={`flex-1 font-semibold ${i.checked ? "text-ink-3 line-through decoration-2" : ""}`}>
                    {i.name}
                    {(i.qty !== 1 || i.unit) && <span className="tabular ml-1.5 font-normal text-ink-3">{i.qty.toLocaleString("pt-BR")}{i.unit ? ` ${i.unit}` : "×"}</span>}
                  </span>
                  {i.est_price_cents != null && <span className="tabular text-[13px] text-ink-3">{formatMoney(i.est_price_cents)}</span>}
                </button>
                {!superMode && (
                  <button onClick={() => setEdit(i.id)} aria-label={`Editar ${i.name}`} className="min-h-11 rounded-full px-2 text-[13px] font-semibold text-ink-3">
                    editar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap gap-2">
        <Link prefetch href={superMode ? `/mercado/${listId}` : `/mercado/${listId}?modo=super`} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-surface px-4 text-[15px] font-semibold">
          {superMode ? "Sair do modo supermercado" : "Modo supermercado"}
        </Link>
        {done > 0 && (
          <Button variant="coral" className="flex-1" onClick={() => setFinishing(true)}>
            Finalizar compra
          </Button>
        )}
      </div>

      {editing && <ItemSheet item={editing} product={products.find((p) => p.name.toLowerCase() === editing.name.toLowerCase())} onRemove={() => { remove(editing); setEdit(null); }} onClose={() => setEdit(null)} />}
      {finishing && <FinishSheet listId={listId} members={members} viewerId={viewerId} today={today} estimate={estimate} pendingCount={items.length - done} onClose={() => setFinishing(false)} />}
    </div>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog ref={ref} onClose={() => setTimeout(onClose, 260)} onClick={(e) => e.target === e.currentTarget && ref.current?.close()} aria-label={title} className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none bg-transparent p-0">
      <div className="mx-auto flex max-h-[90dvh] max-w-md flex-col gap-3 overflow-y-auto rounded-t-[28px] bg-bg px-gutter pt-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[22px] font-bold">{title}</h2>
          <button onClick={() => ref.current?.close()} aria-label="Fechar" className="grid size-11 place-items-center rounded-full bg-surface-2"><X className="size-5" /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function ItemSheet({ item, product, onRemove, onClose }: { item: ShopItem; product?: Product; onRemove: () => void; onClose: () => void }) {
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, f: FormData) => {
    const r = await updateItem(prev, f);
    if (r.ok) { toast(r.message); onClose(); }
    return r;
  }, null);
  return (
    <Sheet title={item.name} onClose={() => setTimeout(onClose, 260)}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={item.id} />
        <div className="grid grid-cols-3 gap-3">
          <Field id="it-qty" name="qty" type="number" inputMode="decimal" step="0.01" min="0.01" label="Qtd." defaultValue={item.qty} required />
          <Field id="it-unit" name="unit" label="Unid." placeholder="kg, un" defaultValue={item.unit ?? ""} maxLength={10} />
          <Field id="it-price" name="price" inputMode="decimal" label="Preço" placeholder="0,00" defaultValue={item.est_price_cents != null ? (item.est_price_cents / 100).toFixed(2).replace(".", ",") : product?.last_price_cents ? (product.last_price_cents / 100).toFixed(2).replace(".", ",") : ""} />
        </div>
        <label className="flex flex-col gap-1.5" htmlFor="it-cat">
          <span className="text-[13px] font-semibold text-ink-2">Corredor</span>
          <select id="it-cat" name="category" defaultValue={item.category} className={select}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <Field id="it-note" name="note" label="Observação" placeholder="marca, tamanho…" defaultValue={item.note ?? ""} maxLength={200} />
        {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
        <Button type="submit" disabled={pending}>Salvar</Button>
      </form>
      <div className="flex gap-2">
        {product && (
          <Button variant="secondary" onClick={() => void toggleFavorite(product.id, !product.favorite).then(() => toast(product.favorite ? "Saiu dos favoritos" : "Favorito"))}>
            <Star className={`size-4 ${product.favorite ? "fill-sunflower text-sunflower" : ""}`} /> {product.favorite ? "Desfavoritar" : "Favoritar"}
          </Button>
        )}
        <ConfirmButton onConfirm={onRemove}>Remover da lista</ConfirmButton>
      </div>
    </Sheet>
  );
}

function FinishSheet({ listId, members, viewerId, today, estimate, pendingCount, onClose }: { listId: string; members: { id: string; name: string }[]; viewerId: string; today: string; estimate: number; pendingCount: number; onClose: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, f: FormData) => {
    const r = await finishShopping(prev, f);
    if (r.ok) { toast(r.message); router.push("/mercado"); }
    return r;
  }, null);
  return (
    <Sheet title="Finalizar compra" onClose={() => setTimeout(onClose, 260)}>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="list_id" value={listId} />
        <Field id="fin-total" name="total" inputMode="decimal" label="Valor total (R$)" placeholder="0,00" defaultValue={estimate ? (estimate / 100).toFixed(2).replace(".", ",") : ""} required autoFocus />
        <Field id="fin-store" name="store" label="Onde" placeholder="Mercado, feira…" maxLength={80} />
        <div className="grid grid-cols-2 gap-3">
          <Field id="fin-date" name="purchased_on" type="date" label="Data" defaultValue={today} required />
          <label className="flex flex-col gap-1.5" htmlFor="fin-pay">
            <span className="text-[13px] font-semibold text-ink-2">Pagamento</span>
            <select id="fin-pay" name="payment" defaultValue="pix" className={select}>
              <option value="pix">Pix</option><option value="debito">Débito</option><option value="credito">Crédito</option><option value="dinheiro">Dinheiro</option><option value="vr">VR</option><option value="va">VA</option><option value="outro">Outro</option>
            </select>
          </label>
        </div>
        {members.length > 1 && (
          <label className="flex flex-col gap-1.5" htmlFor="fin-paid">
            <span className="text-[13px] font-semibold text-ink-2">Quem pagou</span>
            <select id="fin-paid" name="paid_by" defaultValue={viewerId} className={select}>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        )}
        {pendingCount > 0 && (
          <label className="flex min-h-11 items-center justify-between text-[15px] font-semibold">
            Levar {pendingCount} {pendingCount === 1 ? "item que faltou" : "itens que faltaram"} para a próxima lista
            <Switch name="carry_over" defaultChecked />
          </label>
        )}
        <p className="text-[13px] text-ink-3">A compra entra nas finanças como despesa (sem duplicar) e repõe o que a despensa acompanha.</p>
        {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
        <Button type="submit" variant="coral" disabled={pending}>Registrar compra</Button>
      </form>
    </Sheet>
  );
}
