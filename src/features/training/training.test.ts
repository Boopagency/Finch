import { describe, expect, it } from "vitest";
import { bestByExercise, e1rm, formatClock, formatKg, formatSleep, isPR, parseKg, parseSleep, secondsLeft, volume } from "./training";

describe("treino", () => {
  it("converte kg em gramas sem flutuar", () => {
    expect(parseKg("62,5")).toBe(62500);
    expect(parseKg("0.1")).toBe(100);
    expect(parseKg("12.345")).toBe(12345);
    expect(parseKg("abc")).toBeNull();
    expect(parseKg("2000")).toBeNull();
    expect(formatKg(62500)).toBe("62,5 kg");
  });

  it("recorde por 1RM estimado; empate não é recorde", () => {
    expect(e1rm(100000, 1)).toBe(100000);
    expect(e1rm(60000, 10)).toBe(80000);
    const sets = [
      { exercise_id: "a", weight_g: 60000, reps: 10, duration_s: null },
      { exercise_id: "a", weight_g: 75000, reps: 3, duration_s: null },
      { exercise_id: "b", weight_g: null, reps: 20, duration_s: null },
    ];
    const best = bestByExercise(sets);
    expect(best.get("a")).toEqual({ weight_g: 75000, reps: 3, e1rm: 82500 });
    expect(best.has("b")).toBe(false);
    expect(isPR({ exercise_id: "a", weight_g: 75000, reps: 3, duration_s: null }, best.get("a"))).toBe(false);
    expect(isPR({ exercise_id: "a", weight_g: 65000, reps: 10, duration_s: null }, best.get("a"))).toBe(true);
    expect(isPR({ exercise_id: "c", weight_g: 1000, reps: 1, duration_s: null }, undefined)).toBe(true);
    expect(volume(sets)).toBe(60000 * 10 + 75000 * 3);
  });

  it("descanso pelo relógio", () => {
    expect(secondsLeft(10_500, 10_000)).toBe(1);
    expect(secondsLeft(10_000, 99_000)).toBe(0);
    expect(formatClock(90)).toBe("1:30");
    expect(formatClock(3725)).toBe("1:02:05");
  });

  it("sono em formatos comuns", () => {
    expect(parseSleep("7h30")).toBe(450);
    expect(parseSleep("7:05")).toBe(425);
    expect(parseSleep("7,5")).toBe(450);
    expect(parseSleep("8h")).toBe(480);
    expect(parseSleep("7h75")).toBeNull();
    expect(parseSleep("30")).toBeNull();
    expect(formatSleep(450)).toBe("7h30");
    expect(formatSleep(480)).toBe("8h");
  });
});

import { mergeSets } from "../sync/ops";
describe("séries offline", () => {
  it("junta fila e servidor sem duplicar e respeita remoções", () => {
    const S = "00000000-0000-0000-0000-000000000001";
    const server = [{ id: "a", exercise_id: "x", weight_g: 1000, reps: 5, duration_s: null, done_at: "t" }];
    const ops = [
      { id: "a", type: "set.add" as const, session_id: S, exercise_id: "x", weight_g: 1000, reps: 5, duration_s: null, done_at: "t" },
      { id: "b", type: "set.add" as const, session_id: S, exercise_id: "x", weight_g: 2000, reps: 5, duration_s: null, done_at: "t" },
      { id: "c", type: "set.add" as const, session_id: "outra", exercise_id: "x", weight_g: 2000, reps: 5, duration_s: null, done_at: "t" },
      { id: "r", type: "set.remove" as const, target_id: "a" },
    ];
    expect(mergeSets(server, ops, S).map((s) => s.id)).toEqual(["b"]);
  });
});
