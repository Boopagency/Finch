import { assert, B, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Treino e saúde");
const run = Date.now() % 100000;
const name = `Treino ${run}`;
const { ctx, page } = await phone();
const toast = (t) => page.getByRole("status").filter({ hasText: t }).first().waitFor();

// sobra de execução anterior: fecha a sessão aberta antes de começar
await page.goto(`${BASE}/vida/treino`);
await page.getByRole("heading", { name: "Treino" }).waitFor();
if (await page.getByRole("link", { name: /^Continuar/ }).count()) {
  await page.getByRole("link", { name: /^Continuar/ }).click();
  await page.getByRole("button", { name: "Concluir treino" }).waitFor();
  if (!(await page.getByRole("button", { name: /Apagar série/ }).count())) {
    await page.getByRole("button", { name: /Registrar série/ }).first().click();
    await page.waitForTimeout(1500);
  }
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await page.waitForURL(`${BASE}/vida/treino`);
  await page.waitForTimeout(2000);
}

await test("Cria ficha com exercício da biblioteca e um próprio", async () => {
  await page.goto(`${BASE}/vida/treino`);
  await page.getByRole("button", { name: "Nova ficha" }).click();
  await page.getByLabel("Nome da ficha").fill(name);
  await page.getByLabel("Adicionar exercício").selectOption({ label: "Supino reto" });
  await page.getByLabel("Novo exercício").fill(`Máquina ${run}`);
  await page.getByRole("button", { name: "Criar", exact: true }).click();
  await page.getByRole("list", { name: "Exercícios da ficha" }).getByText(`Máquina ${run}`).waitFor();
  await page.getByRole("button", { name: "Salvar ficha" }).click();
  await toast("Ficha criada.");
  await page.getByText(name, { exact: true }).waitFor();
});

let sessionUrl;
await test("Começa o treino e registra série com descanso", async () => {
  await page.getByRole("button", { name: `Começar ${name}` }).click();
  await page.waitForURL(/\/vida\/treino\/[0-9a-f-]{36}$/);
  sessionUrl = page.url();
  await page.getByRole("heading", { name: "Supino reto" }).waitFor();
  await page.getByLabel("Carga em kg para Supino reto").fill("40");
  await page.getByLabel("Repetições para Supino reto").fill("8");
  await page.getByRole("button", { name: "Registrar série de Supino reto" }).click();
  await toast(/Série registrada|Recorde/);
  await page.getByRole("timer").waitFor();
  await page.getByText("40 kg × 8 reps").waitFor();
});

await test("Descanso continua depois de recarregar (relógio, não contador)", async () => {
  await page.reload();
  await page.getByRole("timer").waitFor();
  const t = await page.getByRole("timer").locator("b").innerText();
  const [m, s] = t.split(":").map(Number);
  assert.ok(m * 60 + s <= 90 && m * 60 + s > 0, `restante ${t}`);
  await page.getByRole("button", { name: "Pular" }).click();
  assert.equal(await page.getByRole("timer").count(), 0);
});

await test("Série registrada sem internet sincroniza depois", async () => {
  await ctx.setOffline(true);
  await page.getByLabel("Carga em kg para Supino reto").fill("42,5");
  await page.getByRole("button", { name: "Registrar série de Supino reto" }).click();
  await page.getByText("42,5 kg × 8 reps").waitFor();
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(3000);
  await page.goto(sessionUrl);
  await page.getByText("42,5 kg × 8 reps").waitFor();
});

await test("Apagar série tira do treino", async () => {
  await page.getByLabel("Repetições para Supino reto").fill("3");
  await page.getByRole("button", { name: "Registrar série de Supino reto" }).click();
  await page.getByText("42,5 kg × 3 reps").waitFor();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Apagar série 3" }).click();
  await page.waitForTimeout(2500);
  await page.reload();
  await page.getByText("42,5 kg × 8 reps").waitFor();
  assert.equal(await page.getByText("42,5 kg × 3 reps").count(), 0);
});

await test("Concluir leva ao histórico com recordes", async () => {
  await page.getByRole("button", { name: "Concluir treino" }).click();
  await page.waitForURL(`${BASE}/vida/treino`);
  await toast("Treino concluído: 2 séries");
  await page.waitForTimeout(2500);
  await page.reload();
  await page.getByRole("region", { name: "Histórico" }).getByText(name).first().waitFor();
  await page.getByRole("region", { name: "Recordes" }).getByText("Supino reto").waitFor();
  assert.equal(await page.getByRole("link", { name: /^Continuar/ }).count(), 0);
});

await test("Saúde: registra peso, sono e humor; recusa peso inválido", async () => {
  await page.goto(`${BASE}/vida/saude`);
  await page.getByLabel("Peso (kg)").fill("abc");
  await page.locator("main").getByRole("button", { name: "Salvar" }).click();
  await page.getByRole("alert").filter({ hasText: "Peso entre" }).waitFor();
  await page.getByLabel("Peso (kg)").fill("82,5");
  await page.getByRole("textbox", { name: "Sono" }).fill("7h30");
  await page.getByText("Bem", { exact: true }).click();
  await page.locator("main").getByRole("button", { name: "Salvar" }).click();
  await toast("Registrado.");
  await page.reload();
  await page.getByRole("region", { name: "Peso" }).getByText("82,5 kg").waitFor();
  await page.getByText("82,5 kg · sono 7h30 · Bem").first().waitFor();
});

await test("Treino e saúde são privados (B não vê nada de A)", async () => {
  const { page: pb } = await phone(B);
  await pb.goto(`${BASE}/vida/treino`);
  await pb.getByRole("heading", { name: "Treino" }).waitFor();
  assert.equal(await pb.getByText(name).count(), 0);
  await pb.goto(sessionUrl);
  await pb.getByRole("heading", { name: "Não encontrado" }).waitFor();
  await pb.goto(`${BASE}/vida/saude`);
  await pb.getByRole("heading", { name: "Saúde" }).waitFor();
  assert.equal(await pb.getByText("82,5 kg · sono 7h30").count(), 0);
});

await close();
summary();
