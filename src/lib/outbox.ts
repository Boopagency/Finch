"use client";

import { openDB, type IDBPDatabase } from "idb";
import type { Op, OpResult } from "@/features/sync/ops";

/**
 * Fila offline no IndexedDB. Toda escrita rápida (água, hábito) passa por aqui:
 * grava no aparelho primeiro, tenta enviar na hora e reenvia ao voltar a conexão.
 * O id da op é a chave do registro no servidor, então reenviar nunca duplica.
 */
type Entry = { op: Op; created_at: number; acked: boolean };

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  dbPromise ??= openDB("finch", 1, {
    upgrade(d) {
      d.createObjectStore("outbox", { keyPath: "op.id" });
    },
  });
  return dbPromise;
}

// ---- store reativo (useSyncExternalStore) ----
let entries: Entry[] = [];
const listeners = new Set<() => void>();
function emit() {
  entries = [...entries];
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export const getEntries = () => entries;
const EMPTY: Entry[] = [];
export const getServerEntries = () => EMPTY;

export async function loadOutbox() {
  try {
    entries = (await (await db()).getAll("outbox")) as Entry[];
    emit();
  } catch {
    // IndexedDB indisponível (modo privado): segue só com memória
  }
}

export async function enqueue(op: Op) {
  const entry: Entry = { op, created_at: Date.now(), acked: false };
  entries.push(entry);
  emit();
  try {
    await (await db()).put("outbox", entry);
  } catch {}
  void flush();
}

/** Tira da fila uma op ainda não enviada (desfazer instantâneo). Retorna false se já foi. */
export async function cancelPending(id: string): Promise<boolean> {
  const e = entries.find((x) => x.op.id === id);
  if (!e || e.acked || inFlight.has(id)) return false;
  entries = entries.filter((x) => x.op.id !== id);
  emit();
  try {
    await (await db()).delete("outbox", id);
  } catch {}
  return true;
}

/** Remove ops já confirmadas cujos registros o servidor já devolveu (ou com mais de 2 min). */
export async function forgetAcked(serverIds: Set<string>) {
  const now = Date.now();
  const drop = entries.filter((e) => e.acked && (serverIds.has(e.op.id) || now - e.created_at > 120_000));
  if (!drop.length) return;
  entries = entries.filter((e) => !drop.includes(e));
  emit();
  try {
    const d = await db();
    await Promise.all(drop.map((e) => d.delete("outbox", e.op.id)));
  } catch {}
}

// avisados quando o servidor confirma algo (a UI recarrega os dados do servidor)
const ackListeners = new Set<() => void>();
export function onAcked(cb: () => void) {
  ackListeners.add(cb);
  return () => {
    ackListeners.delete(cb);
  };
}

const inFlight = new Set<string>();
let flushing: Promise<boolean> | null = null;

/** Envia o que estiver pendente. Retorna true se algo foi confirmado. */
export function flush(): Promise<boolean> {
  flushing ??= doFlush().finally(() => (flushing = null));
  return flushing;
}

async function doFlush(): Promise<boolean> {
  const batch = entries.filter((e) => !e.acked).slice(0, 100);
  if (!batch.length || (typeof navigator !== "undefined" && !navigator.onLine)) return false;
  batch.forEach((e) => inFlight.add(e.op.id));
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ops: batch.map((e) => e.op) }),
    });
    if (!res.ok) return false;
    const { results } = (await res.json()) as { results: OpResult[] };
    const d = await db().catch(() => null);
    for (const r of results) {
      const e = entries.find((x) => x.op.id === r.id);
      if (!e) continue;
      if (r.status === "rejected") {
        // dado inválido: descarta para não travar a fila
        entries = entries.filter((x) => x !== e);
        await d?.delete("outbox", r.id).catch(() => {});
      } else {
        e.acked = true;
        await d?.put("outbox", e).catch(() => {});
      }
    }
    emit();
    const ok = results.some((r) => r.status === "ok");
    if (ok) ackListeners.forEach((l) => l());
    return ok;
  } catch {
    return false; // sem rede: fica para a próxima
  } finally {
    batch.forEach((e) => inFlight.delete(e.op.id));
  }
}
