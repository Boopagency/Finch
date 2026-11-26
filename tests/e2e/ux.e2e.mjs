// Fluidez e layout: o que o Jabez sentiu no iPhone 13/14 vira teste.
import { createRequire } from "node:module";
import { A, assert, BASE, close, PASSWORD, phone, summary, test } from "./lib.mjs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

console.log("Fluidez e layout");
const run = Date.now() % 100000;
const { page } = await phone();
const nav = page.getByRole("navigation", { name: "Principal" });
const PAGES = ["/", "/agenda", "/vida", "/tarefas", "/tarefas?v=quadro", "/mercado", "/financas", "/financas/contas", "/financas/recorrentes", "/financas/relatorio", "/financas/importar", "/vida/agua", "/vida/habitos", "/vida/treino", "/vida/saude", "/vida/cozinha", "/vida/cozinha?v=cardapio", "/vida/nos", "/vida/metas", "/vida/casa", "/vida/album", "/finch", "/ajustes", "/agenda?v=mes"];

await test("Nenhuma tela estoura para o lado (iPhone 13 e SE)", async () => {
  const browser = await chromium.launch();
  const bad = [];
  for (const dev of ["iPhone 13", "iPhone SE"]) {
    const ctx = await browser.newContext({ ...devices[dev], locale: "pt-BR" });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/entrar`);
    await p.getByLabel("E-mail").fill(A);
    await p.getByLabel("Senha").fill(PASSWORD);
    await p.getByRole("button", { name: "Entrar" }).click();
    await p.waitForURL(`${BASE}/`);
    for (const path of PAGES) {
      await p.goto(`${BASE}${path}`);
      await p.locator("h1").first().waitFor({ timeout: 8000 }).catch(() => {});
      // abre formulários escondidos atrás de "Nova…" para medir também os campos de data
      for (const b of await p.getByRole("button", { name: /^(Nova meta|Novo item|Nova data|Nova recorrência)$/ }).all()) await b.click().catch(() => {});
      await p.waitForTimeout(150);
      const over = await p.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const out = [...document.querySelectorAll("main input, main select, main button, main a, main nav, main form, main section, main ul, main ol, main h1, main h2, main p")].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && (r.right > w + 1 || r.left < -1) && !el.closest("[data-scroll-x]") && getComputedStyle(el).position !== "fixed";
        });
        return { page: document.documentElement.scrollWidth > w + 1, els: out.slice(0, 3).map((el) => `${el.tagName}.${String(el.className).slice(0, 40)}`) };
      });
      if (over.page || over.els.length) bad.push(`${dev} ${path}: ${over.els.join(", ") || "página larga"}`);
    }
    await ctx.close();
  }
  await browser.close();
  assert.deepEqual(bad, []);
});

await test("+ abre sem focar campo (sem teclado), continua aberto após adicionar e o aviso aparece por cima", async () => {
  await page.goto(`${BASE}/`);
  await nav.getByRole("button", { name: "Registrar" }).click();
  const sheet = page.getByRole("dialog", { name: "Registrar" });
  await sheet.waitFor();
  const focused = await page.evaluate(() => document.activeElement?.tagName + ":" + (document.activeElement?.getAttribute("aria-label") ?? ""));
  assert.equal(focused, "BUTTON:Fechar", `foco inicial em ${focused}`);
  await sheet.getByRole("textbox", { name: "Nova tarefa" }).fill(`Tarefa ux ${run}`);
  await sheet.getByRole("button", { name: "Criar tarefa" }).click();
  const t = page.getByRole("status").filter({ hasText: `Tarefa ux ${run}` });
  await t.waitFor();
  assert.ok(await sheet.isVisible(), "a folha continua aberta");
  // o aviso está na camada do topo, acima da folha: o ponto central dele é o próprio aviso
  const onTop = await t.evaluate((el) => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
  assert.ok(onTop, "aviso visível por cima da folha");
  await sheet.getByRole("button", { name: /\+\d+ ml|\+[\d,]+ L/ }).first().click();
  assert.ok(await sheet.isVisible(), "registrar água também não fecha");
});

await test("Folha fechada não bloqueia toques, e a faixa do aviso deixa o toque passar", async () => {
  await page.getByRole("dialog", { name: "Registrar" }).getByRole("button", { name: "Fechar" }).click();
  await page.waitForTimeout(450);
  const blocked = await page.evaluate(() => {
    const w = innerWidth, h = innerHeight;
    return [[w / 2, h / 2], [w / 2, h * 0.3], [10, h - 150], [w - 10, h - 150]]
      .map(([x, y]) => document.elementFromPoint(x, y))
      .filter((el) => el && (el.closest("dialog") || el.closest("[popover]") && !el.closest('[role="status"]')))
      .map((el) => el.outerHTML.slice(0, 80));
  });
  assert.deepEqual(blocked, []);
});

await test("Voltar a uma aba já vista não espera o servidor", async () => {
  await nav.getByRole("link", { name: "Agenda" }).click();
  await page.getByRole("heading", { name: "Agenda", exact: true }).waitFor();
  await nav.getByRole("link", { name: "Hoje" }).click();
  await page.getByRole("heading", { name: "Hoje", exact: true }).waitFor();
  await page.waitForTimeout(300);
  const reqs = [];
  const on = (r) => r.url().includes("_rsc") && r.headers()["next-router-prefetch"] !== "1" && reqs.push(r.url());
  page.on("request", on);
  const ms = await page.evaluate(() => new Promise((done) => {
    const t0 = performance.now();
    const mo = new MutationObserver(() => {
      if ([...document.querySelectorAll("main h1")].some((h) => h.textContent.trim() === "Agenda")) { mo.disconnect(); done(Math.round(performance.now() - t0)); }
    });
    mo.observe(document.body, { subtree: true, childList: true });
    document.querySelector('nav[aria-label="Principal"] a[href="/agenda"]').click();
  }));
  page.off("request", on);
  console.log(`    (Agenda de novo: ${ms} ms, ${reqs.length} ida(s) ao servidor)`);
  assert.equal(reqs.length, 0, "veio do cache do aparelho");
  assert.ok(ms < 300, `${ms} ms`);
});

await close();
summary();
