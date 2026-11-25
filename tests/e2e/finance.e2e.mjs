import { assert, B, BASE, close, phone, shot, summary, test } from "./lib.mjs";

console.log("Finanças");
const run = Date.now() % 100000;
const { page } = await phone();
const nextMonth = async () => {
  const href = await page.getByRole("link", { name: "Próximo mês" }).getAttribute("href");
  await page.goto(`${BASE}${href}`);
};
const createAccount = async (fields) => {
  await page.goto(`${BASE}/financas/contas`);
  await page.getByLabel("Tipo").selectOption(fields.kind);
  if (fields.ws) await page.getByLabel("De quem").selectOption({ label: fields.ws });
  await page.getByRole("textbox", { name: "Nome" }).fill(fields.name);
  for (const [label, v] of fields.extra ?? []) await page.getByLabel(label).fill(v);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await page.getByRole("status").filter({ hasText: /cadastrad/ }).last().waitFor();
};

await test("Cadastrar conta corrente e cartão", async () => {
  await createAccount({ kind: "checking", name: `Banco ${run}`, extra: [["Saldo hoje (R$)", "1.000,00"]] });
  await createAccount({ kind: "credit_card", name: `Cartão ${run}`, extra: [["Limite", "5.000"], ["Fecha dia", "5"], ["Vence dia", "12"]] });
  await page.getByText(`Banco ${run}`).waitFor();
  await page.getByText(`Cartão ${run}`).waitFor();
});

await test("Lançamento rápido: '180 mercado crédito' vai para o cartão", async () => {
  await page.goto(`${BASE}/financas`);
  await page.getByRole("textbox", { name: "Lançamento rápido" }).fill("180 mercado crédito");
  await page.getByRole("button", { name: "Lançar", exact: true }).click();
  await page.getByRole("status").filter({ hasText: /Despesa de R\$\s?180,00 · Mercado/ }).waitFor();
});

await test("Parcelado em 3x no formulário distribui por faturas", async () => {
  await page.goto(`${BASE}/financas`);
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  const d = page.getByRole("dialog", { name: "Novo lançamento" });
  await d.getByLabel("Valor (R$)").fill("100,00");
  await d.getByLabel("Pago com").selectOption({ label: `Cartão ${run} · Cartão de crédito` });
  await d.getByLabel("Descrição").fill(`TV ${run}`);
  await d.getByLabel("Parcelas").fill("3");
  await d.getByRole("button", { name: "Registrar" }).click();
  await page.getByRole("status").filter({ hasText: "Despesa registrada." }).waitFor();
  // parcela 1/3 aparece em algum dos próximos meses com 33,34
  let found = false;
  for (let i = 0; i < 3 && !found; i++) {
    const t = await page.locator("li").filter({ hasText: `TV ${run}` }).allInnerTexts();
    found = t.some((x) => /1\/3/.test(x) && /33,34/.test(x));
    if (!found) await nextMonth();
  }
  assert.ok(found, "parcela 1/3 de R$ 33,34");
  await shot(page, "financas");
});

await test("Receita prevista não entra no disponível até confirmar", async () => {
  await page.goto(`${BASE}/financas`);
  const before = await page.locator("section[aria-label='Saldos'] .font-display").innerText();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  const d = page.getByRole("dialog", { name: "Novo lançamento" });
  await d.getByRole("button", { name: "Receita" }).click();
  await d.getByLabel("Valor (R$)").fill("500");
  await d.getByLabel("Entrou em").selectOption({ label: `Banco ${run} · Conta corrente` });
  await d.getByLabel("Descrição").fill(`Freela ${run}`);
  await d.getByRole("checkbox", { name: /previsto/ }).check();
  await d.getByRole("button", { name: "Registrar" }).click();
  await page.getByRole("status").filter({ hasText: "Receita registrada." }).waitFor();
  assert.equal(await page.locator("section[aria-label='Saldos'] .font-display").innerText(), before);
  const row = page.locator("li").filter({ hasText: `Freela ${run}` });
  await row.getByLabel("Mais ações").click();
  await row.getByRole("button", { name: "Confirmar" }).click();
  await page.getByRole("status").filter({ hasText: "Confirmado." }).waitFor();
  await page.waitForTimeout(800);
  assert.notEqual(await page.locator("section[aria-label='Saldos'] .font-display").innerText(), before);
});

await test("Pagar fatura não aumenta as despesas", async () => {
  await page.goto(`${BASE}/financas`);
  const desp = async () => page.locator("section[aria-label='Mês'] div").filter({ hasText: "Despesas" }).first().locator(".tabular").first().innerText();
  const before = await desp();
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  const d = page.getByRole("dialog", { name: "Novo lançamento" });
  await d.getByRole("button", { name: "Pagar fatura" }).click();
  await d.getByLabel("Valor (R$)").fill("50");
  await d.getByLabel("Sai de").selectOption({ label: `Banco ${run} · Conta corrente` });
  await d.getByLabel("Fatura do cartão").selectOption({ label: `Cartão ${run}` });
  await d.getByRole("button", { name: "Registrar" }).click();
  await page.getByRole("status").filter({ hasText: "Registrado." }).waitFor();
  assert.equal(await desp(), before);
});

await test("Despesa do casal dividida: B vê o acerto, não as contas de A", async () => {
  await page.goto(`${BASE}/financas`);
  await page.getByRole("button", { name: "Novo lançamento" }).click();
  const d = page.getByRole("dialog", { name: "Novo lançamento" });
  await d.getByLabel("Valor (R$)").fill("90");
  await d.getByRole("button", { name: "Do casal" }).click();
  await d.getByLabel("Pago com").selectOption({ label: `Banco ${run} · Conta corrente` });
  await d.getByLabel("Descrição").fill(`Jantar ${run}`);
  await d.getByLabel("Como dividir").selectOption("equal");
  await d.getByRole("button", { name: "Registrar" }).click();
  await page.getByRole("status").filter({ hasText: "Despesa registrada." }).waitFor();
  const b = await phone(B);
  await b.page.goto(`${BASE}/financas`);
  await b.page.getByText(`Jantar ${run}`).waitFor();
  assert.match(await b.page.getByRole("region", { name: "Contas do casal" }).innerText(), /Você tem R\$/);
  assert.equal(await b.page.getByText(`Banco ${run}`).count(), 0, "B não vê a conta de A");
  await b.page.goto(`${BASE}/financas/contas`);
  assert.equal(await b.page.getByText(`Banco ${run}`).count(), 0);
  await b.ctx.close();
});

await test("Cancelar compra parcelada cancela todas as parcelas", async () => {
  await page.goto(`${BASE}/financas`);
  for (let i = 0; i < 3; i++) {
    const row = page.locator("li").filter({ hasText: `TV ${run}` });
    if (await row.count()) {
      await row.first().getByLabel("Mais ações").click();
      await row.first().getByRole("button", { name: "Cancelar compra (todas)" }).click();
      await page.getByRole("status").filter({ hasText: "cancelado" }).waitFor();
      break;
    }
    await nextMonth();
  }
  await page.waitForTimeout(500);
  for (let i = 0; i < 4; i++) {
    await page.goto(`${BASE}/financas?m=${new Date(Date.UTC(2026, 10 + i, 1)).toISOString().slice(0, 7)}`);
    assert.equal(await page.locator("li").filter({ hasText: `TV ${run}` }).count(), 0);
  }
});

await close();
summary();
