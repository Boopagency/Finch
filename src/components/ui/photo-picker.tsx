"use client";

import { Camera } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "@/components/ui/toast";
import { uploadPhoto } from "@/lib/photos";

/** Botão que abre câmera/galeria, reduz a foto no aparelho, envia e entrega o caminho salvo. */
export function PhotoPicker({ spaceId, onPicked, label, children, className = "" }: {
  spaceId: string;
  onPicked: (path: string) => Promise<{ ok: boolean; message: string }>;
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <label className={`press inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-surface-2 px-4 text-[14px] font-semibold ${busy ? "opacity-50" : ""} ${className}`}>
      <Camera className="size-4" /> {busy ? "Enviando…" : (children ?? label)}
      <input
        type="file"
        accept="image/*"
        aria-label={label}
        disabled={busy}
        className="sr-only"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            toast((await onPicked(await uploadPhoto(spaceId, f))).message);
          } catch (err) {
            toast(err instanceof Error ? err.message : "Não consegui enviar a foto.");
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
