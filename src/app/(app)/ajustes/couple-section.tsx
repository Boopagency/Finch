"use client";

import { Copy } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createInvite, createSharedSpace, revokeInvite } from "@/features/core/server/actions";

type Space = {
  id: string;
  name: string;
  members: { id: string; name: string; me: boolean }[];
  pending: { id: string; email: string; expires_at: string }[];
};

export function CoupleSection({ space }: { space: Space | null }) {
  const [pending, start] = useTransition();
  const [state, action, inviting] = useActionState(createInvite, null);
  const [copied, setCopied] = useState(false);

  if (!space) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[15px] text-ink-2">
          O espaço <b>Nós</b> guarda o que é dos dois: casa, mercado, contas divididas, agenda do casal. O que é só seu
          continua no seu espaço pessoal.
        </p>
        <Button onClick={() => start(async () => void (await createSharedSpace()))} disabled={pending} className="self-start">
          Criar espaço Nós
        </Button>
      </div>
    );
  }

  const partner = space.members.find((m) => !m.me);

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] text-ink-2">
        {partner ? (
          <>
            Você e <b className="text-ink">{partner.name}</b> dividem o espaço <b className="text-ink">{space.name}</b>.
          </>
        ) : (
          <>
            O espaço <b className="text-ink">{space.name}</b> está pronto. Convide a outra pessoa pelo e-mail dela; você
            recebe um link para mandar no WhatsApp.
          </>
        )}
      </p>

      {!partner && (
        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="workspace_id" value={space.id} />
          <Field id="invite_email" name="email" type="email" label="E-mail de quem você vai convidar" required />
          <Button type="submit" disabled={inviting} variant="coral" className="self-start">
            Gerar convite
          </Button>
        </form>
      )}

      {state && (
        <div role="status" className="flex flex-col gap-2">
          <p className={`text-sm font-medium ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>
          {state.link && (
            <div className="flex items-center gap-2 rounded-[14px] bg-surface-2 p-3">
              <code className="min-w-0 flex-1 select-all break-all text-[13px]">{state.link}</code>
              <button onClick={() => copy(state.link!)} aria-label="Copiar link" className="grid size-11 place-items-center rounded-full bg-ink text-bg">
                <Copy className="size-4" />
              </button>
            </div>
          )}
          {copied && <p className="text-[13px] text-ink-3">Link copiado.</p>}
        </div>
      )}

      {space.pending.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-[16px] bg-surface-2">
          {space.pending.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold">{i.email}</span>
                <span className="text-[12px] text-ink-3">
                  convite vale até {new Date(i.expires_at).toLocaleDateString("pt-BR")}
                </span>
              </span>
              <button onClick={() => start(() => revokeInvite(i.id))} disabled={pending} className="min-h-11 px-2 text-[14px] font-semibold text-danger">
                Revogar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
