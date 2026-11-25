import { assert, BASE, close, phone, shot, summary, test } from "./lib.mjs";

console.log("Álbum");
const run = Date.now() % 100000;
const { page } = await phone();
const pastedCount = async () => Number((await page.locator("header").getByText(/de 60/).innerText()).split(" ")[0]);

await test("Hoje avisa do pacotinho de boas-vindas", async () => {
  await page.goto(`${BASE}/vida/album`); // garante o pacote de boas-vindas
  await page.goto(`${BASE}/`);
  await page.getByRole("link", { name: /pacotinho/ }).first().waitFor();
});

await test("Abrir pacotinho revela 3 figurinhas e cola as novas", async () => {
  await page.goto(`${BASE}/vida/album`);
  const before = await pastedCount();
  await page.getByRole("button", { name: /Abrir pacotinho/ }).click();
  const dialog = page.getByRole("dialog", { name: "Pacotinho aberto" });
  await dialog.waitFor();
  assert.equal(await dialog.locator("figure").count(), 3);
  await shot(page, "album-pacote");
  await dialog.getByRole("button", { name: "Colar no álbum" }).click();
  await page.getByRole("status").filter({ hasText: /colada|Nada novo/ }).waitFor();
  await page.reload();
  assert.ok((await pastedCount()) >= before);
});

await test("Concluir tarefa dá pontos e libera a especial 'Primeiro passo'", async () => {
  await page.goto(`${BASE}/tarefas`);
  await page.locator("main").getByRole("textbox", { name: "Nova tarefa" }).fill(`Pontuar ${run} hoje`);
  await page.locator("main").getByRole("button", { name: "Criar tarefa" }).click();
  await page.getByRole("status").filter({ hasText: "Criada:" }).waitFor();
  await page.getByRole("button", { name: `Concluir Pontuar ${run}` }).click();
  await page.waitForTimeout(2500);
  await page.goto(`${BASE}/vida/album`);
  const bar = page.getByRole("progressbar", { name: "Pontos para o próximo pacotinho" });
  assert.ok(Number(await bar.getAttribute("aria-valuenow")) > 0 || (await page.getByRole("button", { name: /Abrir pacotinho/ }).count()) > 0);
  // especial chega solta e pode ser colada
  const paste = page.getByRole("button", { name: /Colar \d+ figurinha/ });
  if (await paste.count()) {
    await paste.click();
    await page.getByRole("status").filter({ hasText: /colada/ }).waitFor();
    await page.reload();
  }
  await page.getByRole("listitem", { name: "Primeiro passo: colada" }).waitFor();
  await shot(page, "album");
});

await test("Desfazer e refazer não dá pontos em dobro", async () => {
  await page.goto(`${BASE}/vida/album`);
  const v1 = Number(await page.getByRole("progressbar", { name: "Pontos para o próximo pacotinho" }).getAttribute("aria-valuenow"));
  await page.goto(`${BASE}/tarefas`);
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: `Reabrir Pontuar ${run}` }).click();
    await page.getByRole("button", { name: `Concluir Pontuar ${run}` }).waitFor();
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: `Concluir Pontuar ${run}` }).click();
    await page.getByRole("button", { name: `Reabrir Pontuar ${run}` }).waitFor();
    await page.waitForTimeout(1500);
  }
  await page.goto(`${BASE}/vida/album`);
  const v2 = Number(await page.getByRole("progressbar", { name: "Pontos para o próximo pacotinho" }).getAttribute("aria-valuenow"));
  assert.equal(v2, v1);
});

await close();
summary();
