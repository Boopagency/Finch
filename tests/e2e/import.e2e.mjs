import { assert, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Importar extrato");
const run = Date.now() % 100000;
const { page } = await phone();
const toast = (t) => page.getByRole("status").filter({ hasText: t }).first().waitFor();
const today = new Date(Date.now() - 3 * 3600e3);
const ymd = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
const d1 = ymd(today);
const d2 = ymd(new Date(today.getTime() - 864e5));
// OFX em Windows-1252 (como os bancos exportam), com acento
const ofxText = `OFXHEADER:100
DATA:OFXSGML
ENCODING:USASCII
CHARSET:1252
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>${d1}<TRNAMT>-45.90<FITID>R${run}-1<MEMO>UBER ${run}
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>${d2}<TRNAMT>1234.56<FITID>R${run}-2<MEMO>SALÁRIO ${run}
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>${d1}<TRNAMT>-77.70<FITID>R${run}-3<MEMO>PADARIA ${run}
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
const latin1 = Buffer.from(ofxText, "latin1");
const file = { name: "extrato.ofx", mimeType: "application/x-ofx", buffer: latin1 };
const list = () => page.getByRole("list", { name: "Linhas do extrato" });

await test("Prepara conta e um gasto lançado à mão (vai parecer duplicado)", async () => {
  await page.goto(`${BASE}/financas/contas`);
  await page.getByLabel("Tipo").selectOption("checking");
  await page.getByRole("textbox", { name: "Nome" }).fill(`Banco Imp ${run}`);
  await page.getByRole("button", { name: "Cadastrar" }).click();
  await page.getByRole("status").filter({ hasText: /cadastrad/ }).last().waitFor();
  // lançamento "manual" na mesma conta, mesmo valor e dia da padaria, com outro código → deve parecer duplicado
  const iso = `${d1.slice(0, 4)}-${d1.slice(4, 6)}-${d1.slice(6, 8)}`;
  const br = `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  await page.goto(`${BASE}/financas/importar`);
  await page.getByLabel("De qual conta é o extrato?").selectOption({ label: `Banco Imp ${run}` });
  await page.getByLabel("Arquivo do extrato").setInputFiles({ name: "manual.csv", mimeType: "text/csv", buffer: Buffer.from(`data;descrição;valor\n${br};Padaria da esquina ${run};-77,70`) });
  await page.getByRole("button", { name: "Importar 1 lançamento" }).click();
  await toast("1 lançamento importado");
});

await test("Lê OFX em Windows-1252, sugere categorias e marca o possível duplicado", async () => {
  await page.goto(`${BASE}/financas/importar`);
  await page.getByLabel("De qual conta é o extrato?").selectOption({ label: `Banco Imp ${run}` });
  await page.getByLabel("Arquivo do extrato").setInputFiles(file);
  await list().waitFor();
  assert.ok(await list().getByText(`SALÁRIO ${run}`).isVisible(), "acento lido certo");
  assert.equal(await page.getByLabel(`Categoria de UBER ${run}`).inputValue(), "Transporte");
  assert.equal(await page.getByLabel(`Categoria de SALÁRIO ${run}`).inputValue(), "Salário");
  const padaria = list().locator("li").filter({ hasText: `PADARIA ${run}` });
  assert.match(await padaria.innerText(), /parece já lançado/);
  assert.equal(await page.getByLabel(`Importar PADARIA ${run}`).isChecked(), false, "duplicado vem desmarcado");
});

await test("Importa as escolhidas e elas aparecem em Finanças", async () => {
  await page.getByRole("button", { name: "Importar 2 lançamentos" }).click();
  await toast(`2 lançamentos importados em Banco Imp ${run}`);
  await page.waitForURL(`${BASE}/financas`);
  await page.locator("li").filter({ hasText: `UBER ${run}` }).first().waitFor();
  await page.locator("li").filter({ hasText: `SALÁRIO ${run}` }).first().waitFor();
});

await test("Mesmo arquivo de novo: nada duplica", async () => {
  await page.goto(`${BASE}/financas/importar`);
  await page.getByLabel("De qual conta é o extrato?").selectOption({ label: `Banco Imp ${run}` });
  await page.getByLabel("Arquivo do extrato").setInputFiles(file);
  await list().waitFor();
  assert.match(await list().locator("li").filter({ hasText: `UBER ${run}` }).innerText(), /já importado/);
  assert.equal(await page.getByLabel(`Importar UBER ${run}`).isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: /Importar 0 lançamentos/ }).isDisabled(), true);
});

await test("Arquivo que não é extrato: avisa e não quebra", async () => {
  await page.getByLabel("Arquivo do extrato").setInputFiles({ name: "foto.csv", mimeType: "text/csv", buffer: Buffer.from("isto não é um extrato") });
  await toast("Não reconheci o arquivo");
});

await close();
summary();
