import { BrandMark } from "@/components/brand/mark";

export const metadata = { title: "Sem conexão" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-stage px-gutter text-center text-stage-ink">
      <BrandMark className="size-16" />
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Sem conexão</h1>
      <p className="max-w-xs text-stage-muted">
        O Finch volta assim que a internet voltar. O que você registrou fica guardado e sincroniza sozinho.
      </p>
    </main>
  );
}
