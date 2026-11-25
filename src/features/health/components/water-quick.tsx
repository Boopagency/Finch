"use client";

import { Droplet } from "lucide-react";
import { useEffect } from "react";
import { useOutboxOps } from "@/components/sync/use-outbox";
import { toast } from "@/components/ui/toast";
import { mergeWater } from "@/features/sync/ops";
import { cancelPending, enqueue, forgetAcked } from "@/lib/outbox";
import { formatWater } from "../water";

type Log = { id: string; amount_ml: number };

/** Registra água num toque e mostra o progresso do dia (otimista + fila offline). */
export function useWater(serverLogs: Log[]) {
  const ops = useOutboxOps();
  useEffect(() => {
    void forgetAcked(new Set(serverLogs.map((l) => l.id)));
  }, [serverLogs]);
  const logs = mergeWater(serverLogs, ops);
  return { logs, total: logs.reduce((n, l) => n + l.amount_ml, 0) };
}

export function logWater(amount: number, totalBefore: number, goal: number, onDone?: () => void) {
  const id = crypto.randomUUID();
  void enqueue({ id, type: "water.add", amount_ml: amount, logged_at: new Date().toISOString() });
  const after = totalBefore + amount;
  toast(after >= goal && totalBefore < goal ? `Meta do dia batida: ${formatWater(after)}` : `+${formatWater(amount)} · ${formatWater(after)} de ${formatWater(goal)}`, {
    label: "Desfazer",
    run: async () => {
      if (!(await cancelPending(id))) void enqueue({ id: crypto.randomUUID(), type: "water.remove", target_id: id });
    },
  });
  onDone?.();
}

export function WaterQuick({ serverLogs, goal, presets, onLogged }: { serverLogs: Log[]; goal: number; presets: number[]; onLogged?: () => void }) {
  const { total } = useWater(serverLogs);
  const pct = Math.min(100, Math.round((total / goal) * 100));

  return (
    <div className="flex flex-col gap-3 rounded-[22px] bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-2 text-[15px] font-semibold">
          <span className="grid size-7 place-items-center rounded-[9px] bg-cobalt text-on-cobalt">
            <Droplet className="size-4" strokeWidth={2.4} />
          </span>
          Água
        </span>
        <span className="tabular text-[14px] text-ink-2">
          <b className="text-ink">{formatWater(total)}</b> de {formatWater(goal)}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso de água">
        <div className="h-full rounded-full bg-cobalt transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        {presets.map((ml) => (
          <button
            key={ml}
            onClick={() => logWater(ml, total, goal, onLogged)}
            className="min-h-11 flex-1 rounded-full bg-surface-2 text-[15px] font-semibold transition active:scale-95 active:bg-cobalt active:text-on-cobalt"
          >
            +{formatWater(ml)}
          </button>
        ))}
      </div>
    </div>
  );
}
