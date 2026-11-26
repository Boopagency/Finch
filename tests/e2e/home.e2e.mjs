import { assert, B, BASE, close, phone, summary, test, confirmTap } from "./lib.mjs";

console.log("Coisas da casa");
const run = Date.now() % 100000;
const a = await phone();
const b = await phone(B);
const toast = (page, t) => page.getByRole("status").filter({ hasText: t }).first().waitFor();
const day = (n) => new Date(Date.now() - 3 * 3600e3 + n * 864e5).toISOString().slice(0, 10);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGP4z8AARwzEcQCukw/x0F8jngAAAABJRU5ErkJggg==", "base64");
const item = `Geladeira ${run}`;

await test("Cadastra item com garantia acabando e foto da nota", async () => {
  await a.page.goto(`${BASE}/vida/casa`);
  const btn = a.page.getByRole("button", { name: "Novo item" });
  await a.page.getByLabel("Item", { exact: true }).or(btn).first().waitFor();
  if (await btn.isVisible()) await btn.click();
  await a.page.getByLabel("Item", { exact: true }).fill(item);
  await a.page.getByLabel("Compra").fill(day(-300));
  await a.page.getByLabel("Valor (R$)").fill("3.499,00");
  await a.page.getByLabel("Garantia até").fill(day(20));
  await a.page.getByLabel("Foto da nota ou garantia (opcional)").setInputFiles({ name: "nota.png", mimeType: "image/png", buffer: png });
  await a.page.getByRole("button", { name: "Cadastrar" }).click();
  await toast(a.page, `${item} cadastrado.`);
  await a.page.getByRole("region", { name: "Avisos da casa" }).getByText(`${item}: garantia acaba em`).waitFor();
});

await test("Manutenção com próxima data aparece nos avisos e no Hoje da parceira", async () => {
  await a.page.getByRole("button", { name: new RegExp(item) }).click();
  await a.page.getByRole("button", { name: "Manutenção", exact: true }).click();
  await a.page.getByLabel("O que foi feito").fill("Limpeza do filtro");
  await a.page.getByLabel("Custo (R$)").fill("120");
  await a.page.getByLabel("Próxima").fill(day(5));
  await a.page.getByRole("button", { name: "Salvar manutenção" }).click();
  await toast(a.page, "Manutenção registrada.");
  await a.page.getByRole("region", { name: "Avisos da casa" }).getByText(`${item}: manutenção em`).waitFor();
  await b.page.goto(`${BASE}/`);
  await b.page.getByRole("link", { name: new RegExp(`${item}.*(Garantia|Manutenção)`) }).first().waitFor();
  await b.page.goto(`${BASE}/vida/casa`);
  await b.page.getByRole("button", { name: new RegExp(item) }).click();
  const nota = b.page.getByRole("img", { name: `Nota de ${item}` });
  await nota.waitFor();
  await b.page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await nota.elementHandle());
});

await test("Próxima manutenção antes da feita é recusada", async () => {
  await a.page.goto(`${BASE}/vida/casa`);
  await a.page.getByRole("button", { name: new RegExp(item) }).click();
  await a.page.getByRole("button", { name: "Manutenção", exact: true }).click();
  await a.page.getByLabel("O que foi feito").fill("Teste");
  await a.page.getByLabel("Próxima").evaluate((el, v) => { el.removeAttribute("min"); el.value = v; }, day(-10));
  await a.page.getByRole("button", { name: "Salvar manutenção" }).click();
  await a.page.getByRole("alert").filter({ hasText: "A próxima precisa ser depois desta." }).waitFor();
});

await test("Remover item tira avisos", async () => {
  await a.page.goto(`${BASE}/vida/casa`);
  await a.page.getByRole("button", { name: new RegExp(item) }).click();
  await confirmTap(a.page, a.page.getByRole("button", { name: `Remover ${item}` }));
  await toast(a.page, `${item} removido`);
  await a.page.reload();
  assert.equal(await a.page.getByText(item).count(), 0);
});

await close();
summary();
