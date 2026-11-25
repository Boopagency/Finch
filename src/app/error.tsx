"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-start justify-end gap-3 bg-stage px-gutter pb-16 text-stage-ink">
      <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.04em]">Algo travou.</h1>
      <p className="max-w-sm text-[17px] text-stage-muted">Não foi você. Tente de novo; se continuar, feche e abra o app.</p>
      <Button variant="coral" onClick={reset}>
        Tentar de novo
      </Button>
    </main>
  );
}
