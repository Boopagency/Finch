import { describe, expect, it } from "vitest";
import { CARES, daysSince, level, levelProgress, mood, moodLine } from "./pet";

const now = new Date("2026-11-27T20:00:00Z");
const ago = (days: number, hours = 0) => new Date(now.getTime() - days * 86_400_000 - hours * 3_600_000).toISOString();

describe("bichinho", () => {
  it("nível sobe a cada 100 de amor e nunca é menor que 1", () => {
    expect([0, 99, 100, 250, 1000].map(level)).toEqual([1, 1, 2, 3, 11]);
    expect(level(-5)).toBe(1);
    expect(levelProgress(250)).toBe(50);
  });
  it("humor piora com o tempo mas nunca vira punição, e um cuidado traz de volta", () => {
    expect(mood(ago(0), 1, now)).toBe("feliz");
    expect(mood(ago(0), 2, now)).toBe("radiante");
    expect(mood(ago(1), 0, now)).toBe("de boa");
    expect(mood(ago(4), 0, now)).toBe("com saudade");
    expect(mood(ago(30), 0, now)).toBe("com muita saudade");
    // depois de um mês sem ninguém, um carinho hoje devolve o humor na hora
    expect(mood(ago(0), 1, now)).toBe("feliz");
  });
  it("data no futuro (relógio do aparelho adiantado) não quebra", () => {
    expect(daysSince(new Date(now.getTime() + 86_400_000).toISOString(), now)).toBe(0);
    expect(mood(new Date(now.getTime() + 3_600_000).toISOString(), 0, now)).toBe("feliz");
  });
  it("a frase cita o nome e nunca cobra", () => {
    for (const m of ["radiante", "feliz", "de boa", "com saudade", "com muita saudade"] as const) {
      expect(moodLine("Gruso", m)).toContain("Gruso");
      expect(moodLine("Gruso", m)).not.toMatch(/você (não|nunca)|esqueceu|abandon/i);
    }
  });
  it("os valores de amor batem com os da função SQL", () => {
    expect(Object.fromEntries(Object.entries(CARES).map(([k, v]) => [k, v.love]))).toEqual({ comida: 10, carinho: 10, brincar: 15, mimo: 20 });
  });
});
