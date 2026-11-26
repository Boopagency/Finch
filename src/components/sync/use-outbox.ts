"use client";

import { useSyncExternalStore } from "react";
import type { Op } from "@/features/sync/ops";
import { getEntries, getServerEntries, subscribe } from "@/lib/outbox";

/** Ops na fila (pendentes e recém-confirmadas), para a UI otimista. */
export function useOutboxOps(): Op[] {
  const entries = useSyncExternalStore(subscribe, getEntries, getServerEntries);
  return entries.map((e) => e.op);
}

export function usePendingCount(): number {
  const entries = useSyncExternalStore(subscribe, getEntries, getServerEntries);
  return entries.filter((e) => !e.acked && !e.hold_until).length; // segurada (janela do Desfazer) não é "sincronizando"
}
