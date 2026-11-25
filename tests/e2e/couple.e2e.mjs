import { assert, B, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Nós e metas");
const run = Date.now() % 100000;
const a = await phone();
const b = await phone(B);
const toast = (page, t) => page.getByRole("status").filter({ hasText: t }).first().waitFor();
const iso = (d) => d.toISOString().slice(0, 10);
const inDays = (n) => iso(new Date(Date.now() - 3 * 3600e3 + n * 864e5)); // dia em São Paulo

await test("Data especial: contagem e aviso no Hoje dos dois", async () => {
  await a.page.goto(`${BASE}/vida/nos`);
  await a.page.getByRole("button", { name: "Nova data" }).click();
  await a.page.getByLabel("O quê").fill(`Namoro ${run}`);
  const past = new Date(Date.now() - 3 * 3600e3 + 3 * 864e5);
  past.setUTCFullYear(past.getUTCFullYear() - 4);
  await a.page.getByLabel("Quando").fill(iso(past));
  await a.page.getByRole("button", { name: "Guardar" }).click();
  await toast(a.page, "Data guardada.");
  const card = a.page.locator("li").filter({ hasText: `Namoro ${run}` });
  await card.waitFor();
  assert.match(await card.innerText(), /em 3 dias · 4 anos/);
  await b.page.goto(`${BASE}/`);
  await b.page.getByRole("link", { name: new RegExp(`Namoro ${run}`) }).waitFor();
});

await test("Lugares: queremos ir → fomos com nota", async () => {
  await a.page.goto(`${BASE}/vida/nos?v=lugares`);
  await a.page.getByRole("button", { name: "Novo lugar" }).click();
  await a.page.getByRole("textbox", { name: "Lugar" }).fill(`Sushi ${run}`);
  await a.page.getByRole("button", { name: "Guardar" }).click();
  await toast(a.page, "Na lista de vocês.");
  await a.page.getByRole("region", { name: "Queremos ir" }).getByText(`Sushi ${run}`).waitFor();
  await a.page.locator("li").filter({ hasText: `Sushi ${run}` }).getByRole("button", { name: "Fomos" }).click();
  await toast(a.page, `Sushi ${run}: fomos!`);
  const been = a.page.getByRole("region", { name: "Já fomos" });
  await been.getByText(`Sushi ${run}`).waitFor();
  await been.getByRole("group", { name: `Nota para Sushi ${run}` }).getByRole("button", { name: "3 estrelas" }).click();
  await been.getByRole("group", { name: `Nota para Sushi ${run}` }).getByRole("button", { name: "4 estrelas", pressed: false }).waitFor();
});

await test("Memórias: guardada e visível para a parceira", async () => {
  await a.page.goto(`${BASE}/vida/nos?v=memorias`);
  await a.page.getByRole("button", { name: "Nova memória" }).click();
  await a.page.getByLabel("Título").fill(`Piquenique ${run}`);
  await a.page.getByLabel("Como foi").fill("Sol, sanduíche e risada.");
  await a.page.getByRole("button", { name: "Guardar" }).click();
  await toast(a.page, "Memória guardada.");
  await b.page.goto(`${BASE}/vida/nos?v=memorias`);
  await b.page.getByText(`Piquenique ${run}`).waitFor();
  await b.page.getByText("Sol, sanduíche e risada.").first().waitFor();
});

await test("Meta do casal: os dois somam, bate e dá pontos", async () => {
  await a.page.goto(`${BASE}/vida/metas`);
  if (!(await a.page.getByRole("region", { name: "Nova meta" }).count())) await a.page.getByRole("button", { name: "Nova meta" }).click();
  await a.page.getByLabel("Meta", { exact: true }).fill(`Reserva ${run}`);
  await a.page.getByLabel("Alvo").fill("1.000");
  await a.page.getByLabel("Unidade").fill("R$");
  await a.page.getByLabel("Prazo (opcional)").fill(inDays(28));
  await a.page.getByRole("button", { name: "Criar meta" }).click();
  await toast(a.page, "Meta criada.");
  await a.page.getByLabel(`Somar em Reserva ${run}`).fill("400");
  await a.page.getByLabel(`Somar em Reserva ${run}`).press("Enter");
  await toast(a.page, "Progresso salvo.");
  const bar = a.page.getByRole("progressbar", { name: `Progresso de Reserva ${run}` });
  await a.page.waitForFunction((n) => document.querySelector(`[aria-label="Progresso de ${n}"]`)?.getAttribute("aria-valuenow") === "40", `Reserva ${run}`);
  assert.match(await a.page.locator("li").filter({ hasText: `Reserva ${run}` }).innerText(), /por semana para chegar no prazo/);
  await b.page.goto(`${BASE}/vida/metas`);
  await b.page.getByLabel(`Somar em Reserva ${run}`).fill("600,00");
  await b.page.getByRole("button", { name: "Somar" }).first().click();
  await toast(b.page, `Meta batida: Reserva ${run}!`);
  await b.page.getByText("Batida! +50 pontos no álbum.").first().waitFor();
  assert.ok(bar);
});

await test("Meta pessoal não aparece para a parceira", async () => {
  await a.page.goto(`${BASE}/vida/metas`);
  await a.page.getByRole("button", { name: "Nova meta" }).click();
  await a.page.getByLabel("Meta", { exact: true }).fill(`Ler ${run}`);
  await a.page.getByLabel("Alvo").fill("12");
  await a.page.getByLabel("De quem").selectOption({ label: "Só eu" });
  await a.page.getByRole("button", { name: "Criar meta" }).click();
  await toast(a.page, "Meta criada.");
  await b.page.goto(`${BASE}/vida/metas`);
  await b.page.getByRole("heading", { name: "Metas" }).waitFor();
  assert.equal(await b.page.getByText(`Ler ${run}`).count(), 0);
});

await test("Limpeza: apaga o que o teste criou", async () => {
  for (const [url, label] of [[`/vida/nos`, `Apagar Namoro ${run}`], [`/vida/nos?v=lugares`, `Apagar Sushi ${run}`], [`/vida/nos?v=memorias`, `Apagar Piquenique ${run}`], [`/vida/metas`, `Apagar Reserva ${run}`], [`/vida/metas`, `Apagar Ler ${run}`]]) {
    await a.page.goto(`${BASE}${url}`);
    await a.page.getByRole("button", { name: label }).click();
    await a.page.getByRole("status").first().waitFor();
    await a.page.waitForTimeout(400);
  }
  await a.page.goto(`${BASE}/vida/metas`);
  assert.equal(await a.page.getByText(`Reserva ${run}`).count(), 0);
});

await close();
summary();
