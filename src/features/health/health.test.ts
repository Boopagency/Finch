import { describe, expect, it } from "vitest";
import { mergeHabitLogs, mergeWater, opSchema, type Op } from "@/features/sync/ops";
import { consistency, habitStatus, weekStart, type Habit } from "./habits";
import { formatWater, localDate, localToInstant, waterSlots } from "./water";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const habit = (over: Partial<Habit> = {}): Habit => ({
  id: id(1), name: "Ler", kind: "check", period: "day", target: 1, unit: null, days: [0, 1, 2, 3, 4, 5, 6], reminder_time: null, tone: "coral", ...over,
});

describe("água", () => {
  it("formata", () => {
    expect(formatWater(300)).toBe("300 ml");
    expect(formatWater(1200)).toBe("1,2 L");
    expect(formatWater(2000)).toBe("2 L");
  });
  it("gera horários de lembrete", () => {
    expect(waterSlots("09:00", "12:00", 90)).toEqual(["09:00", "10:30", "12:00"]);
    expect(waterSlots("21:00", "09:00", 60)).toEqual([]);
  });
  it("converte data local ↔ instante", () => {
    expect(localToInstant("2026-11-25", "09:30", "America/Sao_Paulo").toISOString()).toBe("2026-11-25T12:30:00.000Z");
    expect(localDate(new Date("2026-11-26T02:00:00Z"), "America/Sao_Paulo")).toBe("2026-11-25");
  });
});

describe("hábitos", () => {
  it("semana começa na segunda", () => {
    expect(weekStart("2026-11-25")).toBe("2026-11-23"); // quarta → segunda
    expect(weekStart("2026-11-29")).toBe("2026-11-23"); // domingo → segunda anterior
  });
  it("progresso diário e semanal", () => {
    const logs = [
      { id: id(10), habit_id: id(1), value: 1, local_date: "2026-11-24" },
      { id: id(11), habit_id: id(1), value: 1, local_date: "2026-11-25" },
    ];
    expect(habitStatus(habit(), logs, "2026-11-25")).toMatchObject({ progress: 1, done: true });
    expect(habitStatus(habit({ period: "week", target: 3 }), logs, "2026-11-25")).toMatchObject({ progress: 2, done: false });
    expect(habitStatus(habit({ days: [1] }), [], "2026-11-25").scheduled).toBe(false); // só segundas
  });
  it("consistência não pune o dia de hoje nem a semana em andamento", () => {
    const logs = [{ id: id(10), habit_id: id(1), value: 1, local_date: "2026-11-24" }];
    expect(consistency(habit(), logs, "2026-11-25", 3)).toEqual({ done: 1, of: 2 }); // 24 ok, 23 não, 25 ainda aberto
    expect(consistency(habit({ period: "week", target: 1 }), logs, "2026-11-25").done).toBe(1);
  });
});

describe("fila offline", () => {
  const add: Op = { id: id(20), type: "water.add", amount_ml: 300, logged_at: "2026-11-25T12:00:00Z" };
  it("valida operações", () => {
    expect(opSchema.safeParse(add).success).toBe(true);
    expect(opSchema.safeParse({ ...add, amount_ml: 5000 }).success).toBe(false);
    expect(opSchema.safeParse({ ...add, type: "sql" }).success).toBe(false);
  });
  it("não duplica quando o servidor já tem o registro", () => {
    expect(mergeWater([{ id: id(20), amount_ml: 300 }], [add])).toHaveLength(1);
    expect(mergeWater([], [add])).toHaveLength(1);
    expect(mergeWater([{ id: id(20), amount_ml: 300 }], [add, { id: id(21), type: "water.remove", target_id: id(20) }])).toHaveLength(0);
  });
  it("marcar, desmarcar e marcar de novo termina marcado", () => {
    const ops: Op[] = [
      { id: id(40), type: "habit.add", habit_id: id(1), value: 1, logged_at: "2026-11-25T12:00:00Z" },
      { id: id(41), type: "habit.clear", habit_id: id(1), local_date: "2026-11-25" },
      { id: id(42), type: "habit.add", habit_id: id(1), value: 1, logged_at: "2026-11-25T12:01:00Z" },
    ];
    // servidor já aplicou tudo e devolveu só o último registro
    const server = [{ id: id(42), habit_id: id(1), value: 1, local_date: "2026-11-25" }];
    expect(mergeHabitLogs(server, ops, "2026-11-25").map((l) => l.id)).toEqual([id(42)]);
    expect(mergeHabitLogs([], ops, "2026-11-25").map((l) => l.id)).toEqual([id(42)]);
  });
  it("limpa o dia do hábito", () => {
    const server = [{ id: id(30), habit_id: id(1), value: 1, local_date: "2026-11-25" }];
    expect(mergeHabitLogs(server, [{ id: id(31), type: "habit.clear", habit_id: id(1), local_date: "2026-11-25" }], "2026-11-25")).toHaveLength(0);
  });
});
