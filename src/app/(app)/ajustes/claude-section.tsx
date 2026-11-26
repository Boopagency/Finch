"use client";

import { Check, Copy } from "lucide-react";
import { useState, useTransition } from "react";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { toast } from "@/components/ui/toast";
import { revokeMcp } from "@/features/mcp/server/consent";

type Grant = { id: string; client_name: string; created_at: string; last_used_at: string | null };
const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");

export function ClaudeSection({ url, grants }: { url: string; grants: Grant[] }) {
  const [copied, setCopied] = useState(false);
  const [list, setList] = useState(grants);
  const [, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[15px] text-ink-2">Converse com o Claude sobre o seu Finch: ele vê seu dia, agenda e finanças e registra coisas por você — sempre como você.</p>
      <div className="flex items-center gap-2 rounded-[14px] bg-bg p-2 pl-3">
        <code className="min-w-0 flex-1 truncate text-[14px]" aria-label="Endereço do conector">{url}</code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              toast("Não consegui copiar; segure o endereço para copiar.");
            }
          }}
          className="press flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-ink px-3 text-[13px] font-semibold text-bg"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      <ol className="list-decimal pl-5 text-[14px] leading-relaxed text-ink-2">
        <li>No Claude (site ou app): Configurações → Conectores → Adicionar conector personalizado.</li>
        <li>Cole o endereço acima e conecte.</li>
        <li>O Finch abre pedindo sua senha: toque em Permitir.</li>
      </ol>
      {list.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-[16px] bg-bg" aria-label="Conexões ativas">
          {list.map((g) => (
            <li key={g.id} className="flex items-center gap-2 py-2 pl-3 pr-1">
              <span className="min-w-0 flex-1">
                <b className="block truncate text-[15px]">{g.client_name}</b>
                <span className="text-[12px] text-ink-3">conectado em {fmt(g.created_at)}{g.last_used_at ? ` · usado ${fmt(g.last_used_at)}` : ""}</span>
              </span>
              <ConfirmButton
                label={`Desconectar ${g.client_name}`}
                confirmText="Toque de novo"
                className="min-h-9 px-3 text-[13px]"
                onConfirm={() =>
                  start(async () => {
                    await revokeMcp(g.id);
                    setList((l) => l.filter((x) => x.id !== g.id));
                    toast("Acesso do Claude cortado.");
                  })
                }
              >
                Desconectar
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
