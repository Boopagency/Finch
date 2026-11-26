// Relatório de teste de 26/11 (tela de 393 px): cada item da lista vira verificação.
import { createRequire } from "node:module";
import { A, assert, BASE, close, PASSWORD, summary, test } from "./lib.mjs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

console.log("Correções do teste no navegador");
const run = Date.now() % 100000;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: devices["iPhone 13"].userAgent, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
const page = await ctx.newPage();
await page.goto(`${BASE}/entrar`);
await page.getByLabel("E-mail").fill(A);
await page.getByLabel("Senha").fill(PASSWORD);
await page.getByRole("button", { name: "Entrar" }).click();
await page.waitForURL(`${BASE}/`);

const toast = (text) => page.getByRole("status").filter({ hasText: text }).last();
/** ms do clique até a condição. */
async function timed(act, until) {
  const t = Date.now();
  await act();
  await until();
  return Date.now() - t;
}
const times = [];

await test("Excluir tarefa: dois toques, desarma em 3 s e com toque fora, some na hora e tem Desfazer", async () => {
  await page.goto(`${BASE}/tarefas`);
  const title = `Apagar ${run}`;
  await page.locator("main").getByRole("textbox", { name: "Nova tarefa" }).fill(`${title} hoje`);
  await page.locator("main").getByRole("button", { name: "Criar tarefa" }).click();
  const row = page.locator("main li").filter({ hasText: title });
  await row.and(page.locator(":not([aria-busy])")).waitFor({ timeout: 15000 }); // servidor confirmou
  await row.getByRole("button", { name: title, exact: true }).click();
  const d = page.getByRole("dialog");
  const del = d.getByRole("button", { name: "Apagar tarefa" });
  await del.click();
  const armed = d.getByRole("button", { name: "Toque de novo para apagar" });
  await armed.waitFor();
  assert.match(await armed.getAttribute("class"), /bg-danger/);
  await page.waitForTimeout(3300);
  await del.waitFor({ timeout: 500 }); // voltou sozinho
  await del.click();
  await armed.waitFor();
  await d.getByRole("heading").first().click(); // toque fora
  await del.waitFor({ timeout: 500 });
  await del.click();
  times.push(["apagar tarefa → some", await timed(() => armed.click(), () => row.waitFor({ state: "detached" }))]);
  await toast("Tarefa apagada").getByRole("button", { name: "Desfazer" }).click();
  await row.waitFor();
  // agora de verdade: some e, depois da janela do Desfazer, sai do servidor
  await row.getByRole("button", { name: title, exact: true }).click();
  await d.getByRole("button", { name: "Apagar tarefa" }).click();
  await d.getByRole("button", { name: "Toque de novo para apagar" }).click();
  await row.waitFor({ state: "detached" });
  await page.waitForTimeout(7000);
  await page.reload();
  await page.locator("main").getByRole("textbox", { name: "Nova tarefa" }).waitFor();
  assert.equal(await row.count(), 0, "apagada no servidor");
});

await test("Mercado: remover item em dois toques, com Desfazer", async () => {
  await page.goto(`${BASE}/mercado`);
  await page.locator('main a[href^="/mercado/"]').first().click();
  await page.waitForURL(/\/mercado\/[0-9a-f-]{36}/);
  const name = `Guardanapo ${run}`;
  await page.getByRole("textbox", { name: "Adicionar à lista" }).fill(name);
  await page.getByRole("textbox", { name: "Adicionar à lista" }).press("Enter");
  const edit = page.getByRole("button", { name: `Editar ${name}` });
  await edit.click();
  const d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Remover da lista" }).click();
  times.push(["remover item → some", await timed(() => d.getByRole("button", { name: "Toque de novo para apagar" }).click(), () => edit.waitFor({ state: "detached" }))]);
  await toast("removido").getByRole("button", { name: "Desfazer" }).click();
  await edit.waitFor();
  await edit.click();
  await d.getByRole("button", { name: "Remover da lista" }).click();
  await d.getByRole("button", { name: "Toque de novo para apagar" }).click();
  await edit.waitFor({ state: "detached" });
});

/** Posição da bolinha (::before) em relação ao trilho. */
const knob = (loc) =>
  loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const tx = new DOMMatrix(getComputedStyle(el, "::before").transform).m41;
    return { on: el.checked, left: tx, right: tx + 24, width: r.width };
  });
async function checkSwitch(loc) {
  for (let i = 0; i < 2; i++) {
    await page.waitForTimeout(450);
    const k = await knob(loc);
    assert.ok(k.left >= 3 && k.right <= k.width - 3, `bolinha fora do trilho: ${JSON.stringify(k)}`);
    assert.equal(k.left, k.on ? 24 : 4);
    await loc.click();
  }
}

await test("Interruptores: bolinha dentro do trilho, ligado e desligado (Ajustes, Água, Agenda)", async () => {
  await page.goto(`${BASE}/ajustes`);
  await checkSwitch(page.getByRole("switch", { name: "Avisos de Tarefas" })); // clica 2× = volta como estava
  await page.goto(`${BASE}/vida/agua`);
  await checkSwitch(page.getByRole("switch", { name: "Lembretes de água" }));
  await page.goto(`${BASE}/agenda`);
  await page.getByRole("button", { name: "Novo evento com detalhes" }).click();
  await checkSwitch(page.getByRole("dialog").getByRole("switch", { name: "Dia inteiro" }));
});

await test("Voltar: tela-mãe quando aberta direto; histórico quando veio pelo app; alvo ≥ 44 px", async () => {
  await page.goto(`${BASE}/mercado`);
  const list = await page.locator('main a[href^="/mercado/"]').first().getAttribute("href");
  const cases = [[list, "/mercado"], ["/financas/relatorio", "/financas"], ["/financas/recorrentes", "/financas"], ["/financas/importar", "/financas"], ["/financas/contas", "/financas"], ["/ajustes", "/"], ["/vida/agua", "/vida"], ["/vida/habitos", "/vida"], ["/vida/treino", "/vida"], ["/mercado", "/vida"]];
  for (const [from, to] of cases) {
    await page.goto(`${BASE}${from}`);
    const back = page.getByRole("button", { name: "Voltar" });
    await back.waitFor();
    await page.waitForLoadState("networkidle");
    const box = await back.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `${from}: alvo ${JSON.stringify(box)}`);
    await back.click();
    await page.waitForURL(`${BASE}${to}`);
  }
  // veio pelo app: volta para onde estava (Hoje → Ajustes → ‹ = Hoje; Vida → Água → ‹ = Vida)
  await page.goto(`${BASE}/vida`);
  await page.locator('main a[href="/vida/agua"]').click();
  await page.waitForURL(`${BASE}/vida/agua`);
  await page.getByRole("button", { name: "Voltar" }).click();
  await page.waitForURL(`${BASE}/vida`);
});

await test("Hoje: rolar até um cartão deixa ele acima da barra; o toque abre a tela dele", async () => {
  await page.goto(`${BASE}/`);
  await page.getByRole("heading", { name: "Pra você" }).waitFor();
  const misses = await page.evaluate(() =>
    [...document.querySelectorAll("a.press.block")].flatMap((a) => {
      a.scrollIntoView({ block: "end" }); // o que a automação/leitor de tela faz
      const r = a.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return a.contains(hit) ? [] : [`${a.getAttribute("href")} → ${hit?.closest("a,button")?.getAttribute("aria-label") ?? hit?.tagName}`];
    }),
  );
  assert.deepEqual(misses, []);
  const card = page.locator("a.press.block").last();
  const href = await card.getAttribute("href");
  await card.evaluate((a) => a.scrollIntoView({ block: "end" }));
  const r = await card.boundingBox();
  await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
  await page.waitForURL((u) => u.pathname + u.search === href.split("#")[0] || u.href.endsWith(href));
});

await test("+ abre com foco no título (sem teclado, sem anel no X) e o aviso de tarefa sai na hora", async () => {
  await page.goto(`${BASE}/vida`);
  await page.getByRole("button", { name: "Registrar" }).click();
  const d = page.getByRole("dialog", { name: "Registrar" });
  await d.waitFor();
  await page.waitForTimeout(300);
  const focus = await page.evaluate(() => ({ tag: document.activeElement?.tagName, ring: !!document.querySelector('[aria-label="Fechar"]:focus-visible') }));
  assert.deepEqual(focus, { tag: "H2", ring: false });
  await d.getByRole("textbox", { name: "Nova tarefa" }).fill(`Mais ${run}`);
  times.push(["criar tarefa pelo + → aviso", await timed(() => d.getByRole("textbox", { name: "Nova tarefa" }).press("Enter"), () => toast(`Criada: Mais ${run}`).waitFor())]);
  await d.getByRole("button", { name: "Fechar" }).click();
});

await test("Agenda: aviso do compromisso na hora, com o dia e 'Ver'", async () => {
  await page.goto(`${BASE}/agenda`);
  await page.getByRole("textbox", { name: "Novo compromisso" }).fill(`Ev ${run} amanhã 10h`);
  const t = toast(`Na agenda: amanhã, 10:00 — Ev ${run}`);
  times.push(["criar compromisso → aviso", await timed(() => page.getByRole("button", { name: "Adicionar compromisso" }).click(), () => t.waitFor())]);
  await t.getByRole("button", { name: "Ver" }).click();
  const tomorrow = new Date(Date.now() + 86400000 - 3 * 3600000).getUTCDate();
  await page.locator('[aria-current="date"]').filter({ hasText: String(tomorrow) }).waitFor();
  await page.getByRole("button", { name: new RegExp(`Ev ${run}`) }).waitFor();
});

await test("Agenda → Mês: 9 toques seguidos nas setas trocam o mês na hora", async () => {
  await page.goto(`${BASE}/agenda?v=mes`);
  await page.waitForLoadState("networkidle"); // tela já ativa (antes disso o toque espera a hidratação)
  const h = page.locator("main h2").first();
  const worst = [];
  for (const dir of ["Próximo", "Próximo", "Próximo", "Próximo", "Próximo", "Anterior", "Anterior", "Anterior", "Anterior"]) {
    const before = await h.textContent();
    worst.push(await timed(() => page.getByRole("button", { name: dir }).click(), () => page.waitForFunction((b) => document.querySelector("main h2")?.textContent !== b, before)));
    await page.waitForTimeout(350); // tempo de um toque humano; os vizinhos já estão sendo buscados
  }
  times.push(["Agenda mês (pior de 9)", Math.max(...worst)]);
  assert.ok(Math.max(...worst) < 200, worst.join(","));
});

await test("Finanças: a seta troca o mês e mostra o esqueleto na hora", async () => {
  await page.goto(`${BASE}/financas`);
  await page.waitForLoadState("networkidle");
  const label = page.locator("main span[aria-live]");
  const before = await label.textContent();
  times.push(["Finanças mês → título", await timed(() => page.getByRole("link", { name: "Próximo mês" }).click(), () => page.waitForFunction((b) => document.querySelector("main span[aria-live]")?.textContent !== b, before))]);
  await page.getByRole("link", { name: "Próximo mês" }).waitFor();
});

await test("Tarefas: escolher a última aba deixa ela inteira na tela", async () => {
  await page.goto(`${BASE}/tarefas`);
  const nav = page.getByRole("navigation", { name: "Visões" });
  await nav.evaluate((n) => n.querySelector("button:last-child").click()); // sem a rolagem automática do Playwright
  await page.waitForTimeout(600);
  const fit = await nav.evaluate((n) => {
    const a = n.getBoundingClientRect();
    const b = n.querySelector('[aria-current="page"]').getBoundingClientRect();
    return b.left >= a.left && b.right <= a.right;
  });
  assert.ok(fit, "aba escolhida cortada");
});

await test("Dicas dos campos cabem em 393 px e horários da Água centralizados", async () => {
  const cut = [];
  await page.goto(`${BASE}/mercado`);
  const list = await page.locator('main a[href^="/mercado/"]').first().getAttribute("href");
  for (const path of ["/tarefas", "/agenda", "/mercado", list, "/financas"]) {
    await page.goto(`${BASE}${path}`);
    await page.locator("main input").first().waitFor();
    cut.push(
      ...(await page.evaluate(() => {
        const c = document.createElement("canvas").getContext("2d");
        return [...document.querySelectorAll("main input[placeholder]")].flatMap((i) => {
          const s = getComputedStyle(i);
          c.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
          const room = i.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
          return c.measureText(i.placeholder).width > room ? [`${location.pathname}: "${i.placeholder}"`] : [];
        });
      })),
    );
  }
  assert.deepEqual(cut, []);
  await page.goto(`${BASE}/vida/agua`);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator("#water_from").evaluate((i) => getComputedStyle(i).textAlign), "center");
});

console.log("    tempos:", times.map(([k, v]) => `${k} ${v} ms`).join(" · "));
await browser.close();
await close();
summary();
