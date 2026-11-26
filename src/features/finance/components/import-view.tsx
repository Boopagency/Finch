"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { brl } from "../money";
import { checkStatement, importStatement, type Checked } from "../server/import";
import { parseStatement } from "../statement";

type Account = { id: string; name: string; kind: string };
const EXPENSE = ["Mercado", "Delivery", "Restaurantes", "Transporte", "Moradia", "Contas", "Saúde", "Assinaturas", "Lazer", "Casa", "Compras", "Pets", "Educação", "Outros"];
const INCOME = ["Salário", "Extra", "Benefícios", "Reembolso", "Outros"];
const LABEL: Record<Checked["status"], string> = { new: "", imported: "já importado", duplicate: "parece já lançado", skip: "não entra" };

/** Lê o arquivo no aparelho; OFX de banco brasileiro costuma vir em Windows-1252. */
async function readText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(buf);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buf) : utf8;
}

export function ImportView({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [account, setAccount] = useState(accounts[0]?.id ?? "");
  const [rows, setRows] = useState<(Checked & { pick: boolean })[]>([]);
  const [pending, start] = useTransition();
  const acc = accounts.find((a) => a.id === account);

  const onFile = (file: File | undefined) => {
    if (!file || !acc) return;
    start(async () => {
      const parsed = parseStatement(file.name, await readText(file), acc.kind === "credit_card");
      if (!parsed.length) return void toast("Não reconheci o arquivo. Use OFX ou CSV exportado do banco.");
      const r = await checkStatement(acc.id, parsed.slice(0, 500));
      if (!r.ok || !r.rows) return void toast(r.message ?? "Não consegui ler.");
      setRows(r.rows.map((x) => ({ ...x, pick: x.status === "new" })));
    });
  };
  const picked = rows.filter((r) => r.pick);
  const set = (i: number, patch: Partial<(typeof rows)[number]>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  if (!accounts.length) return <p className="rounded-[20px] bg-surface p-4 text-[15px]">Cadastre a conta ou o cartão em Finanças → Contas e cartões primeiro.</p>;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <section className="flex flex-col gap-3 rounded-[22px] bg-surface p-4">
        <label className="flex flex-col gap-1.5" htmlFor="imp-acc">
          <span className="text-[13px] font-semibold text-ink-2">De qual conta é o extrato?</span>
          <select id="imp-acc" value={account} onChange={(e) => { setAccount(e.target.value); setRows([]); }} className="min-h-12 rounded-[14px] border border-line bg-surface px-3 text-[16px]">
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}{a.kind === "credit_card" ? " (cartão)" : ""}</option>)}
          </select>
        </label>
        <label className={`press flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-bg ${pending ? "opacity-50" : ""}`}>
          <FileUp className="size-5" /> {pending ? "Lendo…" : "Escolher arquivo OFX ou CSV"}
          <input type="file" accept=".ofx,.csv,.txt,application/x-ofx,text/csv" aria-label="Arquivo do extrato" disabled={pending} onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} className="sr-only" />
        </label>
        <p className="text-[12px] text-ink-3">No app do banco: Extrato → Exportar (OFX é o melhor). O arquivo é lido aqui no aparelho; só as linhas escolhidas vão para o Finch.</p>
      </section>

      {rows.length > 0 && (
        <>
          <ul className="flex flex-col divide-y divide-line rounded-[20px] bg-surface" aria-label="Linhas do extrato">
            {rows.map((r, i) => (
              <li key={`${r.ref}-${i}`} className={`flex items-center gap-3 px-3 py-2.5 ${r.status === "new" || r.pick ? "" : "opacity-60"}`}>
                <input type="checkbox" checked={r.pick} disabled={r.status === "imported" || r.status === "skip"} onChange={(e) => set(i, { pick: e.target.checked })} aria-label={`Importar ${r.description}`} className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{r.description}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3">
                    {new Date(`${r.date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" })}
                    {LABEL[r.status] && <b className={r.status === "duplicate" ? "text-tangerine" : ""}>{LABEL[r.status]}</b>}
                    {r.note && <span>{r.note}</span>}
                  </span>
                  {r.status !== "imported" && r.status !== "skip" && (
                    <select value={r.category} onChange={(e) => set(i, { category: e.target.value })} aria-label={`Categoria de ${r.description}`} className="mt-1 min-h-9 rounded-[10px] border border-line bg-bg px-2 text-[14px]">
                      {(r.amount < 0 ? EXPENSE : INCOME).map((c) => <option key={c}>{c}</option>)}
                    </select>
                  )}
                </span>
                <b className={`tabular shrink-0 text-[15px] ${r.amount > 0 ? "text-success" : ""}`}>{r.amount > 0 ? "+" : "−"} {brl(Math.abs(r.amount))}</b>
              </li>
            ))}
          </ul>
          <Button
            disabled={pending || !picked.length}
            onClick={() =>
              start(async () => {
                const r = await importStatement(account, picked.map(({ ref, date, description, amount, category }) => ({ ref, date, description, amount, category })));
                toast(r.message);
                if (r.ok) {
                  setRows([]);
                  router.push("/financas");
                }
              })
            }
            className="min-h-14 text-[16px]"
          >
            Importar {picked.length} {picked.length === 1 ? "lançamento" : "lançamentos"}
          </Button>
        </>
      )}
    </div>
  );
}
