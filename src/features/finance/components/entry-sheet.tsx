"use client";

import { Segmented } from "@/components/ui/segmented";
import { X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import type { FinanceData } from "../server/queries";
import { recordEntry } from "../server/actions";

const KINDS = [["expense", "Despesa"], ["income", "Receita"], ["transfer", "Transferir"], ["card_payment", "Pagar fatura"]] as const;
const select = "min-h-12 w-full rounded-[14px] border border-line bg-surface px-3 text-[16px]";
export const ACCOUNT_KIND: Record<string, string> = {
  checking: "Conta corrente", savings: "Poupança", cash: "Dinheiro", wallet: "Carteira digital", investment: "Investimento", meal: "Vale-refeição", food: "Vale-alimentação", credit_card: "Cartão de crédito",
};

export function EntrySheet({ data, onClose, preset }: { data: FinanceData; onClose: () => void; preset?: { kind?: string; to?: string; amount?: string } }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [id] = useState(() => crypto.randomUUID()); // idempotência: reenviar o mesmo formulário não duplica
  const [kind, setKind] = useState(preset?.kind ?? "expense");
  const [ws, setWs] = useState(data.spaces.find((s) => s.kind === "personal")?.id ?? "");
  const [account, setAccount] = useState("");
  const [split, setSplit] = useState("equal");
  const [state, action, pending] = useActionState(async (prev: { ok: boolean; message: string } | null, f: FormData) => {
    const r = await recordEntry(prev, f);
    if (r.ok) {
      toast(r.message);
      ref.current?.close();
    }
    return r;
  }, null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const personal = data.spaces.find((s) => s.kind === "personal")?.id;
  const usable = data.accounts.filter((a) => !a.archived && (a.workspace_id === ws || a.workspace_id === personal));
  const from = usable.filter((a) => (kind === "income" ? a.kind !== "credit_card" : kind === "card_payment" ? a.kind !== "credit_card" : true));
  const isCard = usable.find((a) => a.id === (account || from[0]?.id))?.kind === "credit_card";
  const cats = data.categories.filter((c) => c.workspace_id === ws && c.kind === (kind === "income" ? "income" : "expense"));
  const sharedWs = data.spaces.find((s) => s.id === ws)?.kind === "shared";

  return (
    <dialog ref={ref} onClose={() => setTimeout(onClose, 260)} onClick={(e) => e.target === e.currentTarget && ref.current?.close()} aria-label="Novo lançamento" className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none bg-transparent p-0">
      <div className="mx-auto flex max-h-[92dvh] max-w-md flex-col gap-3 overflow-y-auto rounded-t-[28px] bg-bg px-gutter pt-3" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom, 0px))" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[22px] font-bold">Novo lançamento</h2>
          <button onClick={() => ref.current?.close()} aria-label="Fechar" className="grid size-11 place-items-center rounded-full bg-surface-2"><X className="size-5" /></button>
        </div>
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="kind" value={kind} />
          <Segmented label="Tipo" size="sm" value={kind} onChange={(k) => setKind(k)} options={KINDS.map(([k, l]) => ({ value: k, label: l, tone: k === "income" ? "frog" : k === "expense" ? "coral" : "ink" }))} />
          <Field id="en-amount" name="amount" inputMode="decimal" label="Valor (R$)" placeholder="0,00" defaultValue={preset?.amount} required autoFocus className="text-[22px] font-bold" />
          {data.spaces.length > 1 && (kind === "expense" || kind === "income") && (
            <Segmented
              label="De quem"
              size="sm"
              value={ws}
              onChange={(v) => setWs(v)}
              options={data.spaces.map((s) => ({ value: s.id, label: s.kind === "personal" ? "Só meu" : "Do casal", tone: s.kind === "personal" ? ("ink" as const) : ("lavender" as const) }))}
            />
          )}
          <input type="hidden" name="workspace_id" value={ws} />
          <label className="flex flex-col gap-1.5" htmlFor="en-account">
            <span className="text-[13px] font-semibold text-ink-2">{kind === "income" ? "Entrou em" : kind === "transfer" || kind === "card_payment" ? "Sai de" : "Pago com"}</span>
            <select id="en-account" name="account_id" value={account} onChange={(e) => setAccount(e.target.value)} className={select} required>
              <option value="">Escolha…</option>
              {from.map((a) => <option key={a.id} value={a.id}>{a.name} · {ACCOUNT_KIND[a.kind]}</option>)}
            </select>
          </label>
          {(kind === "transfer" || kind === "card_payment") && (
            <label className="flex flex-col gap-1.5" htmlFor="en-to">
              <span className="text-[13px] font-semibold text-ink-2">{kind === "card_payment" ? "Fatura do cartão" : "Para"}</span>
              <select id="en-to" name="to_account_id" defaultValue={preset?.to ?? ""} className={select} required>
                <option value="">Escolha…</option>
                {usable.filter((a) => (kind === "card_payment" ? a.kind === "credit_card" : a.kind !== "credit_card") && a.id !== account).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </label>
          )}
          {(kind === "expense" || kind === "income") && (
            <label className="flex flex-col gap-1.5" htmlFor="en-cat">
              <span className="text-[13px] font-semibold text-ink-2">Categoria</span>
              <select id="en-cat" name="category_id" className={select}>
                <option value="">Sem categoria</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <Field id="en-desc" name="description" label="Descrição" maxLength={200} placeholder={kind === "card_payment" ? "Fatura" : "Ex.: mercado da semana"} />
          <div className="grid grid-cols-2 gap-3">
            <Field id="en-date" name="occurred_on" type="date" label="Data" defaultValue={data.today} required />
            {kind === "expense" && isCard ? (
              <Field id="en-inst" name="installments" type="number" inputMode="numeric" min={1} max={36} label="Parcelas" defaultValue={1} />
            ) : (
              <input type="hidden" name="installments" value={1} />
            )}
          </div>
          {kind === "expense" && sharedWs && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-[13px] font-semibold text-ink-2">Divisão</legend>
              <select aria-label="Como dividir" name="split" value={split} onChange={(e) => setSplit(e.target.value)} className={select}>
                <option value="equal">Metade para cada um</option>
                <option value="income">Proporcional à renda de referência</option>
                <option value="percent">Percentual</option>
                <option value="">Não dividir</option>
              </select>
              {split === "percent" && <Field id="en-pct" name="my_percent" type="number" inputMode="numeric" min={0} max={100} label="Minha parte (%)" defaultValue={50} />}
            </fieldset>
          )}
          {(kind === "expense" || kind === "income") && !isCard && (
            <label className="flex min-h-11 items-center justify-between text-[15px] font-semibold">
              Ainda não aconteceu (previsto)
              <input type="checkbox" name="planned" className="size-6 accent-[var(--cobalt)]" />
            </label>
          )}
          {state && !state.ok && <p role="alert" className="text-sm font-medium text-danger">{state.message}</p>}
          <Button type="submit" disabled={pending}>Registrar</Button>
        </form>
      </div>
    </dialog>
  );
}
