import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col justify-center gap-3 px-gutter">
      <h1 className="font-display text-[36px] font-extrabold tracking-tight">Não encontrado</h1>
      <p className="text-[15px] text-ink-2">Isso não existe ou não é seu.</p>
      <Link href="/" className="press self-start rounded-full bg-ink px-5 py-3 text-[15px] font-semibold text-bg">Voltar para Hoje</Link>
    </main>
  );
}
