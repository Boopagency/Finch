"use client";

import { X } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { cancelPending, enqueue } from "@/lib/outbox";
import { formatWater } from "../water";
import { useWater } from "./water-quick";

/** Registros de hoje, com remoção (fila offline). */
export function WaterLog({ serverLogs }: { serverLogs: { id: string; amount_ml: number; logged_at: string }[] }) {
  const { logs } = useWater(serverLogs);
  const when = new Map(serverLogs.map((l) => [l.id, l.logged_at]));
  if (logs.length === 0) return null;

  async function remove(id: string, amount: number) {
    if (!(await cancelPending(id))) void enqueue({ id: crypto.randomUUID(), type: "water.remove", target_id: id });
    toast(`${formatWater(amount)} removido`);
  }

  return (
    <section aria-labelledby="hoje-agua" className="rounded-[22px] bg-surface p-4">
      <h2 id="hoje-agua" className="mb-2 text-[15px] font-semibold">Hoje</h2>
      <ul className="flex flex-col divide-y divide-line">
        {logs.map((l) => {
          const at = when.get(l.id);
          return (
            <li key={l.id} className="flex items-center gap-3 py-1.5">
              <span className="tabular flex-1 text-[15px] font-semibold">{formatWater(l.amount_ml)}</span>
              <span className="tabular text-[13px] text-ink-3">
                {at ? new Date(at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "agora"}
              </span>
              <button onClick={() => void remove(l.id, l.amount_ml)} aria-label={`Remover ${formatWater(l.amount_ml)}`} className="grid size-11 place-items-center text-ink-3">
                <X className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
