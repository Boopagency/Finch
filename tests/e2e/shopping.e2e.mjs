import { assert, B, BASE, close, phone, shot, summary, test } from "./lib.mjs";

console.log("Mercado");
const run = Date.now() % 100000;
const a = await phone();
const b = await phone(B);
let listUrl;

await test("Lista padrão do casal existe e abre", async () => {
  await a.page.goto(`${BASE}/mercado`);
  await a.page.locator("main a").filter({ hasText: "Nós" }).first().click();
  await a.page.waitForURL(/\/mercado\/[0-9a-f-]{36}$/);
  listUrl = a.page.url();
});

await test("Adição rápida: vários itens, quantidade e corredor", async () => {
  await a.page.getByRole("textbox", { name: "Adicionar à lista" }).fill(`2 leite ${run}, ovos ${run} e detergente ${run}`);
  await a.page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await a.page.getByRole("region", { name: "Frios e laticínios" }).getByText(`Leite ${run}`).waitFor();
  await a.page.getByRole("region", { name: "Limpeza" }).getByText(`Detergente ${run}`).waitFor();
  assert.match(await a.page.getByRole("button", { name: `Pegar Leite ${run}` }).innerText(), /2×/);
  await a.page.getByText(/Sincronizando/).waitFor({ state: "detached" }).catch(() => {});
  await a.page.waitForTimeout(1000);
});

await test("Tempo real: B vê os itens sem recarregar", async () => {
  await b.page.goto(listUrl);
  await b.page.getByText(`Ovos ${run}`).waitFor();
  await b.page.waitForTimeout(2500); // assinatura do realtime
  await a.page.getByRole("textbox", { name: "Adicionar à lista" }).fill(`banana ${run}`);
  await a.page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await b.page.getByText(`Banana ${run}`).waitFor({ timeout: 12000 }); // chega via realtime
});

await test("Tempo real: B marca, A vê marcado", async () => {
  await b.page.getByRole("button", { name: `Pegar Ovos ${run}` }).click();
  await a.page.getByRole("button", { name: `Tirar Ovos ${run} do carrinho` }).waitFor({ timeout: 12000 });
});

await test("Offline: item guardado e enviado ao voltar", async () => {
  await a.ctx.setOffline(true);
  try {
    await a.page.getByRole("textbox", { name: "Adicionar à lista" }).fill(`café ${run}`);
    await a.page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await a.page.getByText(/Sem conexão · 1 guardado/).waitFor();
    await a.page.getByRole("button", { name: `Pegar Café ${run}` }).waitFor(); // aparece na hora (otimista)
  } finally {
    await a.ctx.setOffline(false);
    await a.page.evaluate(() => window.dispatchEvent(new Event("online")));
  }
  await b.page.getByRole("button", { name: `Pegar Café ${run}` }).waitFor({ timeout: 15000 });
});

await test("Editar item: preço e corredor", async () => {
  await a.page.getByRole("button", { name: `Editar Leite ${run}` }).click();
  const d = a.page.getByRole("dialog");
  await d.getByLabel("Preço").fill("5,49");
  await d.getByRole("button", { name: "Salvar" }).click();
  await a.page.getByRole("status").filter({ hasText: "Item salvo." }).waitFor();
  await a.page.getByText("R$ 5,49").first().waitFor();
});

await test("Modo supermercado e finalizar compra (pendentes vão para nova lista)", async () => {
  await a.page.goto(`${listUrl}?modo=super`);
  await a.page.getByRole("heading", { name: "No mercado" }).waitFor();
  await a.page.getByRole("button", { name: `Pegar Leite ${run}` }).click();
  await a.page.getByRole("region", { name: "No carrinho" }).getByText(`Leite ${run}`).waitFor();
  await shot(a.page, "mercado-super");
  await a.page.getByRole("button", { name: "Finalizar compra" }).click();
  const d = a.page.getByRole("dialog", { name: "Finalizar compra" });
  await d.getByLabel("Valor total (R$)").fill("87,30");
  await d.getByLabel("Onde").fill(`Mercado ${run}`);
  await d.getByRole("button", { name: "Registrar compra" }).click();
  await a.page.waitForURL(`${BASE}/mercado`);
  listUrl = null;
  await a.page.getByText(`Mercado ${run}`).waitFor();
  assert.match(await a.page.locator("li").filter({ hasText: `Mercado ${run}` }).innerText(), /87,30/);
  // itens não pegos foram para a nova lista (a mais recente)
  await a.page.locator("main a").filter({ hasText: "Nós" }).last().click();
  await a.page.getByText(`Detergente ${run}`).waitFor();
  assert.equal(await a.page.getByRole("button", { name: `Pegar Leite ${run}` }).count(), 0);
});

await test("Sugestões vêm do que já foi comprado", async () => {
  await a.page.getByRole("button", { name: `+ Leite ${run}` }).waitFor();
});

await test("Registrar (+): adicionar ao mercado em poucos toques", async () => {
  await a.page.goto(`${BASE}/`);
  const t0 = Date.now();
  await a.page.getByRole("navigation", { name: "Principal" }).getByRole("button", { name: "Registrar" }).click();
  await a.page.getByRole("dialog").getByRole("textbox", { name: "Adicionar à lista" }).fill(`sabão ${run}`);
  await a.page.getByRole("dialog").getByRole("button", { name: "Adicionar", exact: true }).click();
  await a.page.getByRole("status").filter({ hasText: `Sabão ${run}` }).waitFor();
  console.log(`    (tempo de interação simulada: ${Date.now() - t0} ms)`);
});

await close();
summary();
