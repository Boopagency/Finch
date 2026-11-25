import { describe, expect, it } from "vitest";
import { buildSentence, greeting, type DayItem } from "./sentence";

const plain = (s: ReturnType<typeof buildSentence>) => s.map((x) => x.text).join("");
const item = (highlight: string, priority: number, tail?: string): DayItem => ({
  lead: "você tem",
  highlight,
  tail,
  tone: "coral",
  icon: "x",
  priority,
});

describe("frase do Hoje", () => {
  it("saudação por horário", () => {
    expect(greeting(3)).toBe("Boa madrugada");
    expect(greeting(9)).toBe("Bom dia");
    expect(greeting(14)).toBe("Boa tarde");
    expect(greeting(20)).toBe("Boa noite");
  });

  it("dia vazio é honesto", () => {
    expect(plain(buildSentence("Duda", 9, []))).toBe("Bom dia, Duda! Seu dia está em branco por enquanto. Toque no + para começar.");
  });

  it("ordena por prioridade, junta com 'e' e resume o excesso", () => {
    const s = buildSentence("Jabez", 14, [item("treino", 1, "às 19h"), item("conta de luz", 5), item("aniversário", 3), item("lista", 0)]);
    expect(plain(s)).toBe("Boa tarde, Jabez! Hoje você tem conta de luz, você tem aniversário, você tem treino às 19h e mais 1 coisa.");
    expect(plain(buildSentence("J", 14, [item("a", 2), item("b", 1)]))).toBe("Boa tarde, J! Hoje você tem a e você tem b.");
  });
});
