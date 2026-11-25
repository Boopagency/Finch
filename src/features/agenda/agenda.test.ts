import { describe, expect, it } from "vitest";
import { conflicts, expandEvents, monthGrid, type EventRow } from "./expand";

const ev = (over: Partial<EventRow>): EventRow => ({
  id: "e", title: "E", workspace_id: "w", start_date: "2026-11-25", end_date: "2026-11-25", start_time: null, end_time: null,
  repeat: null, repeat_until: null, location: null, notes: null, category: "geral", remind_min: null, ...over,
});

describe("agenda", () => {
  it("evento simples só no dia", () => {
    expect(expandEvents([ev({ start_time: "14:00:00", end_time: "15:00:00" })], "2026-11-23", "2026-11-29").map((i) => [i.date, i.start, i.end])).toEqual([
      ["2026-11-25", "14:00", "15:00"],
    ]);
  });
  it("evento de vários dias aparece em cada dia", () => {
    const i = expandEvents([ev({ start_date: "2026-11-27", end_date: "2026-11-29" })], "2026-11-28", "2026-12-05");
    expect(i.map((x) => [x.date, x.day, x.span])).toEqual([["2026-11-28", 2, 3], ["2026-11-29", 3, 3]]);
  });
  it("recorrente respeita o fim da repetição", () => {
    const i = expandEvents([ev({ repeat: { freq: "weekly", days: [3] }, repeat_until: "2026-12-05" })], "2026-11-23", "2026-12-31");
    expect(i.map((x) => x.date)).toEqual(["2026-11-25", "2026-12-02"]);
  });
  it("detecta conflitos só entre horários sobrepostos no mesmo dia", () => {
    const c = conflicts([
      { key: "a", date: "d", start: "14:00", end: "15:00" },
      { key: "b", date: "d", start: "14:30", end: "16:00" },
      { key: "c", date: "d", start: "15:00", end: "16:00" }, // encosta em a, sobrepõe b
      { key: "x", date: "e", start: "14:00", end: "15:00" },
      { key: "y", date: "d", start: null, end: null },
    ]);
    expect([...c].sort()).toEqual(["a", "b", "c"]);
  });
  it("grade do mês começa na segunda", () => {
    const g = monthGrid("2026-11-25");
    expect(g[0]![0]).toBe("2026-10-26");
    expect(g.at(-1)!.at(-1)).toBe("2026-12-06");
  });
});
