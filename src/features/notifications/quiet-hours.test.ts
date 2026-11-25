import { describe, expect, it } from "vitest";
import { isQuiet, quietEndsAt } from "./quiet-hours";

const SP = "America/Sao_Paulo"; // UTC-3, sem horário de verão

describe("horário silencioso", () => {
  it("cruza a meia-noite", () => {
    expect(isQuiet(new Date("2026-11-25T02:00:00Z"), SP, "22:00", "07:30")).toBe(true); // 23:00 local
    expect(isQuiet(new Date("2026-11-25T09:00:00Z"), SP, "22:00", "07:30")).toBe(true); // 06:00
    expect(isQuiet(new Date("2026-11-25T10:30:00Z"), SP, "22:00", "07:30")).toBe(false); // 07:30 em ponto
    expect(isQuiet(new Date("2026-11-25T15:00:00Z"), SP, "22:00", "07:30")).toBe(false); // 12:00
  });

  it("janela no mesmo dia e janela vazia", () => {
    expect(isQuiet(new Date("2026-11-25T16:30:00Z"), SP, "13:00", "14:00")).toBe(true); // 13:30
    expect(isQuiet(new Date("2026-11-25T16:30:00Z"), SP, "10:00", "10:00")).toBe(false);
  });

  it("adia para o fim do silêncio", () => {
    expect(quietEndsAt(new Date("2026-11-25T02:00:00Z"), SP, "07:30").toISOString()).toBe("2026-11-25T10:30:00.000Z");
    expect(quietEndsAt(new Date("2026-11-25T09:00:00Z"), SP, "07:30").toISOString()).toBe("2026-11-25T10:30:00.000Z");
  });
});
