"use client";

import { Avatar } from "@/components/ui/avatar";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { setAvatar, setCover } from "@/features/core/server/actions";

export function AvatarEditor({ name, url, spaceId }: { name: string; url: string | null; spaceId: string | null }) {
  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} url={url} size={64} />
      {spaceId && <PhotoPicker spaceId={spaceId} label="Trocar foto de perfil" onPicked={(p) => setAvatar(p)}>{url ? "Trocar foto" : "Pôr foto"}</PhotoPicker>}
    </div>
  );
}

export function CoverEditor({ url, spaceId }: { url: string | null; spaceId: string }) {
  return (
    <div className="flex flex-col gap-2">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- link assinado e temporário
        <img src={url} alt="Foto do casal" className="aspect-[16/9] w-full rounded-[18px] object-cover" />
      )}
      <PhotoPicker spaceId={spaceId} label="Foto do casal" onPicked={(p) => setCover(spaceId, p)} className="self-start">
        {url ? "Trocar foto do casal" : "Pôr foto do casal"}
      </PhotoPicker>
    </div>
  );
}
