import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <main className="mx-auto max-w-2xl px-gutter pt-safe">
      <PageHeader title="Agenda" />
      <EmptyState title="A agenda chega na Etapa 2">
        Dia, semana e mês juntando seus eventos, tarefas com horário, contas e treinos, sem copiar nada.
      </EmptyState>
    </main>
  );
}
