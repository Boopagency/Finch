"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// houve navegação dentro do app desde que ele abriu/recarregou? (então "voltar" do histórico fica no app)
let navigated = false;

/** Fica no layout do app e marca a primeira troca de tela. */
export function NavTracker() {
  const path = usePathname();
  const first = useRef(path);
  useEffect(() => {
    if (path !== first.current) navigated = true;
  }, [path]);
  return null;
}

/** "‹ Voltar": volta no histórico do app; aberto direto (ou após recarregar), vai para a tela-mãe. */
export function BackButton({ parent }: { parent: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => (navigated ? router.back() : router.push(parent))}
      className="press -ml-3 grid size-11 shrink-0 place-items-center self-center rounded-full text-ink-2"
    >
      <ChevronLeft className="size-7" strokeWidth={2.4} />
    </button>
  );
}
