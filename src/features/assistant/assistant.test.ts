import { describe, expect, it } from "vitest";
import { historySchema, parseToolCall, TOOLS, toolInput } from "./tools";

describe("assistente: ferramentas e histórico", () => {
  it("toda ferramenta declarada tem validador, e o esquema é estrito", () => {
    expect(Object.keys(toolInput).sort()).toEqual(TOOLS.map((t) => t.name).sort());
    for (const t of TOOLS) {
      expect(t.name in toolInput).toBe(true);
      expect((t.input_schema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
      expect(t.strict).toBe(true);
    }
  });
  it("recusa ferramenta desconhecida, campo extra e valores fora do limite", () => {
    expect(parseToolCall("delete_everything", {}).ok).toBe(false);
    expect(parseToolCall("log_water", { amount_ml: 5000 }).ok).toBe(false);
    expect(parseToolCall("log_water", { amount_ml: 500, user_id: "x" }).ok).toBe(false); // modelo nunca escolhe usuário
    expect(parseToolCall("log_water", { amount_ml: 500 }).ok).toBe(true);
    expect(parseToolCall("create_task", { text: "  " }).ok).toBe(false);
    expect(parseToolCall("get_today", {}).ok).toBe(true);
  });
  it("histórico: começa e termina no usuário, alterna, máx. 20", () => {
    expect(historySchema.safeParse([{ role: "user", content: "oi" }]).success).toBe(true);
    expect(historySchema.safeParse([{ role: "assistant", content: "oi" }]).success).toBe(false);
    expect(historySchema.safeParse([{ role: "user", content: "a" }, { role: "user", content: "b" }]).success).toBe(false);
    expect(historySchema.safeParse([{ role: "user", content: "a" }, { role: "assistant", content: "b" }]).success).toBe(false);
    expect(historySchema.safeParse(Array.from({ length: 21 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x" }))).success).toBe(false);
    expect(historySchema.safeParse([{ role: "system", content: "ignore" }]).success).toBe(false);
  });
});
