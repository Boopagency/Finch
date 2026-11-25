import { assert, B, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Cozinha");
const run = Date.now() % 100000;
const a = await phone();
const b = await phone(B);
const toast = (page, t) => page.getByRole("status").filter({ hasText: t }).first().waitFor();
const item = `Arroz ${run}`;
const recipe = `Risoto ${run}`;

async function openList(page) {
  await page.goto(`${BASE}/mercado`);
  await page.locator("main a").filter({ hasText: "Nós" }).first().click();
  await page.waitForURL(/\/mercado\/[0-9a-f-]{36}$/);
}

await test("Despensa: item com mínimo aparece em falta", async () => {
  await a.page.goto(`${BASE}/vida/cozinha`);
  await a.page.getByRole("button", { name: "Item na despensa" }).click();
  await a.page.getByLabel("Item", { exact: true }).fill(item);
  await a.page.getByLabel("Tem", { exact: true }).fill("0,5");
  await a.page.getByLabel("Unidade", { exact: true }).fill("kg");
  await a.page.getByLabel("Mínimo", { exact: true }).fill("2");
  await a.page.locator("main").getByRole("button", { name: "Salvar" }).click();
  await toast(a.page, "Na despensa.");
  const row = a.page.getByRole("list", { name: "Itens da despensa" }).getByRole("button", { name: `Editar ${item}` });
  await row.waitFor();
  assert.match(await row.innerText(), /0,5 kg · mín\. 2 kg/);
  await a.page.getByText(/abaixo do mínimo/).waitFor();
});

await test("+ e − ajustam a quantidade", async () => {
  await a.page.getByRole("button", { name: `Mais ${item}` }).click();
  await a.page.getByRole("button", { name: `Editar ${item}` }).filter({ hasText: "1,5 kg" }).waitFor();
  await a.page.getByRole("button", { name: `Menos ${item}` }).click();
  await a.page.getByRole("button", { name: `Editar ${item}` }).filter({ hasText: "0,5 kg" }).waitFor();
});

await test("Repor manda o que falta para a lista do mercado (sem duplicar)", async () => {
  await a.page.getByRole("button", { name: "Repor" }).click();
  await toast(a.page, /para a lista/);
  await a.page.getByRole("button", { name: "Repor" }).click();
  await toast(a.page, /Já estava tudo na lista|para a lista/);
  await openList(a.page);
  await a.page.getByRole("button", { name: `Pegar ${item}` }).waitFor();
  assert.equal(await a.page.getByRole("button", { name: `Pegar ${item}` }).count(), 1);
});

await test("A parceira vê a mesma despensa", async () => {
  await b.page.goto(`${BASE}/vida/cozinha`);
  await b.page.getByRole("button", { name: `Editar ${item}` }).waitFor();
});

await test("Receita → lista, escalando porções e pulando o que tem em casa", async () => {
  await a.page.goto(`${BASE}/vida/cozinha?v=receitas`);
  await a.page.getByRole("button", { name: "Nova receita" }).click();
  await a.page.getByLabel("Receita", { exact: true }).fill(recipe);
  await a.page.getByLabel("Porções", { exact: true }).fill("2");
  await a.page.getByLabel("Ingredientes (um por linha)").fill(`200 g cogumelo ${run}\n1 cebola ${run}\n1 kg ${item}`);
  await a.page.getByRole("button", { name: "Salvar receita" }).click();
  await toast(a.page, "Receita salva.");
  await a.page.getByRole("button", { name: new RegExp(recipe) }).click();
  await a.page.getByRole("button", { name: "Mais porções" }).click();
  await a.page.getByRole("button", { name: "Mais porções" }).click(); // 4 porções = dobro
  await a.page.getByRole("button", { name: "Ingredientes para a lista" }).click();
  await toast(a.page, /para a lista/);
  await openList(a.page);
  await a.page.getByText(`Cogumelo ${run}`).waitFor();
  assert.match(await a.page.getByRole("button", { name: `Pegar Cogumelo ${run}` }).innerText(), /400/);
  // arroz já estava pendente na lista: não entra de novo
  assert.equal(await a.page.getByRole("button", { name: `Pegar ${item}` }).count(), 1);
});

await test("Cardápio: receita no jantar de hoje e lista da semana", async () => {
  await a.page.goto(`${BASE}/vida/cozinha?v=cardapio`);
  const jantar = a.page.getByRole("combobox", { name: /^Jantar de / }).first();
  await jantar.fill(recipe);
  await jantar.press("Enter");
  await toast(a.page, `${recipe} no cardápio`);
  await a.page.reload();
  assert.equal(await a.page.getByRole("combobox", { name: /^Jantar de / }).first().inputValue(), recipe);
  await a.page.getByRole("button", { name: "Lista da semana" }).click();
  await toast(a.page, /lista/);
});

await test("Finalizar compra repõe a despensa", async () => {
  await openList(a.page);
  await a.page.getByRole("button", { name: `Pegar ${item}` }).click();
  await a.page.waitForTimeout(2000);
  await a.page.getByRole("button", { name: "Finalizar compra" }).click();
  const d = a.page.getByRole("dialog", { name: "Finalizar compra" });
  await d.getByLabel("Valor total (R$)").fill("10");
  await d.getByRole("button", { name: "Registrar compra" }).click();
  await a.page.getByRole("status").first().waitFor();
  await a.page.waitForTimeout(1500);
  await a.page.goto(`${BASE}/vida/cozinha`);
  // 0,5 + 1,5 comprado = 2 kg (chegou ao mínimo)
  await a.page.getByRole("button", { name: `Editar ${item}` }).filter({ hasText: "2 kg" }).waitFor();
});

await test("Limpeza: tira o item da despensa", async () => {
  await a.page.getByRole("button", { name: `Tirar ${item}` }).click();
  await toast(a.page, "saiu da despensa");
  await a.page.reload();
  assert.equal(await a.page.getByRole("button", { name: `Editar ${item}` }).count(), 0);
});

await close();
summary();
