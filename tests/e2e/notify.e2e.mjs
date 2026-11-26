import { assert, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Notificações: o que receber");
const { page } = await phone();
const sw = (name) => page.getByRole("switch", { name: `Avisos de ${name}` });

await test("Desligar e ligar tipos de aviso fica salvo", async () => {
  await page.goto(`${BASE}/ajustes`);
  for (const n of ["Tarefas", "Agenda"]) {
    if ((await sw(n).getAttribute("aria-checked")) === "false") {
      await sw(n).click();
      await page.getByRole("status").filter({ hasText: `${n}: avisos ligados` }).waitFor();
    }
  }
  await sw("Tarefas").click();
  await page.getByRole("status").filter({ hasText: "Tarefas: avisos desligados" }).waitFor();
  await page.reload();
  assert.equal(await sw("Tarefas").getAttribute("aria-checked"), "false");
  assert.equal(await sw("Agenda").getAttribute("aria-checked"), "true");
  await sw("Tarefas").click();
  await page.getByRole("status").filter({ hasText: "Tarefas: avisos ligados" }).waitFor();
  await page.reload();
  assert.equal(await sw("Tarefas").getAttribute("aria-checked"), "true");
});

await test("Água em Ajustes e na tela Água são o mesmo ajuste", async () => {
  await page.goto(`${BASE}/ajustes`);
  const was = await sw("Água").getAttribute("aria-checked");
  await sw("Água").click();
  await page.getByRole("status").filter({ hasText: /Água: avisos/ }).waitFor();
  await page.goto(`${BASE}/vida/agua`);
  const box = page.getByLabel("Lembretes de água");
  assert.equal(String(await box.isChecked()), was === "true" ? "false" : "true");
  await page.goto(`${BASE}/ajustes`);
  await sw("Água").click(); // volta como estava
  await page.getByRole("status").filter({ hasText: /Água: avisos/ }).waitFor();
});

await close();
summary();
