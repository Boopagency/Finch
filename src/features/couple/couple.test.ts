import { describe, expect, it } from "vitest";
import { countdownLabel, fmtNum, goalPct, nextOccurrence, perWeekNeeded, sinceLabel } from "./couple";

describe("datas especiais", () => {
  it("próxima ocorrência anual, contando anos", () => {
    expect(nextOccurrence("2021-02-14", true, "2026-11-25")).toEqual({ date: "2027-02-14", days: 81, years: 6 });
    expect(nextOccurrence("2020-11-25", true, "2026-11-25")).toEqual({ date: "2026-11-25", days: 0, years: 6 });
    expect(nextOccurrence("2020-12-01", true, "2026-11-25")?.days).toBe(6);
  });
  it("29 de fevereiro em ano comum vira 28", () => {
    expect(nextOccurrence("2020-02-29", true, "2026-11-25")?.date).toBe("2027-02-28");
    expect(nextOccurrence("2020-02-29", true, "2027-03-01")?.date).toBe("2028-02-29");
  });
  it("data única: futura conta, passada some", () => {
    expect(nextOccurrence("2026-12-20", false, "2026-11-25")?.days).toBe(25);
    expect(nextOccurrence("2026-01-01", false, "2026-11-25")).toBeNull();
  });
  it("rótulos", () => {
    expect(countdownLabel(0)).toBe("é hoje");
    expect(countdownLabel(1)).toBe("amanhã");
    expect(sinceLabel("2021-02-14", "2026-11-25")).toBe("5 anos");
    expect(sinceLabel("2026-03-30", "2026-11-25")).toBe("7 meses");
    expect(sinceLabel("2026-11-20", "2026-11-25")).toBe("5 dias");
  });
});

describe("metas", () => {
  it("progresso e ritmo", () => {
    expect(goalPct(400, 1000)).toBe(40);
    expect(goalPct(1200, 1000)).toBe(100);
    expect(perWeekNeeded(400, 1000, "2026-12-23", "2026-11-25")).toBe(150);
    expect(perWeekNeeded(1000, 1000, "2026-12-23", "2026-11-25")).toBeNull();
    expect(perWeekNeeded(0, 10, null, "2026-11-25")).toBeNull();
    expect(fmtNum(1500, "R$")).toMatch(/R\$\s?1\.500,00/);
    expect(fmtNum(12.5, "km")).toBe("12,5 km");
  });
});
