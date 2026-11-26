import { describe, expect, it } from "vitest";
import { parseQuickTask } from "./quick-parse";
import { describeRepeat, matches, occurrencesBetween, rotationFor } from "./recurrence";

const TODAY = "2026-11-25"; // quarta

describe("recorrência", () => {
  it("diária com intervalo", () => {
    expect(occurrencesBetween({ freq: "daily", interval: 2 }, TODAY, TODAY, "2026-11-30")).toEqual(["2026-11-25", "2026-11-27", "2026-11-29"]);
  });
  it("semanal em dias escolhidos e a cada 2 semanas", () => {
    expect(occurrencesBetween({ freq: "weekly", days: [3] }, TODAY, TODAY, "2026-12-10")).toEqual(["2026-11-25", "2026-12-02", "2026-12-09"]);
    expect(occurrencesBetween({ freq: "weekly", days: [1, 3], interval: 2 }, TODAY, TODAY, "2026-12-14")).toEqual(["2026-11-25", "2026-12-07", "2026-12-09"]);
  });
  it("mensal usa o último dia em meses curtos", () => {
    expect(matches({ freq: "monthly", monthday: 31 }, "2026-01-31", "2026-02-28")).toBe(true);
    expect(occurrencesBetween({ freq: "monthly", monthday: 10 }, TODAY, TODAY, "2027-01-31")).toEqual(["2026-12-10", "2027-01-10"]);
  });
  it("rodízio alterna por ocorrência, não por data", () => {
    const r = { freq: "weekly" as const, days: [3] };
    expect(rotationFor(["a", "b"], r, TODAY, "2026-11-25")).toBe("a");
    expect(rotationFor(["a", "b"], r, TODAY, "2026-12-02")).toBe("b");
    expect(rotationFor(["a", "b"], r, TODAY, "2026-12-09")).toBe("a");
  });
  it("descreve em português", () => {
    expect(describeRepeat({ freq: "weekly", days: [3] })).toBe("Toda quarta");
    expect(describeRepeat({ freq: "weekly", days: [6] })).toBe("Todo sábado");
    expect(describeRepeat({ freq: "weekly", days: [1, 3] })).toBe("Toda semana: seg, qua");
    expect(describeRepeat({ freq: "monthly", monthday: 10 })).toBe("Todo mês no dia 10");
    expect(describeRepeat({ freq: "daily" })).toBe("Todo dia");
  });
});

describe("adição rápida", () => {
  const p = (s: string) => parseQuickTask(s, TODAY);
  it("recorrência semanal com categoria e espaço", () => {
    expect(p("Lavar roupa toda quarta #casa @nós")).toEqual({ title: "Lavar roupa", repeat: { freq: "weekly", days: [3] }, category: "casa", shared: true });
    expect(p("limpar a casa aos sábados")).toEqual({ title: "Limpar a casa", repeat: { freq: "weekly", days: [6] } });
    expect(p("Feira às quartas e sextas").repeat).toEqual({ freq: "weekly", days: [3, 5] });
    expect(p("Reunião na quarta").repeat).toBeUndefined(); // singular = só uma vez
    expect(p("Limpar a casa todos os sábados").repeat).toEqual({ freq: "weekly", days: [6] });
    expect(p("Academia toda segunda e quarta 7h").repeat).toEqual({ freq: "weekly", days: [1, 3] });
  });
  it("mensal e diária", () => {
    expect(p("Pagar aluguel todo mês dia 10 #contas")).toEqual({ title: "Pagar aluguel", repeat: { freq: "monthly", monthday: 10 }, category: "contas" });
    expect(p("Pagar aluguel todo dia 10").repeat).toEqual({ freq: "monthly", monthday: 10 });
    expect(p("Tomar vitamina todo dia").repeat).toEqual({ freq: "daily" });
  });
  it("datas e horas", () => {
    expect(p("Ligar pro médico amanhã 14h30")).toEqual({ title: "Ligar pro médico", due_date: "2026-11-26", due_time: "14:30" });
    expect(p("Pagar luz dia 10 !!")).toEqual({ title: "Pagar luz", due_date: "2026-12-10", priority: 2 });
    expect(p("Reunião sexta às 9")).toEqual({ title: "Reunião", due_date: "2026-11-27", due_time: "09:00" });
    expect(p("Entregar 15/12")).toEqual({ title: "Entregar", due_date: "2026-12-15" });
    expect(p("Treino 19h")).toEqual({ title: "Treino", due_date: TODAY, due_time: "19:00" });
    expect(p("Comprar presente")).toEqual({ title: "Comprar presente" });
  });
  it("não confunde números do título", () => {
    expect(p("Ler 20 páginas").title).toBe("Ler 20 páginas");
  });
});

describe("mergeTasks (fila: criar/apagar na hora)", async () => {
  const { mergeTasks } = await import("./components/use-task-items");
  const spaces = [
    { id: "00000000-0000-4000-8000-0000000000a1", kind: "personal" as const, name: "Só eu", members: [] },
    { id: "00000000-0000-4000-8000-0000000000b1", kind: "shared" as const, name: "Nós", members: [] },
  ];
  const real = { key: "t1", task_id: "00000000-0000-4000-8000-000000000001", occurrence_id: null, title: "Real", notes: null, date: "2026-11-26", time: null, status: "open" as const, category: "geral", priority: 0, space: { id: spaces[0]!.id, kind: "personal" as const, name: "Só eu" }, assignee: null, repeat: null, repeatLabel: null, rotation: null, remind: false, subtasks: [] };
  const create = { id: "00000000-0000-4000-8000-0000000000c1", type: "task.create" as const, text: "regar plantas amanhã 9h @nós", workspace_id: spaces[0]!.id };

  it("tarefa criada aparece na hora, lida da frase", () => {
    const [draft, first] = mergeTasks([real], [create], "2026-11-26", spaces as never);
    expect(draft).toMatchObject({ key: `pending:${create.id}`, title: "Regar plantas", date: "2026-11-27", time: "09:00", space: { kind: "shared" } });
    expect(first).toBe(real);
  });
  it("quando o servidor devolve a tarefa, o rascunho some (sem duplicar)", () => {
    const back = { ...real, key: "t2", task_id: create.id, title: "regar plantas" };
    expect(mergeTasks([back, real], [create], "2026-11-26", spaces as never)).toHaveLength(2);
  });
  it("apagar some na hora; desfazer (op cancelada) traz de volta", () => {
    const del = { id: "00000000-0000-4000-8000-0000000000d1", type: "task.delete" as const, task_id: real.task_id };
    expect(mergeTasks([real], [del], "2026-11-26", spaces as never)).toHaveLength(0);
    expect(mergeTasks([real], [], "2026-11-26", spaces as never)).toHaveLength(1);
  });
});
