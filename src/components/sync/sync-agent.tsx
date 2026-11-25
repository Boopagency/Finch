"use client";

import { CloudOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { flush, loadOutbox, onAcked } from "@/lib/outbox";
import { usePendingCount } from "./use-outbox";

/** Envia a fila ao abrir, ao voltar a conexão, ao voltar para o app e a cada 20 s se houver pendência. */
function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function SyncAgent() {
  const router = useRouter();
  const pending = usePendingCount();
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

  // qualquer confirmação do servidor (inclusive do envio imediato após registrar) recarrega os dados
  useEffect(() => onAcked(() => router.refresh()), [router]);

  useEffect(() => {
    const run = () => void flush();
    const onOnline = () => void run();
    const onVisible = () => document.visibilityState === "visible" && void run();
    void loadOutbox().then(run);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void flush(), 20_000);
    return () => clearInterval(t);
  }, [pending]);

  if (online && !pending) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-[calc(env(safe-area-inset-top,0px)+6px)]">
      <span role="status" className="flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-bg shadow-[var(--shadow-float)]">
        {!online && <CloudOff className="size-3.5" />}
        {online ? `Sincronizando ${pending}…` : pending ? `Sem conexão · ${pending} guardado${pending > 1 ? "s" : ""}` : "Sem conexão"}
      </span>
    </div>
  );
}
