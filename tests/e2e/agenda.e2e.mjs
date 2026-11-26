import { assert, B, BASE, close, phone, shot, summary, test } from "./lib.mjs";

console.log("Agenda");
const run = Date.now() % 100000;
const { page } = await phone();
const quick = async (text) => {
  await page.getByRole("textbox", { name: "Novo compromisso" }).fill(text);
  await page.getByRole("button", { name: "Adicionar compromisso" }).click();
  await page.getByRole("status").filter({ hasText: "Na agenda:" }).last().waitFor();
};

await test("Adição rápida cria evento com hora (dia)", async () => {
  await page.goto(`${BASE}/agenda`);
  await quick(`Dentista ${run} hoje 23h`);
  const row = page.getByRole("button", { name: new RegExp(`Dentista ${run}`) });
  await row.waitFor();
  assert.match(await row.innerText(), /23:00/);
});

await test("Conflito é sinalizado", async () => {
  await quick(`Call ${run} hoje 23h`);
  await page.getByRole("button", { name: new RegExp(`Call ${run}`) }).getByText("conflito").waitFor();
  await shot(page, "agenda-dia");
});

await test("Evento compartilhado recorrente aparece para B", async () => {
  await quick(`Jantar ${run} toda sexta 20h @nós`);
  await page.goto(`${BASE}/agenda?v=mes`);
  await shot(page, "agenda-mes");
  const b = await phone(B);
  await b.page.goto(`${BASE}/agenda?v=semana`);
  await b.page.getByText(`Jantar ${run}`).first().waitFor();
  assert.equal(await b.page.getByText(`Dentista ${run}`).count(), 0);
  await b.ctx.close();
});

await test("Editar pelo formulário (dia inteiro, vários dias)", async () => {
  await page.goto(`${BASE}/agenda`);
  await page.getByRole("button", { name: new RegExp(`Dentista ${run}`) }).click();
  const d = page.getByRole("dialog");
  await d.getByRole("textbox", { name: "Título" }).fill(`Viagem ${run}`);
  await d.getByRole("switch", { name: "Dia inteiro" }).check();
  const today = await d.getByLabel("Começa").inputValue();
  const end = new Date(Date.parse(`${today}T12:00:00Z`) + 2 * 86400000).toISOString().slice(0, 10);
  await d.getByLabel("Termina").fill(end);
  await d.getByRole("button", { name: "Salvar" }).click();
  await page.getByRole("status").filter({ hasText: "Evento salvo." }).waitFor();
  const row = page.getByRole("button", { name: new RegExp(`Viagem ${run}`) });
  assert.match(await row.innerText(), /dia 1 de 3/);
});

await test("Tarefas com data aparecem na agenda", async () => {
  await page.goto(`${BASE}/tarefas`);
  await page.locator("main").getByRole("textbox", { name: "Nova tarefa" }).fill(`Pagar boleto ${run} hoje`);
  await page.locator("main").getByRole("button", { name: "Criar tarefa" }).click();
  await page.getByRole("status").filter({ hasText: "Criada:" }).waitFor();
  await page.goto(`${BASE}/agenda`);
  await page.getByText(`Pagar boleto ${run}`).waitFor();
});

await test("Hoje mostra o compromisso do dia", async () => {
  await page.goto(`${BASE}/`);
  await page.getByRole("list", { name: "Agenda de hoje" }).getByText(`Call ${run}`).waitFor();
});

await test("Apagar evento", async () => {
  await page.goto(`${BASE}/agenda`);
  await page.getByRole("button", { name: new RegExp(`Call ${run}`) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Apagar evento" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Toque de novo para apagar" }).click();
  await page.getByRole("status").filter({ hasText: "Evento apagado" }).waitFor();
  await page.getByRole("button", { name: new RegExp(`Call ${run}`) }).waitFor({ state: "detached" });
  await page.reload();
  assert.equal(await page.getByRole("button", { name: new RegExp(`Call ${run}`) }).count(), 0);
});

await close();
summary();
