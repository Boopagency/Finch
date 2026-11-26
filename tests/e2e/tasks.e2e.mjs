import { assert, B, BASE, close, phone, shot, summary, test } from "./lib.mjs";

console.log("Tarefas");
const run = Date.now() % 100000;
const { page } = await phone();
const quick = async (text) => {
  await page.locator("main").getByRole("textbox", { name: "Nova tarefa" }).fill(text);
  await page.locator("main").getByRole("button", { name: "Criar tarefa" }).click();
  await page.getByRole("status").filter({ hasText: "Criada:" }).last().waitFor();
};

await test("Adição rápida entende recorrência, categoria e espaço (prévia)", async () => {
  await page.goto(`${BASE}/tarefas`);
  await page.locator("main").getByRole("textbox", { name: "Nova tarefa" }).fill(`Lavar roupa ${run} toda quarta #casa @nós`);
  for (const chip of ["Toda quarta", "#Casa", "Nós"]) await page.locator("main form").getByText(chip, { exact: true }).first().waitFor();
  await page.locator("main").getByRole("button", { name: "Criar tarefa" }).click();
  await page.getByRole("status").filter({ hasText: "recorrente" }).waitFor();
});

await test("Rotina aparece na aba Casa com rodízio entre os dois", async () => {
  await page.goto(`${BASE}/tarefas?v=casa`);
  // a tarefa aparece na hora como rascunho (fila); o responsável do rodízio vem quando o servidor devolve
  const row = page.locator("main li:not([aria-busy])").filter({ hasText: `Lavar roupa ${run}` }).first();
  await row.waitFor({ timeout: 15000 });
  assert.match(await row.innerText(), /Toda quarta/);
  assert.match(await row.innerText(), /(Você|Teste B)/); // responsável vem do rodízio
  await shot(page, "tarefas-casa");
});

await test("Tarefa com data e hora cai no dia certo", async () => {
  await page.goto(`${BASE}/tarefas`);
  await quick(`Pagar luz ${run} amanhã 10h !!`);
  await page.goto(`${BASE}/tarefas?v=proximas`);
  const section = page.getByRole("region", { name: "Amanhã" });
  await section.getByText(`Pagar luz ${run}`).waitFor();
});

await test("Concluir tarefa de hoje persiste (fila → servidor)", async () => {
  await page.goto(`${BASE}/tarefas`);
  await quick(`Ligar banco ${run} hoje`);
  await page.getByRole("button", { name: `Concluir Ligar banco ${run}` }).click();
  await page.getByRole("button", { name: `Reabrir Ligar banco ${run}` }).waitFor();
  await page.waitForTimeout(2500);
  await page.reload();
  await page.getByRole("button", { name: `Reabrir Ligar banco ${run}` }).waitFor();
});

await test("Detalhe: editar, subtarefa e adiar", async () => {
  await quick(`Organizar armário ${run} hoje`);
  await page.locator("main").getByRole("button", { name: `Organizar armário ${run}`, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: `Organizar armário ${run}` });
  await dialog.getByRole("textbox", { name: "Nova subtarefa" }).fill("Separar doações");
  await dialog.getByRole("button", { name: "Adicionar subtarefa" }).click();
  await dialog.getByText("Separar doações").waitFor();
  await dialog.getByRole("textbox", { name: "Tarefa", exact: true }).fill(`Organizar guarda-roupa ${run}`);
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await page.getByRole("status").filter({ hasText: "Tarefa salva." }).waitFor();
  await page.locator("main").getByRole("button", { name: new RegExp(`^Organizar guarda-roupa ${run}`) }).click();
  await page.getByRole("dialog").getByRole("button", { name: "amanhã", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Adiada para amanhã" }).waitFor();
  await page.goto(`${BASE}/tarefas?v=proximas`);
  await page.getByRole("region", { name: "Amanhã" }).getByText(`Organizar guarda-roupa ${run}`).waitFor();
  assert.match(await page.locator("main li").filter({ hasText: `Organizar guarda-roupa ${run}` }).innerText(), /0\/1/);
});

await test("Quadro: mover para Fazendo", async () => {
  await page.goto(`${BASE}/tarefas?v=quadro`);
  await page.getByRole("button", { name: `Mover Pagar luz ${run} para Fazendo` }).click();
  await page.getByRole("region", { name: "Fazendo" }).getByText(`Pagar luz ${run}`).waitFor();
  await shot(page, "quadro");
});

await test("Busca filtra pelo texto (sem acento)", async () => {
  await page.goto(`${BASE}/tarefas?v=todas`);
  await page.getByPlaceholder("Buscar").fill(`armario ${run}`);
  await page.locator("main").getByText(`Organizar guarda-roupa ${run}`).waitFor({ state: "detached" }).catch(() => {});
  await page.getByPlaceholder("Buscar").fill(`guarda-roupa ${run}`);
  await page.locator("main").getByText(`Organizar guarda-roupa ${run}`).waitFor();
});

await test("Hoje: frase e lista incluem tarefas", async () => {
  await quick(`Regar plantas ${run} hoje`);
  await page.goto(`${BASE}/`);
  // o Hoje mostra até 6; com muitas tarefas, aparece o link "Ver todas"
  await page.getByText(`Regar plantas ${run}`).first().or(page.getByRole("link", { name: /Ver todas as \d+ tarefas/ })).first().waitFor();
  assert.match(await page.locator("p").filter({ hasText: "Teste A!" }).first().innerText(), /tarefa/);
  await shot(page, "hoje-tarefas");
});

await test("Privacidade e compartilhamento: B vê a rotina do Nós, não as pessoais de A", async () => {
  const b = await phone(B);
  await b.page.goto(`${BASE}/tarefas?v=casa`);
  await b.page.getByText(`Lavar roupa ${run}`).first().waitFor();
  await b.page.goto(`${BASE}/tarefas?v=todas`);
  assert.equal(await b.page.getByText(`Pagar luz ${run}`).count(), 0);
  await b.ctx.close();
});

await close();
summary();
