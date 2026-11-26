"use client";

import { useRouter } from "next/navigation";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { toast } from "@/components/ui/toast";
import { deleteList } from "../server/actions";

export function DeleteListButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  return (
    <ConfirmButton
      label={`Excluir lista ${name}`}
      className="self-center"
      onConfirm={async () => {
        await deleteList(id);
        toast(`Lista "${name}" excluída`);
        router.push("/mercado");
      }}
    >
      Excluir lista
    </ConfirmButton>
  );
}
