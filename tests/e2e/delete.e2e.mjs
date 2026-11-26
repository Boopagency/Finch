import { assert, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Excluir");
const run = Date.now() % 100000;
const { page } = await phone();
const toast = (t) => page.getByRole("status").filter({ hasText: t }).first().waitFor();

await test("Treino: descartar sessão aberta e excluir treino concluído (dois toques)", async () => {
  await page.goto(`${BASE}/vida/treino`);
  await page.getByRole("heading", { name: "Treino" }).waitFor();
  if (await page.getByRole("link", { name: /^Continuar/ }).count()) {
    await page.getByRole("link", { name: /^Continuar/ }).click();
  } else {
    await page.getByRole("button", { name: "Treino livre" }).click();
  }
  await page.waitForURL(/\/vida\/treino\/[0-9a-f-]{36}$/);
  const discard = page.getByRole("button", { name: "Descartar treino" });
  await discard.click();
  await page.getByRole("button", { name: "Toque de novo para descartar" }).click();
  await toast("Treino descartado");
  await page.waitForURL(`${BASE}/vida/treino`);
  assert.equal(await page.getByRole("link", { name: /^Continuar/ }).count(), 0);

  // treino concluído some do histórico
  await page.getByRole("button", { name: "Treino livre" }).click();
  await page.waitForURL(/\/vida\/treino\/[0-9a-f-]{36}$/);
  const url = page.url();
  await page.getByLabel("Outro exercício").selectOption({ label: "Flexão" });
  await page.getByLabel("Repetições para Flexão").fill("12");
  await page.getByRole("button", { name: "Registrar série de Flexão" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await page.waitForURL(`${BASE}/vida/treino`);
  await page.waitForTimeout(1500);
  await page.goto(url);
  await page.getByRole("button", { name: "Excluir este treino" }).click();
  await page.getByRole("button", { name: "Toque de novo para apagar" }).click();
  await toast("Treino excluído");
  await page.waitForURL(`${BASE}/vida/treino`);
  await page.goto(url);
  await page.getByRole("heading", { name: "Não encontrado" }).waitFor();
});

await test("Treino: excluir ficha e exercício próprio", async () => {
  await page.goto(`${BASE}/vida/treino`);
  await page.getByRole("button", { name: "Nova ficha" }).click();
  await page.getByLabel("Nome da ficha").fill(`Ficha del ${run}`);
  await page.getByLabel("Novo exercício").fill(`Exerc del ${run}`);
  await page.getByRole("button", { name: "Criar", exact: true }).click();
  await page.getByRole("list", { name: "Exercícios da ficha" }).getByText(`Exerc del ${run}`).waitFor();
  await page.getByRole("button", { name: "Salvar ficha" }).click();
  await toast("Ficha criada.");
  await page.getByRole("button", { name: `Editar Ficha del ${run}` }).click();
  await page.getByText("Exercícios que você criou").click();
  await page.getByRole("button", { name: `Excluir exercício Exerc del ${run}` }).click();
  await page.getByRole("button", { name: "Toque de novo para apagar (e o histórico)" }).click();
  await toast("Exercício excluído.");
  await page.getByRole("button", { name: `Excluir ficha Ficha del ${run}` }).click();
  await page.getByRole("button", { name: "Toque de novo para apagar" }).click();
  await toast("Ficha excluída");
  await page.reload();
  assert.equal(await page.getByText(`Ficha del ${run}`).count(), 0);
});

await test("Mercado: excluir lista", async () => {
  await page.goto(`${BASE}/mercado`);
  await page.getByRole("textbox", { name: /Nova lista/ }).fill(`Lista del ${run}`);
  await page.getByRole("textbox", { name: /Nova lista/ }).press("Enter");
  await page.getByRole("link", { name: new RegExp(`Lista del ${run}`) }).click();
  await page.waitForURL(/\/mercado\/[0-9a-f-]{36}$/);
  await page.getByRole("button", { name: `Excluir lista Lista del ${run}` }).click();
  await page.getByRole("button", { name: "Toque de novo para apagar" }).click();
  await page.waitForURL(`${BASE}/mercado`);
  await page.waitForTimeout(500);
  assert.equal(await page.getByRole("link", { name: new RegExp(`Lista del ${run}`) }).count(), 0);
});

await close();
summary();
