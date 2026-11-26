import { assert, close, phone, shot, summary, test, BASE } from "./lib.mjs";

console.log("Água e hábitos");
const { ctx, page } = await phone();

await test("Hoje abre com o nome e a frase do dia", async () => {
  await page.getByRole("heading", { name: "Hoje" }).waitFor();
  const text = await page.locator("p").filter({ hasText: "Teste A" }).first().innerText();
  assert.match(text, /Teste A!/);
  await shot(page, "hoje");
});

await test("Água: + → +300 ml registra e o total sobe", async () => {
  await page.goto(`${BASE}/vida/agua`);
  const before = await page.locator("span.tabular b").first().innerText();
  await page.getByRole("button", { name: "Registrar" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /^\+300 ml$/ }).click();
  await page.getByRole("status").filter({ hasText: "+300 ml" }).waitFor();
  const after = await page.locator("span.tabular b").first().innerText();
  assert.notEqual(after, before);
  await shot(page, "agua-apos");
});

await test("Água: registro persiste após recarregar (sincronizou)", async () => {
  await page.waitForTimeout(1500);
  await page.reload();
  await page.getByRole("heading", { name: "Hoje" }).last().waitFor(); // seção "Hoje" da lista
  assert.ok((await page.getByRole("button", { name: /Remover 300 ml/ }).count()) >= 1);
});

await test("Água: Desfazer remove", async () => {
  const n = await page.getByRole("button", { name: /Remover 300 ml/ }).count();
  await page.getByRole("button", { name: /^\+300 ml$/ }).first().click();
  await page.getByRole("button", { name: "Desfazer" }).click();
  await page.waitForTimeout(2500);
  await page.reload();
  assert.equal(await page.getByRole("button", { name: /Remover 300 ml/ }).count(), n);
});

await test("Água offline: guarda e sincroniza ao voltar", async () => {
  const n = await page.getByRole("button", { name: /Remover 200 ml/ }).count();
  await ctx.setOffline(true);
  await page.getByRole("button", { name: /^\+200 ml$/ }).first().click();
  await page.getByText(/Sem conexão · 1 guardado/).waitFor();
  await shot(page, "offline");
  await ctx.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await page.waitForTimeout(3000);
  await page.reload();
  assert.equal(await page.getByRole("button", { name: /Remover 200 ml/ }).count(), n + 1);
});

await test("Água: salvar meta e lembretes", async () => {
  await page.getByLabel("Meta diária (ml)").fill("2500");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.getByText("Salvo.").waitFor();
  await page.getByLabel("Meta diária (ml)").fill("9000");
  await page.getByRole("button", { name: "Salvar" }).click();
  await page.getByText(/(Meta máxima|Value must be less)/).first().waitFor().catch(async () => {
    // o navegador bloqueia antes (max=5000): também é válido
    assert.equal(await page.getByLabel("Meta diária (ml)").evaluate((el) => el.validity.valid), false);
  });
});

const name = `Ler ${Date.now() % 10000}`;
await test("Hábitos: criar hábito diário", async () => {
  await page.goto(`${BASE}/vida/habitos`);
  if (await page.getByRole("button", { name: "Novo hábito" }).count()) await page.getByRole("button", { name: "Novo hábito" }).click();
  await page.getByRole("textbox", { name: "Hábito" }).fill(name);
  await page.getByRole("button", { name: "Criar hábito" }).click();
  await page.getByRole("status").filter({ hasText: "Hábito criado." }).waitFor();
  await page.getByRole("button", { name: `Marcar ${name}` }).waitFor();
});

await test("Hábitos: marcar e desmarcar", async () => {
  await page.getByRole("button", { name: `Marcar ${name}` }).click();
  await page.getByRole("button", { name: `Desmarcar ${name}` }).waitFor();
  await page.waitForTimeout(2000);
  await page.reload();
  await page.getByRole("button", { name: `Desmarcar ${name}` }).click();
  await page.getByRole("button", { name: `Marcar ${name}` }).waitFor();
  await page.waitForTimeout(2000);
  await page.reload();
  await page.getByRole("button", { name: `Marcar ${name}` }).waitFor();
  await shot(page, "habitos");
});

await test("Hábitos: quantidade semanal", async () => {
  await page.getByRole("button", { name: "Novo hábito" }).click();
  await page.getByRole("textbox", { name: "Hábito" }).fill(`${name} páginas`);
  await page.getByText("Quantidade", { exact: true }).click();
  await page.getByText("X vezes na semana").click();
  await page.getByLabel("Meta").fill("50");
  await page.getByLabel("Unidade").fill("páginas");
  await page.getByRole("button", { name: "Criar hábito" }).click();
  await page.getByRole("status").filter({ hasText: "Hábito criado." }).waitFor();
  await page.getByRole("button", { name: `Registrar ${name} páginas` }).click();
  await page.getByLabel(/Quantidade/).fill("12");
  await page.getByRole("button", { name: "Registrar páginas" }).click();
  await page.locator("main li").filter({ hasText: `${name} páginas` }).getByText(/12 de 50 páginas na semana/).waitFor();
});

await test("Privacidade: B não vê hábitos de A", async () => {
  const b = await phone((await import("./lib.mjs")).B);
  await b.page.goto(`${BASE}/vida/habitos`);
  assert.equal(await b.page.getByText(name).count(), 0);
  await b.ctx.close();
});

await test("Sem login: rotas protegidas redirecionam", async () => {
  const anon = await (await page.context().browser().newContext()).newPage();
  await anon.goto(`${BASE}/vida/agua`);
  assert.match(anon.url(), /\/entrar\?next=%2Fvida%2Fagua$/);
  const res = await anon.request.post(`${BASE}/api/sync`, { data: { ops: [] } });
  assert.ok([307, 401].includes(res.status()) || res.url().endsWith("/entrar"));
});

await ctx.close();
await close();
summary();
