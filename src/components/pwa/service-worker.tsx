"use client";

import { useEffect, useState } from "react";

/** Registra o SW e oferece atualizar quando houver versão nova esperando. */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          sw?.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) setWaiting(sw);
          });
        });
        // checa atualização ao voltar para o app
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  }, []);

  if (!waiting) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-safe" role="status">
      <button
        onClick={() => waiting.postMessage("SKIP_WAITING")}
        className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg shadow-[var(--shadow-float)]"
      >
        Nova versão do Finch · tocar para atualizar
      </button>
    </div>
  );
}
