import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({}), requireViewer: async () => ({}) }));
const quickExpense = vi.fn(async () => ({ ok: true, message: "ok" }));
vi.mock("@/features/finance/server/actions", async (orig) => ({ ...(await orig<object>()), quickExpense }));

const { callTool, toolList } = await import("./server/handler");
const viewer = { id: "e2e00000-0000-4000-8000-00000000000a", email: "a@finch.test", name: "A", tz: "America/Sao_Paulo" };

describe("ferramentas do conector", () => {
  const tools = toolList();
  it("todo schema é objeto fechado (campo extra, como user_id, é recusado)", () => {
    for (const t of tools) {
      expect(t.inputSchema.type, t.name).toBe("object");
      expect(t.inputSchema.additionalProperties, t.name).toBe(false);
      expect(JSON.stringify(t.inputSchema)).not.toMatch(/user_id"/);
    }
  });
  it("excluir, arquivar e mexer em dinheiro sempre pedem confirm", () => {
    const risky = tools.filter((t) => /^(delete|remove|archive|void)_|expense|entry|settle|budget|account|finish_shopping/.test(t.name));
    expect(risky.length).toBeGreaterThan(20);
    for (const t of risky) expect((t.inputSchema.properties as Record<string, unknown>).confirm, t.name).toBeDefined();
  });
  it("sem confirm só descreve; com confirm executa", async () => {
    const preview = (await callTool(viewer, "log_expense", { text: "45 uber" })) as { needs_confirmation: boolean; action: string };
    expect(preview.needs_confirmation).toBe(true);
    expect(preview.action).toContain("R$ 45,00");
    expect(quickExpense).not.toHaveBeenCalled();
    await callTool(viewer, "log_expense", { text: "45 uber", confirm: true });
    expect(quickExpense).toHaveBeenCalledWith("45 uber");
  });
  it("no assistente o modelo não manda confirm: a ação vira proposta para a pessoa tocar", async () => {
    await expect(callTool(viewer, "log_expense", { text: "45 uber", confirm: true }, "app")).rejects.toThrow();
    const r = (await callTool(viewer, "log_expense", { text: "45 uber" }, "app")) as { proposal: { tool: string; args: object; summary: string } };
    expect(r.proposal).toEqual({ tool: "log_expense", args: { text: "45 uber" }, summary: expect.stringContaining("R$ 45,00") });
  });
  it("recusa campo extra e ferramenta desconhecida", async () => {
    await expect(callTool(viewer, "log_water", { amount_ml: 250, user_id: "x" })).rejects.toThrow();
    await expect(callTool(viewer, "drop_table", {})).rejects.toThrow(/desconhecida/);
  });
});
