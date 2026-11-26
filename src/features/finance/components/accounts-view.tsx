"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { brl } from "../money";
import type { FinanceData } from "../server/queries";
import { archiveAccount, createAccount, setBudget, setReferenceIncome } from "../server/actions";
import { ACCOUNT_KIND } from "./entry-sheet";

const select = "min-h-12 w-full rounded-[14px] border border-line bg-surface px-3 text-[16px]";

export function AccountsView({ data, viewerId }: { data: FinanceData; viewerId: string }) {
  const [kind, setKind] = useState("checking");
  const [pending, start] = useTransition();
  const [state, action, saving] = useActionState(async (prev: { ok: boolean; message: string } | null, f: FormData) => {
    const r = await createAccount(prev, f);
    toast(r.message);
    return r;
  }, null);
  const run = (fn: () => Promise<{ message: string }>) => start(async () => toast((await fn()).message));
  const myIncome = data.incomes.find((i) => i.user_id === viewerId)?.reference_income_cents;
  const spaceName = (id: string) => (data.spaces.find((s) => s.id === id)?.kind === "shared" ? "do casal" : "pessoal");

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col divide-y divide-line rounded-[22px] bg-surface">
        {data.accounts.filter((a) => !a.archived).map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex flex-1 flex-col">
              <span className="text-[15px] font-semibold">{a.name}</span>
              <span className="text-[12px] text-ink-3">{ACCOUNT_KIND[a.kind]} · {spaceName(a.workspace_id)}{a.kind === "credit_card" ? ` · fecha dia ${a.closing_day}, vence dia ${a.due_day}` : ""}</span>
            </span>
            <span className="tabular text-[15px] font-bold">{a.kind === "credit_card" ? `deve ${brl(Math.max(0, -a.balance))}` : brl(a.balance)}</span>
            <ConfirmButton compact disabled={pending} label={`Arquivar ${a.name}`} confirmText="Toque de novo para arquivar" idle="min-h-11 px-2 text-[12px] text-ink-3" onConfirm={() => run(() => archiveAccount(a.id))}>arquivar</ConfirmButton>
          </li>
        ))}
        {data.accounts.filter((a) => !a.archived).length === 0 && <li className="px-4 py-6 text-center text-[15px] text-ink-3">Cadastre sua primeira conta abaixo.</li>}
      </ul>

      <form action={action} className="flex flex-col gap-3 rounded-[22px] bg-surface p-4">
        <h2 className="font-display text-[18px] font-bold">Nova conta ou cartão</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5" htmlFor="ac-kind">
            <span className="text-[13px] font-semibold text-ink-2">Tipo</span>
            <select id="ac-kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)} className={select}>
              {Object.entries(ACCOUNT_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5" htmlFor="ac-ws">
            <span className="text-[13px] font-semibold text-ink-2">De quem</span>
            <select id="ac-ws" name="workspace_id" className={select}>
              {data.spaces.map((s) => <option key={s.id} value={s.id}>{s.kind === "personal" ? "Só minha" : "Do casal"}</option>)}
            </select>
          </label>
        </div>
        <Field id="ac-name" name="name" label="Nome" placeholder={kind === "credit_card" ? "Nubank, Inter…" : "Conta do banco"} maxLength={60} required />
        {kind === "credit_card" ? (
          <div className="grid grid-cols-3 gap-3">
            <Field id="ac-limit" name="limit" inputMode="decimal" label="Limite" placeholder="5.000,00" required />
            <Field id="ac-close" name="closing_day" type="number" inputMode="numeric" min={1} max={31} label="Fecha dia" required />
            <Field id="ac-due" name="due_day" type="number" inputMode="numeric" min={1} max={31} label="Vence dia" required />
          </div>
        ) : (
          <Field id="ac-open" name="opening" inputMode="decimal" label="Saldo hoje (R$)" placeholder="0,00" />
        )}
        {state && !state.ok && <p role="alert" className="text-sm text-danger">{state.message}</p>}
        <Button type="submit" disabled={saving}>Cadastrar</Button>
      </form>

      {data.shared && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const v = String(new FormData(e.currentTarget).get("income") ?? "");
            run(() => setReferenceIncome(data.shared!.id, v));
          }}
          className="flex flex-col gap-3 rounded-[22px] bg-lavender/40 p-4"
        >
          <h2 className="font-display text-[18px] font-bold">Renda de referência</h2>
          <p className="text-[13px] text-ink-2">Usada só para dividir despesas do casal de forma proporcional. Só este número é compartilhado; suas contas continuam privadas.</p>
          <Field id="ref-income" name="income" inputMode="decimal" label="Minha renda mensal (R$)" defaultValue={myIncome ? (myIncome / 100).toFixed(2).replace(".", ",") : ""} />
          <Button type="submit" variant="secondary" disabled={pending}>Salvar</Button>
        </form>
      )}

      <section aria-label="Orçamentos" className="flex flex-col gap-2 rounded-[22px] bg-surface p-4">
        <h2 className="font-display text-[18px] font-bold">Orçamento mensal por categoria</h2>
        <p className="text-[13px] text-ink-3">Deixe vazio para não ter limite. A barra fica amarela em 80% e vermelha ao passar.</p>
        {data.spaces.map((s) => (
          <details key={s.id} className="rounded-[14px] bg-surface-2 p-2">
            <summary className="cursor-pointer px-2 py-1 text-[14px] font-semibold">{s.kind === "personal" ? "Meus gastos" : "Gastos do casal"}</summary>
            <ul className="mt-2 flex flex-col gap-1.5">
              {data.categories.filter((c) => c.workspace_id === s.id && c.kind === "expense").map((c) => {
                const b = data.budgets.find((x) => x.category_id === c.id);
                return (
                  <li key={c.id}>
                    <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); run(() => setBudget(s.id, c.id, String(new FormData(e.currentTarget).get("v") ?? ""))); }}>
                      <label htmlFor={`b-${c.id}`} className="flex-1 text-[14px]">{c.name}</label>
                      <input id={`b-${c.id}`} name="v" inputMode="decimal" placeholder="sem limite" defaultValue={b ? (Number(b.limit_cents) / 100).toFixed(2).replace(".", ",") : ""} className="min-h-10 w-28 rounded-[10px] border border-line bg-surface px-2 text-right text-[15px]" />
                      <button className="min-h-10 rounded-full bg-ink px-3 text-[12px] font-bold text-bg">ok</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </section>
    </div>
  );
}
