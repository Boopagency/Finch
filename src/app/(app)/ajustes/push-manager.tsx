"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeDevice, saveSubscription, sendTest } from "@/features/notifications/server/actions";

type Device = { id: string; device_label: string; created_at: string; last_success_at: string | null };
type Support = "checking" | "unsupported" | "install" | "denied" | "ready" | "subscribed";

function base64ToBytes(b64: string) {
  const padded = (b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Mac/.test(ua)) return "Mac";
  if (/Android/.test(ua)) return "Android";
  return "Navegador";
}

export function PushManager({ devices }: { devices: Device[] }) {
  const [support, setSupport] = useState<Support>("checking");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setSupport(ios && !standalone ? "install" : "unsupported");
      }
      if (Notification.permission === "denied") return setSupport("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setSupport(sub ? "subscribed" : "ready");
    })();
  }, []);

  // precisa ser disparado por toque (exigência do iOS)
  function enable() {
    start(async () => {
      setMsg(null);
      try {
        const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!key) throw new Error("Chave VAPID não configurada no servidor.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setSupport(permission === "denied" ? "denied" : "ready");
          return;
        }
        const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
        await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(key) });
        await saveSubscription(sub.toJSON(), deviceLabel());
        setSupport("subscribed");
        setMsg({ ok: true, text: "Lembretes ativados neste aparelho." });
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Não consegui ativar." });
      }
    });
  }

  function test(minutes: number) {
    start(async () => {
      const r = await sendTest(minutes);
      setMsg({ ok: r.ok, text: r.message });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {support === "install" && (
        <p className="text-[14px] text-ink-2">
          Para receber lembretes no iPhone, instale o Finch: Compartilhar → Adicionar à Tela de Início, e abra pelo ícone.
        </p>
      )}
      {support === "unsupported" && <p className="text-[14px] text-ink-2">Este navegador não recebe notificações.</p>}
      {support === "denied" && (
        <p className="text-[14px] text-ink-2">
          As notificações estão bloqueadas. No iPhone: Ajustes → Notificações → Finch → Permitir.
        </p>
      )}
      {support === "ready" && (
        <Button onClick={enable} disabled={pending} variant="coral" className="self-start">
          Ativar lembretes neste aparelho
        </Button>
      )}
      {support === "subscribed" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => test(0)} disabled={pending} variant="secondary">
            Enviar teste agora
          </Button>
          <Button onClick={() => test(2)} disabled={pending} variant="secondary">
            Testar em 2 min
          </Button>
        </div>
      )}
      {msg && (
        <p role="status" className={`text-sm font-medium ${msg.ok ? "text-success" : "text-danger"}`}>
          {msg.text}
        </p>
      )}

      {devices.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-[16px] bg-surface-2">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3">
              <Smartphone className="size-5 text-ink-3" />
              <span className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold">{d.device_label}</span>
                <span className="text-[12px] text-ink-3">
                  {d.last_success_at
                    ? `último envio ${new Date(d.last_success_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`
                    : "ainda sem envios"}
                </span>
              </span>
              <button
                onClick={() => start(() => revokeDevice(d.id))}
                className="min-h-11 px-2 text-[14px] font-semibold text-danger"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
