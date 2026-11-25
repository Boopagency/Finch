import { BrandMark } from "@/components/brand/mark";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Chat } from "@/features/assistant/components/chat";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Assistente" };

export default async function AssistantPage() {
  await requireViewer();
  const ready = !!process.env.AI_API_KEY; // só o booleano vai para a tela; a chave fica no servidor
  return (
    <main className="mx-auto max-w-2xl px-gutter pt-safe">
      <PageHeader title="Finch" meta={<BrandMark className="size-10" />} />
      {ready ? (
        <Chat />
      ) : (
        <EmptyState title="O assistente está pronto, falta a chave">
          Tudo construído: conversar, registrar tarefas, água e mercado, e preparar lançamentos para você confirmar. Para ligar, coloque a chave da IA na Vercel
          como <b>AI_API_KEY</b> (veja Pendências). Enquanto isso, o + entende frases simples sem IA.
        </EmptyState>
      )}
    </main>
  );
}
