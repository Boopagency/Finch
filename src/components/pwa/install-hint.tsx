"use client";

import { Share, SquarePlus } from "lucide-react";
import { useSyncExternalStore } from "react";

function isIosBrowserNotInstalled() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

/** No Safari (fora do app instalado), ensina a adicionar à Tela de Início. */
export function InstallHint() {
  const show = useSyncExternalStore(
    () => () => {},
    isIosBrowserNotInstalled,
    () => false,
  );
  if (!show) return null;
  return (
    <div className="mx-4 mb-4 rounded-[22px] bg-white/10 p-4 text-[14px] leading-snug text-stage-ink">
      <b className="mb-1 block">Instale o Finch no iPhone</b>
      Toque em <Share className="inline size-4 align-[-2px]" /> Compartilhar e depois em{" "}
      <SquarePlus className="inline size-4 align-[-2px]" /> Adicionar à Tela de Início. Os lembretes só funcionam com o
      app instalado.
    </div>
  );
}
