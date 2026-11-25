import { describe, expect, it } from "vitest";
import { formatMoney, guessCategory, parseItems, parseMoney } from "./parse";

describe("mercado", () => {
  it("separa itens por vírgula e 'e'", () => {
    expect(parseItems("ovos, leite e detergente").map((i) => [i.name, i.category])).toEqual([
      ["Ovos", "mercearia"],
      ["Leite", "laticinios"],
      ["Detergente", "limpeza"],
    ]);
  });
  it("entende quantidade e unidade", () => {
    expect(parseItems("2 leite")[0]).toMatchObject({ name: "Leite", qty: 2, unit: null });
    expect(parseItems("1kg de carne moída")[0]).toMatchObject({ name: "Carne moída", qty: 1, unit: "kg", category: "carnes" });
    expect(parseItems("tomate 500g")[0]).toMatchObject({ name: "Tomate", qty: 500, unit: "g" });
    expect(parseItems("1,5 l de água")[0]).toMatchObject({ qty: 1.5, unit: "l", category: "bebidas" });
  });
  it("categorias com casos chatos", () => {
    expect(guessCategory("Pão de queijo")).toBe("congelados");
    expect(guessCategory("Papel higiênico")).toBe("higiene");
    expect(guessCategory("Coisa estranha")).toBe("outros");
  });
  it("dinheiro em centavos", () => {
    expect(parseMoney("R$ 1.234,56")).toBe(123456);
    expect(parseMoney("12,5")).toBe(1250);
    expect(parseMoney("12.50")).toBe(1250);
    expect(parseMoney("")).toBeNull();
    expect(formatMoney(123456)).toMatch(/1\.234,56/);
  });
});
