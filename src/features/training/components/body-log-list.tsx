"use client";

import { ConfirmButton } from "@/components/ui/confirm-button";

import { X } from "lucide-react";
import { useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { deleteBodyLog } from "../server/actions";
import { formatKg, formatSleep, MOODS } from "../training";

type Log = { id: string; logged_at: string; weight_g: number | null; waist_mm: number | null; sleep_min: number | null; mood: number | null; note: string | null };

export function BodyLogList({ logs }: { logs: Log[] }) {
  const [pending, start] = useTransition();
  if (logs.length === 0) return null;
  return (
    <section aria-labelledby="historico-corpo" className="flex flex-col gap-2">
      <h2 id="historico-corpo" className="px-1 text-[13px] font-semibold text-ink-3">Histórico</h2>
      <ul className="flex flex-col divide-y divide-line rounded-[20px] bg-surface">
        {logs.slice(0, 20).map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-14 text-[12px] font-semibold text-ink-3">
              {new Date(l.logged_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "")}
            </span>
            <span className="tabular flex-1 text-[15px]">
              {[
                l.weight_g && formatKg(l.weight_g),
                l.waist_mm && `cintura ${(l.waist_mm / 10).toLocaleString("pt-BR")} cm`,
                l.sleep_min != null && `sono ${formatSleep(l.sleep_min)}`,
                l.mood && MOODS[l.mood],
              ].filter(Boolean).join(" · ")}
              {l.note && <span className="block text-[12px] text-ink-3">{l.note}</span>}
            </span>
            <ConfirmButton compact disabled={pending} label="Apagar registro" onConfirm={() => start(async () => { await deleteBodyLog(l.id); toast("Registro apagado"); })}>
              <X className="size-4" />
            </ConfirmButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
