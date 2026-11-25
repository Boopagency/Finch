import { BrandMark } from "@/components/brand/mark";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Assistente" };

export default function AssistantPage() {
  return (
    <main className="mx-auto max-w-2xl px-gutter pt-safe">
      <PageHeader title="Finch" meta={<BrandMark className="size-10" />} />
      <EmptyState title="O assistente chega na Etapa 7">
        Você vai poder escrever ou ditar coisas como “bebi 500 ml”, “gastei R$ 180 no mercado no crédito” ou “como foi
        nossa semana?”. Antes disso, os atalhos do + já vão entender frases simples sem IA.
      </EmptyState>
    </main>
  );
}
