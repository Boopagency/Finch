import { assert, B, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Fotos");
const run = Date.now() % 100000;
// PNG 4x4 vermelho (gerado aqui para não depender de arquivo)
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGP4z8AARwzEcQCukw/x0F8jngAAAABJRU5ErkJggg==", "base64");
const file = (name) => ({ name, mimeType: "image/png", buffer: png });
const a = await phone();
const b = await phone(B);
const loaded = (img) => img.evaluate((el) => el.complete && el.naturalWidth > 0);

await test("Foto de evolução: envia, aparece e só a dona vê", async () => {
  await a.page.goto(`${BASE}/vida/saude`);
  const before = await a.page.getByRole("list", { name: "Todas as fotos" }).locator("li").count().catch(() => 0);
  await a.page.getByLabel("Nova foto de evolução").setInputFiles(file("corpo.png"));
  await a.page.getByRole("status").filter({ hasText: "Foto guardada" }).waitFor();
  await a.page.reload();
  const items = a.page.getByRole("list", { name: "Todas as fotos" }).locator("li");
  await items.first().waitFor();
  assert.equal(await items.count(), before + 1);
  const img = items.first().locator("img");
  await a.page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await img.elementHandle());
  assert.ok(await loaded(img), "imagem carrega pelo link assinado");
  const src = await img.getAttribute("src");
  assert.match(src, /token=/, "link assinado, não público");
  // a parceira não abre o link do arquivo de outro espaço pessoal sem o token, e a tela dela não mostra a foto
  const raw = src.split("?")[0].replace("/object/sign/", "/object/public/");
  assert.notEqual((await b.page.request.get(raw)).status(), 200, "bucket não é público");
  await b.page.goto(`${BASE}/vida/saude`);
  await b.page.getByRole("heading", { name: "Saúde" }).waitFor();
  assert.ok(!(await b.page.content()).includes(src.split("?")[0].split("/").pop()), "arquivo de A não aparece para B");
});

await test("Apagar foto de evolução", async () => {
  const items = a.page.getByRole("list", { name: "Todas as fotos" }).locator("li");
  const file = (await items.first().locator("img").getAttribute("src")).split("?")[0].split("/").pop();
  await items.first().getByRole("button", { name: /Apagar foto/ }).click();
  await a.page.getByRole("status").filter({ hasText: "Foto apagada" }).waitFor();
  await a.page.reload();
  await a.page.getByRole("heading", { name: "Fotos de evolução" }).waitFor();
  assert.ok(!(await a.page.content()).includes(file), "a foto apagada não aparece mais");
});

await test("Memória com foto aparece para os dois", async () => {
  await a.page.goto(`${BASE}/vida/nos?v=memorias`);
  await a.page.getByRole("button", { name: "Nova memória" }).click();
  await a.page.getByLabel("Título").fill(`Praia ${run}`);
  await a.page.getByLabel("Foto (opcional)").setInputFiles(file("praia.png"));
  await a.page.getByRole("button", { name: "Guardar" }).click();
  await a.page.getByRole("status").filter({ hasText: "Memória guardada." }).waitFor();
  await b.page.goto(`${BASE}/vida/nos?v=memorias`);
  const img = b.page.getByRole("img", { name: `Praia ${run}` });
  await img.waitFor();
  await b.page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await img.elementHandle());
});

await test("Apagar memória apaga a foto do armazenamento", async () => {
  await a.page.goto(`${BASE}/vida/nos?v=memorias`);
  const src = await a.page.getByRole("img", { name: `Praia ${run}` }).getAttribute("src");
  await a.page.getByRole("button", { name: `Apagar Praia ${run}` }).click();
  await a.page.getByRole("status").filter({ hasText: "Memória apagada" }).waitFor();
  await a.page.waitForTimeout(500);
  // o registro some na hora; o servidor de arquivos pode servir o link por alguns segundos (cache)
  let status = 200;
  for (let i = 0; i < 75 && status === 200; i++) {
    await a.page.waitForTimeout(1000);
    status = (await a.page.request.get(`${src}&nocache=${Date.now()}`)).status();
  }
  assert.notEqual(status, 200, "arquivo removido");
});

await test("Foto de perfil e foto do casal: os dois veem", async () => {
  await a.page.goto(`${BASE}/ajustes`);
  await a.page.getByLabel("Trocar foto de perfil").setInputFiles(file("eu.png"));
  await a.page.getByRole("status").filter({ hasText: "Foto de perfil atualizada." }).waitFor();
  await a.page.getByLabel("Foto do casal").first().setInputFiles(file("casal.png"));
  await a.page.getByRole("status").filter({ hasText: "Foto do casal atualizada." }).waitFor();
  await b.page.goto(`${BASE}/vida/nos`);
  const cover = b.page.getByRole("img", { name: "Foto do casal" });
  await cover.waitFor();
  await b.page.waitForFunction((el) => el.complete && el.naturalWidth > 0, await cover.elementHandle());
  // no Hoje de B, a foto de A aparece no topo
  await b.page.goto(`${BASE}/`);
  const stack = b.page.getByRole("link", { name: "Nós", exact: true });
  await stack.waitFor();
  assert.ok((await stack.locator("img").count()) >= 1, "foto de perfil de A aparece para B");
});

await close();
summary();
