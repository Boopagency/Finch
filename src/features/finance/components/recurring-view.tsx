"use client";

import { Pause, Play, Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { brl } from "../money";
import { deleteRecurring, saveRecurring, toggleRecurring } from "../server/recurring";

type Rule = { id: string; workspace_id: string; kind: string; description: string; amount_cents: number; account_id: string; category_id: string | null; day_of_month: number; active: boolean };
type Opt = { id: string; name: string; workspace_id: string; kind?: string };
const select = "min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]";

export function RecurringView({ rules, accounts, categories, spaces }: { rules: Rule[]; accounts: Opt[]; categories: Opt[]; spaces: { id: string; name: string; kind: string }[] }) {
  const [open, setOpen] = useState(rules.length === 0);
  const [space, setSpace] = useState(spaces.find((s) => s.kind === "personal")?.id ?? spaces[0]?.id ?? "");
  const [kind, setKind] = useState("expense");
  const [busy, start] = useTransition();
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, f: FormData) => {
    const r = await saveRecurring(prev, f);
    if (r.ok) {
      toast(r.message);
      setOpen(false);
    }
    return r;
  }, null);
  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const spaceKind = spaces.find((s) => s.id === space)?.kind;
  // contas do espaço + as pessoais (o banco aceita conta pessoal em lançamento do casal)
  const personal = new Set(spaces.filter((s) => s.kind === "personal").map((s) => s.id));
  const accOpts = accounts.filter((a) => a.workspace_id === space || (spaceKind === "shared" && personal.has(a.workspace_id)));
  const catOpts = categories.filter((c) => c.workspace_id === space && c.kind === kind);

  return (
    <div className="flex flex-col gap-3">
      {rules.length === 0 && !open && <EmptyState title="Nada recorrente ainda">Salário, aluguel, internet, assinaturas: entram sozinhos todo mês como previsto, e você confirma quando cair.</EmptyState>}
      <ul className="stagger flex flex-col divide-y divide-line rounded-[20px] bg-surface" aria-label="Recorrências">
        {rules.map((r) => (
          <li key={r.id} className={`flex items-center gap-3 py-3 pl-4 pr-2 ${r.active ? "" : "opacity-50"}`}>
            <span className="min-w-0 flex-1">
              <b className="block truncate text-[16px]">{r.description}</b>
              <span className="text-[12px] text-ink-3">dia {r.day_of_month} · {accName.get(r.account_id) ?? "conta"}{r.category_id ? ` · ${catName.get(r.category_id) ?? ""}` : ""}{r.active ? "" : " · pausada"}</span>
            </span>
            <b className={`tabular text-[15px] ${r.kind === "income" ? "text-success" : ""}`}>{r.kind === "income" ? "+" : "−"} {brl(r.amount_cents)}</b>
            <button disabled={busy} onClick={() => start(async () => { await toggleRecurring(r.id, !r.active); toast(r.active ? "Pausada" : "Retomada"); })} aria-label={`${r.active ? "Pausar" : "Retomar"} ${r.description}`} className="grid size-10 place-items-center text-ink-3">
              {r.active ? <Pause className="size-4" /> : <Play className="size-4" />}
            </button>
            <button disabled={busy} onClick={() => start(async () => { await deleteRecurring(r.id); toast("Recorrência apagada (o que já foi lançado fica)"); })} aria-label={`Apagar ${r.description}`} className="grid size-10 place-items-center text-ink-3"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>

      {open ? (
        <section aria-label="Nova recorrência" className="rounded-[22px] bg-surface p-4">
          <form action={action} className="flex flex-col gap-3">
            <div className="flex gap-1 rounded-full bg-surface-2 p-1" role="radiogroup" aria-label="Tipo">
              {[["expense", "Despesa"], ["income", "Receita"]].map(([k, l]) => (
                <label key={k} className="flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-full text-[14px] font-semibold has-[:checked]:bg-surface has-[:checked]:shadow-sm">
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />{l}
                </label>
              ))}
            </div>
            <Field id="rc-desc" name="description" label="Descrição" required maxLength={200} placeholder={kind === "income" ? "Salário" : "Aluguel"} />
            <div className="grid grid-cols-2 gap-2">
              <Field id="rc-amount" name="amount" label="Valor (R$)" inputMode="decimal" required placeholder="1.200,00" />
              <Field id="rc-day" name="day_of_month" type="number" inputMode="numeric" min={1} max={31} label="Todo dia" required defaultValue={5} />
            </div>
            {spaces.length > 1 && (
              <label className="flex flex-col gap-1.5" htmlFor="rc-space"><span className="text-[13px] font-semibold text-ink-2">Espaço</span>
                <select id="rc-space" name="workspace_id" value={space} onChange={(e) => setSpace(e.target.value)} className={select}>
                  {spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}
            {spaces.length <= 1 && <input type="hidden" name="workspace_id" value={space} />}
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5" htmlFor="rc-acc"><span className="text-[13px] font-semibold text-ink-2">Conta</span>
                <select id="rc-acc" name="account_id" required className={select} defaultValue="">
                  <option value="" disabled>Escolher…</option>
                  {accOpts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1.5" htmlFor="rc-cat"><span className="text-[13px] font-semibold text-ink-2">Categoria</span>
                <select id="rc-cat" name="category_id" className={select} defaultValue="">
                  <option value="">Sem categoria</option>
                  {catOpts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>
            {accOpts.length === 0 && <p className="text-[13px] text-ink-3">Cadastre uma conta em Finanças → Contas e cartões primeiro.</p>}
            {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
            <div className="flex gap-2"><Button type="submit" disabled={pending}>Criar recorrência</Button><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button></div>
          </form>
        </section>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)} className="self-start">Nova recorrência</Button>
      )}
      <p className="px-1 text-[13px] text-ink-3">Conta comum: entra como previsto no mês (aparece até o mês que vem). Cartão: entra na fatura quando o dia chega. Dia 31 vira o último dia em meses menores.</p>
    </div>
  );
}
