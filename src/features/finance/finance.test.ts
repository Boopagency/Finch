import { describe, expect, it } from "vitest";
import { addMonths, brl, coupleBalance, dueDate, shares, splitInstallments, statementMonth } from "./money";
import { parseExpense } from "./quick-parse";

describe("parcelas", () => {
  it("distribui centavos e soma o total", () => {
    expect(splitInstallments(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitInstallments(99999, 10).reduce((a, b) => a + b)).toBe(99999);
    expect(splitInstallments(1, 3)).toEqual([1, 0, 0]);
    expect(() => splitInstallments(100.5, 2)).toThrow();
  });
});

describe("fatura do cartão", () => {
  it("compra no dia do fechamento cai na fatura seguinte", () => {
    expect(statementMonth("2026-11-04", 5)).toBe("2026-11-01");
    expect(statementMonth("2026-11-05", 5)).toBe("2026-12-01");
    expect(statementMonth("2026-12-20", 5)).toBe("2027-01-01");
  });
  it("vencimento e meses", () => {
    expect(addMonths("2026-11-01", 3)).toBe("2027-02-01");
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
    expect(dueDate("2026-11-01", 5, 12)).toBe("2026-11-12");
    expect(dueDate("2026-11-01", 25, 5)).toBe("2026-12-05"); // vence depois de fechar
    expect(dueDate("2027-02-01", 1, 31)).toBe("2027-02-28");
  });
});

describe("divisão do casal", () => {
  const A = "a";
  const B = "b";
  it("50/50 com centavo ímpar fica com quem pagou", () => {
    expect(shares(10001, "equal", [{ id: A }, { id: B }], A)).toEqual({ a: 5001, b: 5000 });
  });
  it("proporcional à renda de referência", () => {
    expect(shares(10000, "income", [{ id: A, weight: 600000 }, { id: B, weight: 400000 }], B)).toEqual({ a: 6000, b: 4000 });
    expect(() => shares(10000, "income", [{ id: A }, { id: B }], A)).toThrow(/rendas/);
  });
  it("percentual e fixo", () => {
    expect(shares(9000, "percent", [{ id: A, weight: 70 }, { id: B, weight: 30 }], A)).toEqual({ a: 6300, b: 2700 });
    expect(shares(9000, "fixed", [{ id: A, fixed: 5000 }, { id: B, fixed: 4000 }], A)).toEqual({ a: 5000, b: 4000 });
    expect(() => shares(9000, "fixed", [{ id: A, fixed: 1 }, { id: B, fixed: 1 }], A)).toThrow();
  });
  it("saldo: quem pagou tem a receber; acerto zera", () => {
    const s = [{ paid_by: A, total: 10000, shares: { a: 5000, b: 5000 } }];
    expect(coupleBalance(s, [])).toEqual({ a: 5000, b: -5000 });
    expect(coupleBalance(s, [{ from_user: B, to_user: A, amount: 5000 }])).toEqual({ a: 0, b: 0 });
  });
});

describe("lançamento rápido", () => {
  it("entende valor, pagamento, parcelas e categoria", () => {
    expect(parseExpense("180 mercado crédito")).toMatchObject({ amount: 18000, payment: "card", category: "Mercado", description: "Mercado", installments: 1 });
    expect(parseExpense("gastei 35,90 no ifood pix")).toMatchObject({ amount: 3590, payment: "checking", category: "Delivery" });
    expect(parseExpense("notebook 4.500,00 10x cartão")).toMatchObject({ amount: 450000, installments: 10, payment: "card" });
    expect(parseExpense("recebi 5000 salário")).toMatchObject({ amount: 500000, income: true });
    expect(parseExpense("uber 23.5")).toMatchObject({ amount: 2350, category: "Transporte", payment: null });
  });
  it("formata BRL", () => {
    expect(brl(123456)).toBe("R$ 1.234,56");
    expect(brl(-5)).toBe("−R$ 0,05");
  });
});
