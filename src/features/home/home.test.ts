import { describe, expect, it } from "vitest";
import { alertText, homeAlerts } from "./home";

describe("coisas da casa", () => {
  const items = [
    { id: "g", name: "Geladeira", warranty_until: "2026-12-10" },
    { id: "a", name: "Ar-condicionado", warranty_until: "2027-06-01" },
    { id: "c", name: "Carro", warranty_until: "2026-11-01" },
  ];
  it("garantia em até 30 dias, manutenção em até 7 ou atrasada; vale a manutenção mais recente", () => {
    const maint = [
      { item_id: "a", done_on: "2026-05-01", next_on: "2026-11-01" }, // antiga: ignorada
      { item_id: "a", done_on: "2026-11-20", next_on: "2026-11-30" },
      { item_id: "c", done_on: "2026-06-01", next_on: "2026-11-20" },
    ];
    const r = homeAlerts(items, maint, "2026-11-25");
    expect(r.map((x) => [x.name, x.kind])).toEqual([["Carro", "overdue"], ["Ar-condicionado", "maintenance"], ["Geladeira", "warranty"]]);
    expect(alertText(r[2]!)).toBe("garantia acaba em 10 de dez");
  });
  it("garantia vencida não avisa", () => {
    expect(homeAlerts([items[2]!], [], "2026-11-25")).toEqual([]);
  });
});
