"use client";

import { useActionState, useEffect, useTransition } from "react";
import { BrandMark } from "@/components/brand/mark";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { approveMcp, denyMcp } from "../server/consent";

export function Consent({ clientName, clientId, redirectUri, challenge, state }: { clientName: string; clientId: string; redirectUri: string; challenge: string; state: string }) {
  const [res, action, pending] = useActionState(approveMcp, null);
  const [denying, start] = useTransition();
  useEffect(() => {
    if (res?.ok && res.url) window.location.assign(res.url);
  }, [res]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <BrandMark className="size-12" />
        <span className="text-[28px] font-bold text-ink-3">↔</span>
        <span className="grid size-12 place-items-center rounded-full bg-tangerine font-display text-[20px] font-extrabold text-on-color">C</span>
      </div>
      <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-tight">{clientName} quer acessar seu Finch</h1>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-[15px] text-ink-2">
        <li>Ver seu dia, tarefas, agenda, mercado e o resumo das finanças</li>
        <li>Criar tarefas e compromissos, registrar água, itens de mercado e lançamentos</li>
        <li>Sempre como você: o que é só da outra pessoa continua invisível</li>
      </ul>
      <form action={action} className="flex flex-col gap-3">
        <input type="hidden" name="client_id" value={clientId} />
        <input type="hidden" name="redirect_uri" value={redirectUri} />
        <input type="hidden" name="code_challenge" value={challenge} />
        <input type="hidden" name="state" value={state} />
        <Field id="mcp-pass" name="password" type="password" label="Confirme com sua senha" autoComplete="current-password" required />
        {res && !res.ok && <p role="alert" className="text-sm font-medium text-danger">{res.message}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || denying}>{pending ? "Autorizando…" : "Permitir"}</Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending || denying}
            onClick={() => start(async () => { const url = await denyMcp(clientId, redirectUri, state); if (url) window.location.assign(url); })}
          >
            Recusar
          </Button>
        </div>
      </form>
      <p className="text-[13px] text-ink-3">Você pode cortar esse acesso quando quiser em Ajustes → Claude.</p>
    </div>
  );
}
