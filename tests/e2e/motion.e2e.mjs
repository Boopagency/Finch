import { assert, BASE, close, phone, summary, test } from "./lib.mjs";

console.log("Movimento e barra");
const { page } = await phone();
const nav = page.getByRole("navigation", { name: "Principal" });
const boxes = async () =>
  (await Promise.all(["Hoje", "Agenda", "Registrar", "Vida", "Assistente Finch"].map(async (n) => {
    const el = n === "Registrar" ? nav.getByRole("button", { name: n }) : nav.getByRole("link", { name: n });
    const b = await el.boundingBox();
    return `${Math.round(b.x)}:${Math.round(b.width)}`;
  }))).join("|");

await test("A barra não se mexe ao trocar de aba (30/150/400 ms após o toque)", async () => {
  await page.waitForTimeout(800);
  const ref = await boxes();
  for (const [label, url] of [["Agenda", "/agenda"], ["Vida", "/vida"], ["Assistente Finch", "/finch"], ["Hoje", "/"]]) {
    await nav.getByRole("link", { name: label }).click();
    for (const t of [30, 150, 400]) {
      await page.waitForTimeout(t);
      assert.equal(await boxes(), ref, `mexeu ao tocar em ${label} (+${t} ms)`);
    }
    await page.waitForURL(`${BASE}${url}`);
  }
});

await test("Toque responde em menos de 200 ms (esqueleto ou tela)", async () => {
  const t0 = Date.now();
  await nav.getByRole("link", { name: "Agenda" }).click();
  await page.locator('[aria-busy="true"]').or(page.getByRole("heading", { name: "Agenda", exact: true })).first().waitFor();
  const dt = Date.now() - t0;
  assert.ok(dt < 200, `${dt} ms`);
});

await test("Aba ativa acompanha telas dentro de Vida", async () => {
  await page.goto(`${BASE}/tarefas`);
  assert.equal(await nav.getByRole("link", { name: "Vida" }).getAttribute("aria-current"), "page");
});

await test("Folha do + sobe animada e fecha", async () => {
  await nav.getByRole("button", { name: "Registrar" }).click();
  const d = page.getByRole("dialog", { name: "Registrar" });
  await page.waitForTimeout(60);
  const y1 = (await d.boundingBox()).y;
  await page.waitForTimeout(500);
  const y2 = (await d.boundingBox()).y;
  assert.ok(y1 > y2 + 50, `${y1} → ${y2}`);
  await page.keyboard.press("Escape");
  await d.waitFor({ state: "hidden" });
});

await close();
summary();
