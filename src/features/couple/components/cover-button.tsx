"use client";

import { PhotoPicker } from "@/components/ui/photo-picker";
import { setCover } from "@/features/core/server/actions";

export function CoverButton({ spaceId, has }: { spaceId: string; has: boolean }) {
  return (
    <PhotoPicker spaceId={spaceId} label="Foto do casal" onPicked={(p) => setCover(spaceId, p)} className="bg-white/90 text-[#111110]">
      {has ? "Trocar foto" : "Pôr foto do casal"}
    </PhotoPicker>
  );
}
