import { describe, expect, it } from "vitest";
import { chatSchema, historySchema, MAX_ATTACH_CHARS } from "./tools";

describe("assistente: histórico e anexos", () => {
  const messages = [{ role: "user", content: "lança esse comprovante" }];
  it("anexos: só tipos conhecidos, no máximo 3 e dentro do limite de tamanho", () => {
    expect(chatSchema.safeParse({ messages }).success).toBe(true);
    expect(chatSchema.safeParse({ messages, attachments: [{ name: "nota.jpg", type: "image/jpeg", data: "abc" }] }).success).toBe(true);
    expect(chatSchema.safeParse({ messages, attachments: [{ name: "x.exe", type: "application/x-msdownload", data: "abc" }] }).success).toBe(false);
    expect(chatSchema.safeParse({ messages, attachments: Array(4).fill({ name: "a.txt", type: "text/plain", data: "a" }) }).success).toBe(false);
    expect(chatSchema.safeParse({ messages, attachments: [{ name: "a.pdf", type: "application/pdf", data: "a".repeat(MAX_ATTACH_CHARS + 1) }] }).success).toBe(false);
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
