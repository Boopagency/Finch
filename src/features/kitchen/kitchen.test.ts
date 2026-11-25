import { describe, expect, it } from "vitest";
import { expiringSoon, isLow, mergeItems, recipeItems, restockQty, splitOwned, weekFrom, type PantryItem } from "./kitchen";

const p = (name: string, qty: number, min_qty = 0, extra: Partial<PantryItem> = {}): PantryItem => ({
  id: name, name, qty, unit: null, min_qty, category: "outros", expires_on: null, ...extra,
});

describe("cozinha", () => {
  it("estoque baixo e quanto repor", () => {
    expect(isLow(p("Arroz", 0.5, 2))).toBe(true);
    expect(isLow(p("Sal", 0, 0))).toBe(false); // sem mínimo, não avisa
    expect(restockQty(p("Arroz", 0.5, 2))).toBe(1.5);
    expect(restockQty(p("Ovos", 11.5, 12))).toBe(1);
  });

  it("vencendo em até 3 dias, ordenado", () => {
    const items = [p("Leite", 1, 0, { expires_on: "2026-11-27" }), p("Iogurte", 1, 0, { expires_on: "2026-11-24" }), p("Queijo", 1, 0, { expires_on: "2026-12-10" })];
    expect(expiringSoon(items, "2026-11-25").map((i) => i.name)).toEqual(["Iogurte", "Leite"]);
  });

  it("receita vira itens escalados e junta repetidos", () => {
    const items = recipeItems("- 2 tomate\n1 kg arroz\n\n• cebola", 2);
    expect(items.map((i) => [i.name, i.qty, i.unit])).toEqual([["Tomate", 4, null], ["Arroz", 2, "kg"], ["Cebola", 2, null]]);
    expect(mergeItems([...items, ...recipeItems("3 tomate")]).find((i) => i.name === "Tomate")?.qty).toBe(7);
  });

  it("pula o que já tem em casa acima do mínimo", () => {
    const items = recipeItems("2 tomate\n1 kg arroz\n1 sal");
    const { buy, have } = splitOwned(items, [p("tomate", 5), p("Arroz", 0.5, 1, { unit: "kg" }), p("Sal", 1, 0)]);
    expect(buy.map((i) => i.name)).toEqual(["Arroz"]);
    expect(have.map((i) => i.name)).toEqual(["Tomate", "Sal"]);
  });

  it("semana a partir de hoje, virando o mês", () => {
    expect(weekFrom("2026-11-28")).toEqual(["2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"]);
  });
});
