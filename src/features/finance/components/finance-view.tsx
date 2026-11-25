"use client";

import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, CreditCard, Repeat2, Users } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { addMonths, brl } from "../money";
import type { FinanceData } from "../server/queries";
import { confirmEntry, quickExpense, settle, voidEntry } from "../server/actions";
import { EntrySheet } from "./entry-sheet";

const monthLabel = (m: string) => new Date(`${m}T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export function QuickExpense({ workspaceId, onDone }: { workspaceId?: string; onDone?: () => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        start(async () => {
          const r = await quickExpense(text, workspaceId);
          toast(r.message);
          if (r.ok) {
            setText("");
            onDone?.();
          }
        });
      }}
      className="flex items-center gap-2 rounded-[22px] bg-surface p-2 pl-4"
    >
      <label htmlFor={id} className="sr-only">Lançamento rápido</label>
      <input id={id} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ex.: 180 mercado crédito" maxLength={200} autoComplete="off" enterKeyHint="send" className="min-h-11 min-w-0 flex-1 bg-transparent text-[16px] focus:outline-none" />
      <button type="submit" disabled={pending || !text.trim()} className="min-h-11 rounded-full bg-coral px-4 text-[15px] font-bold text-on-color disabled:opacity-40">Lançar</button>
    </form>
  );
}

export function FinanceView({ data }: { data: FinanceData }) {
  const [sheet, setSheet] = useState<null | { kind?: string; to?: string; amount?: string }>(null);
  const [pending, start] = useTransition();
  const t = data.totals;
  const accName = new Map(data.accounts.map((a) => [a.id, a.name]));
  const me = data.couple?.members.find((m) => m.name === "Você");
  const partner = data.couple?.members.find((m) => m.name !== "Você");
  const myBal = me ? (data.couple!.balance[me.id] ?? 0) : 0;
  const budgetOf = new Map(data.budgets.map((b) => [b.category_id, Number(b.limit_cents)]));
  const run = (fn: () => Promise<{ message: string }>) => start(async () => toast((await fn()).message));

  return (
    <div className="flex flex-col gap-4">
      <QuickExpense />

      <div className="flex items-center justify-between">
        <Link href={`/financas?m=${addMonths(data.month, -1).slice(0, 7)}`} aria-label="Mês anterior" className="grid size-11 place-items-center rounded-full bg-surface"><ChevronLeft className="size-5" /></Link>
        <span className="text-[15px] font-bold first-letter:uppercase">{monthLabel(data.month)}</span>
        <Link href={`/financas?m=${addMonths(data.month, 1).slice(0, 7)}`} aria-label="Próximo mês" className="grid size-11 place-items-center rounded-full bg-surface"><ChevronRight className="size-5" /></Link>
      </div>

      <section aria-label="Saldos" className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex flex-col gap-1 rounded-[22px] bg-ink p-4 text-bg">
          <span className="text-[13px] opacity-70">Disponível em contas</span>
          <span className="font-display text-[34px] font-extrabold leading-none">{brl(t.free)}</span>
          <span className="text-[12px] opacity-60">não inclui limite de cartão nem benefícios</span>
        </div>
        <div className="rounded-[20px] bg-surface p-3"><span className="block text-[12px] text-ink-3">Benefícios (VR/VA)</span><span className="tabular text-[17px] font-bold">{brl(t.benefits)}</span></div>
        <div className="rounded-[20px] bg-surface p-3"><span className="block text-[12px] text-ink-3">Investido</span><span className="tabular text-[17px] font-bold">{brl(t.invested)}</span></div>
      </section>

      <section aria-label="Mês" className="grid grid-cols-2 gap-2">
        <div className="rounded-[20px] bg-surface p-3">
          <span className="flex items-center gap-1 text-[12px] text-ink-3"><ArrowDownLeft className="size-3.5 text-success" />Receitas</span>
          <span className="tabular text-[17px] font-bold">{brl(t.income)}</span>
          {t.plannedIncome > 0 && <span className="block text-[11px] text-ink-3">+ {brl(t.plannedIncome)} previsto</span>}
        </div>
        <div className="rounded-[20px] bg-surface p-3">
          <span className="flex items-center gap-1 text-[12px] text-ink-3"><ArrowUpRight className="size-3.5 text-danger" />Despesas</span>
          <span className="tabular text-[17px] font-bold">{brl(t.expense)}</span>
          {t.plannedExpense > 0 && <span className="block text-[11px] text-ink-3">+ {brl(t.plannedExpense)} previsto</span>}
        </div>
        <div className="col-span-2 flex items-baseline justify-between rounded-[20px] bg-surface px-4 py-3">
          <span className="text-[13px] text-ink-2">Sobrou no mês</span>
          <span className={`tabular text-[17px] font-bold ${t.income - t.expense < 0 ? "text-danger" : "text-success"}`}>{brl(t.income - t.expense)}</span>
        </div>
      </section>

      {data.cards.length > 0 && (
        <section aria-label="Cartões" className="flex flex-col gap-2">
          {data.cards.map((c) => (
            <div key={c.id} className="flex flex-col gap-2 rounded-[22px] bg-surface p-4">
              <div className="flex items-center gap-2">
                <CreditCard className="size-5 text-coral" />
                <span className="flex-1 text-[15px] font-bold">{c.name}</span>
                <span className="text-[12px] text-ink-3">vence {new Date(`${c.due}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-ink-2">Fatura de {monthLabel(data.month).split(" ")[0]}</span>
                <span className="tabular text-[20px] font-extrabold">{brl(c.statement)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden="true"><div className="h-full bg-coral" style={{ width: `${Math.min(100, (c.used / Math.max(1, c.card_limit_cents ?? 1)) * 100)}%` }} /></div>
              <span className="tabular text-[12px] text-ink-3">Limite disponível {brl(c.available)} de {brl(c.card_limit_cents ?? 0)}</span>
              {c.statement > 0 && <Button variant="secondary" onClick={() => setSheet({ kind: "card_payment", to: c.id, amount: (c.statement / 100).toFixed(2).replace(".", ",") })}>Pagar fatura</Button>}
            </div>
          ))}
        </section>
      )}

      {data.couple && me && partner && (
        <section aria-label="Contas do casal" className="flex flex-col gap-2 rounded-[22px] bg-lavender/40 p-4">
          <span className="flex items-center gap-2 text-[15px] font-bold"><Users className="size-4" />Divisão do casal</span>
          <span className="text-[15px]">
            {myBal === 0 ? "Vocês estão quites." : myBal > 0 ? <>{partner.name} tem <b>{brl(myBal)}</b> para acertar com você.</> : <>Você tem <b>{brl(-myBal)}</b> para acertar com {partner.name}.</>}
          </span>
          {myBal < 0 && <Button disabled={pending} onClick={() => run(() => settle(data.shared!.id, partner.id, -myBal))}>Registrar acerto de {brl(-myBal)}</Button>}
        </section>
      )}

      {data.byCategory.length > 0 && (
        <section aria-label="Gastos por categoria" className="flex flex-col gap-2 rounded-[22px] bg-surface p-4">
          <h2 className="text-[15px] font-bold">Para onde foi</h2>
          {data.byCategory.map((c) => {
            const limit = c.id ? budgetOf.get(c.id) : undefined;
            const pct = limit ? Math.round((c.total / limit) * 100) : Math.round((c.total / Math.max(1, t.expense)) * 100);
            return (
              <div key={c.id ?? "none"} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between text-[14px]">
                  <span className="font-semibold">{c.name}</span>
                  <span className="tabular">{brl(c.total)}{limit ? <span className="text-ink-3"> de {brl(limit)}</span> : null}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                  <div className={`h-full ${limit && pct >= 100 ? "bg-danger" : limit && pct >= 80 ? "bg-warning" : "bg-cobalt"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section aria-label="Lançamentos" className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[13px] font-semibold text-ink-2">Lançamentos</h2>
          <Link href="/financas/contas" className="text-[13px] font-semibold text-ink-3">Contas e cartões →</Link>
        </div>
        {data.entries.length === 0 && <p className="px-2 py-6 text-center text-[15px] text-ink-3">Nada lançado neste mês.</p>}
        <ul className="flex flex-col divide-y divide-line rounded-[22px] bg-surface">
          {data.entries.map((e) => {
            const out = e.kind === "expense";
            const neutral = e.kind === "transfer" || e.kind === "card_payment";
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] font-semibold">
                    {e.description || e.category || (e.kind === "card_payment" ? "Pagamento de fatura" : e.kind === "transfer" ? "Transferência" : "Lançamento")}
                    {e.installments && <span className="text-ink-3"> · {e.installment_no}/{e.installments}</span>}
                  </span>
                  <span className="flex items-center gap-1 truncate text-[12px] text-ink-3">
                    {neutral && <Repeat2 className="size-3" />}
                    {new Date(`${e.occurred_on}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })}
                    {e.account_id && accName.get(e.account_id) && ` · ${accName.get(e.account_id)}`}
                    {e.to_account_id && accName.get(e.to_account_id) && ` → ${accName.get(e.to_account_id)}`}
                    {e.category && !neutral && ` · ${e.category}`}
                    {e.split && " · dividido"}
                    {e.status === "planned" && " · previsto"}
                  </span>
                </span>
                <span className={`tabular text-[15px] font-bold ${neutral ? "text-ink-2" : out ? "" : "text-success"}`}>{out ? "−" : neutral ? "" : "+"}{brl(e.amount)}</span>
                <details className="relative">
                  <summary className="grid size-9 cursor-pointer list-none place-items-center rounded-full text-ink-3" aria-label="Mais ações">⋯</summary>
                  <div className="absolute right-0 z-10 mt-1 flex w-44 flex-col rounded-[14px] bg-surface p-1 shadow-[var(--shadow-float)]">
                    {e.status === "planned" && <button disabled={pending} onClick={() => run(() => confirmEntry(e.id))} className="min-h-11 rounded-[10px] px-3 text-left text-[14px] font-semibold">Confirmar</button>}
                    <button disabled={pending} onClick={() => run(() => voidEntry(e.id))} className="min-h-11 rounded-[10px] px-3 text-left text-[14px] font-semibold text-danger">{e.installments ? "Cancelar compra (todas)" : "Cancelar"}</button>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <Button onClick={() => setSheet({})}>Novo lançamento</Button>
      {sheet && <EntrySheet data={data} preset={sheet} onClose={() => setSheet(null)} />}
    </div>
  );
}
