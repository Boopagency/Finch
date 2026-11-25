import { assert, B, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Finanças 2: recorrentes, relatório, CSV");
const run = Date.now() % 100000;
const a = await phone();
const b = await phone(B);
const page = a.page;
const toast = (t) => page.getByRole("status").filter({ hasText: t }).first().waitFor();
const name = `Salário ${run}`;
const month = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7);

await test("Cria receita recorrente numa conta pessoal", async () => {
  // garante uma conta pessoal
  await page.goto(`${BASE}/financas/contas`);
  await page.getByLabel("Tipo").selectOption("checking");
  await page.getByRole("textbox", { name: "Nome" }).fill(`Banco R ${run}`);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await page.getByRole("status").filter({ hasText: /cadastrad/ }).last().waitFor();

  await page.goto(`${BASE}/financas/recorrentes`);
  const btn = page.getByRole("button", { name: "Nova recorrência" });
  await page.getByLabel("Descrição").or(btn).first().waitFor();
  if (await btn.isVisible()) await btn.click();
  await page.getByText("Receita", { exact: true }).click();
  await page.getByLabel("Descrição").fill(name);
  await page.getByLabel("Valor (R$)").fill("1.234,56");
  await page.getByLabel("Todo dia").fill("5");
  if (await page.getByLabel("Espaço").count()) await page.getByLabel("Espaço").selectOption({ label: "Só eu" });
  await page.getByLabel("Conta").selectOption({ label: `Banco R ${run}` });
  await page.getByRole("button", { name: "Criar recorrência" }).click();
  await toast("Recorrência criada");
  await page.getByRole("list", { name: "Recorrências" }).getByText(name).waitFor();
});

await test("Aparece no mês como previsto, uma vez só, e também no mês que vem", async () => {
  await page.goto(`${BASE}/financas`);
  await page.reload();
  const rows = page.locator("li").filter({ hasText: name });
  await rows.first().waitFor();
  assert.equal(await rows.count(), 1, "sem duplicar ao reabrir");
  assert.match(await rows.first().innerText(), /previsto/);
  assert.match(await rows.first().innerText(), /1\.234,56/);
  const href = await page.getByRole("link", { name: "Próximo mês" }).getAttribute("href");
  await page.goto(`${BASE}${href}`);
  await page.locator("li").filter({ hasText: name }).first().waitFor();
});

await test("Confirmar a receita entra no relatório do mês", async () => {
  await page.goto(`${BASE}/financas`);
  const row = page.locator("li").filter({ hasText: name });
  await row.getByLabel("Mais ações").click();
  await row.getByRole("button", { name: "Confirmar" }).click();
  await toast("Confirmado.");
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/financas/relatorio?m=${month}`);
  await page.getByRole("heading", { name: "Últimos 6 meses" }).waitFor();
  const res = await page.getByRole("region", { name: "Resultado do mês" }).innerText();
  assert.match(res, /Receitas/);
  await page.getByRole("heading", { name: /Despesas por categoria/ }).waitFor();
});

await test("CSV do mês: formato pt-BR e só o que é seu", async () => {
  const r = await page.request.get(`${BASE}/api/financas/csv?m=${month}`);
  assert.equal(r.status(), 200);
  assert.match(r.headers()["content-type"], /text\/csv/);
  const body = await r.text();
  assert.ok(body.startsWith("﻿"), "BOM para o Excel");
  assert.match(body, /Data;Descrição;Tipo;Categoria;Conta;Status;Espaço;Valor \(R\$\)/);
  assert.match(body, new RegExp(`${name};Receita;[^;]*;Banco R ${run};Realizado;Só eu;1234,56`));
  const other = await (await b.page.request.get(`${BASE}/api/financas/csv?m=${month}`)).text();
  assert.ok(!other.includes(name), "a parceira não exporta a receita pessoal");
  assert.equal((await page.request.get(`${BASE}/api/financas/csv?m=2026-13`)).status(), 400);
});

await test("Pausar e apagar a regra mantém o que já foi lançado", async () => {
  await page.goto(`${BASE}/financas/recorrentes`);
  await page.getByRole("button", { name: `Pausar ${name}` }).click();
  await toast("Pausada");
  await page.getByRole("button", { name: `Apagar ${name}` }).click();
  await toast("Recorrência apagada");
  await page.goto(`${BASE}/financas`);
  await page.locator("li").filter({ hasText: name }).first().waitFor();
});

await close();
summary();
