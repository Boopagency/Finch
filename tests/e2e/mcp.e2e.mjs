// MCP do Finch: faz o papel do Claude (cliente OAuth público com PKCE) do começo ao fim.
import { createHash, randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { A, assert, BASE, close, PASSWORD, phone, summary, test } from "./lib.mjs";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

console.log("MCP para o Claude");
const run = Date.now() % 100000;
const REDIRECT = "http://localhost:9/callback";
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const state = `st-${run}`;
let clientId, tokens;
const rpc = async (token, method, params, id = 1) => {
  const r = await fetch(`${BASE}/api/mcp`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  return { status: r.status, headers: r.headers, body: r.status === 202 ? null : await r.json() };
};
const form = (o) => new URLSearchParams(o).toString();

await test("Descoberta: 401 aponta para os metadados do OAuth", async () => {
  const r = await rpc(null, "initialize", {});
  assert.equal(r.status, 401);
  const meta = r.headers.get("www-authenticate").match(/resource_metadata="([^"]+)"/)[1];
  const pr = await (await fetch(meta)).json();
  assert.equal(pr.resource, `${BASE}/api/mcp`);
  const as = await (await fetch(`${pr.authorization_servers[0]}/.well-known/oauth-authorization-server`)).json();
  assert.equal(as.token_endpoint, `${BASE}/api/oauth/token`);
  assert.deepEqual(as.code_challenge_methods_supported, ["S256"]);
  assert.equal((await fetch(`${BASE}/api/mcp`)).status, 405);
});

await test("Registro dinâmico aceita localhost/https e recusa outros", async () => {
  const bad = await fetch(`${BASE}/api/oauth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ redirect_uris: ["http://evil.com/cb"] }) });
  assert.equal(bad.status, 400);
  const r = await fetch(`${BASE}/api/oauth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_name: `Teste MCP ${run}`, redirect_uris: [REDIRECT] }) });
  assert.equal(r.status, 201);
  clientId = (await r.json()).client_id;
  assert.match(clientId, /^mcp_/);
});

const authorizeUrl = () =>
  `${BASE}/oauth/authorize?${form({ response_type: "code", client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: "S256", state, resource: `${BASE}/api/mcp` })}`;

await test("Sem login: entra e volta para a autorização; senha errada é recusada; Permitir devolve o código", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 13"], locale: "pt-BR" });
  const page = await ctx.newPage();
  let back = null;
  await page.route("http://localhost:9/**", (route) => { back = route.request().url(); route.fulfill({ body: "ok" }); });
  await page.goto(authorizeUrl());
  await page.waitForURL(/\/entrar\?next=/);
  await page.getByLabel("E-mail").fill(A);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.getByRole("heading", { name: `Teste MCP ${run} quer acessar seu Finch` }).waitFor();
  await page.getByLabel("Confirme com sua senha").fill("senha-errada");
  await page.getByRole("button", { name: "Permitir" }).click();
  await page.getByRole("alert").filter({ hasText: "Senha não confere." }).waitFor();
  await page.getByLabel("Confirme com sua senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Permitir" }).click();
  for (let i = 0; i < 50 && !back; i++) await page.waitForTimeout(200);
  await browser.close();
  assert.ok(back, "voltou para o Claude");
  const u = new URL(back);
  assert.equal(u.searchParams.get("state"), state);
  const code = u.searchParams.get("code");
  assert.ok(code);

  // verifier errado não troca (e consome o código)
  const t = (v, c) => fetch(`${BASE}/api/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form({ grant_type: "authorization_code", code: c, client_id: clientId, redirect_uri: REDIRECT, code_verifier: v }) });
  const wrong = await t(randomBytes(32).toString("base64url"), code);
  assert.equal(wrong.status, 400);
  assert.equal((await wrong.json()).error, "invalid_grant");
});

await test("Troca do código com PKCE certo; código não vale duas vezes", async () => {
  // a anterior consumiu o código com verifier errado: autoriza de novo, agora já logado
  const { page } = await phone();
  let back = null;
  await page.route("http://localhost:9/**", (route) => { back = route.request().url(); route.fulfill({ body: "ok" }); });
  await page.goto(authorizeUrl());
  await page.getByLabel("Confirme com sua senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Permitir" }).click();
  for (let i = 0; i < 50 && !back; i++) await page.waitForTimeout(200);
  const code = new URL(back).searchParams.get("code");
  const body = form({ grant_type: "authorization_code", code, client_id: clientId, redirect_uri: REDIRECT, code_verifier: verifier });
  const ok = await fetch(`${BASE}/api/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  assert.equal(ok.status, 200);
  tokens = await ok.json();
  assert.equal(tokens.token_type, "Bearer");
  const again = await fetch(`${BASE}/api/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  assert.equal(again.status, 400);
});

await test("MCP: inicializa, lista ferramentas e lê o dia como a pessoa", async () => {
  const init = await rpc(tokens.access_token, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "teste", version: "1" } });
  assert.equal(init.status, 200);
  assert.equal(init.body.result.serverInfo.name, "finch");
  assert.equal((await rpc(tokens.access_token, "notifications/initialized", undefined, undefined)).status, 202);
  const list = await rpc(tokens.access_token, "tools/list", {});
  const names = list.body.result.tools.map((t) => t.name);
  for (const n of ["get_today", "list_tasks", "get_agenda", "log_water", "log_expense", "create_task"]) assert.ok(names.includes(n), n);
  const today = await rpc(tokens.access_token, "tools/call", { name: "get_today", arguments: {} });
  assert.equal(today.body.result.isError, false);
  assert.ok(JSON.parse(today.body.result.content[0].text).today);
  const bad = await rpc(tokens.access_token, "tools/call", { name: "log_water", arguments: { amount_ml: 250, user_id: "x" } });
  assert.equal(bad.body.result.isError, true, "campo extra (user_id) recusado");
});

await test("MCP: registrar água e criar tarefa aparecem no app", async () => {
  const w = await rpc(tokens.access_token, "tools/call", { name: "log_water", arguments: { amount_ml: 250 } });
  assert.equal(w.body.result.isError, false);
  const t = await rpc(tokens.access_token, "tools/call", { name: "create_task", arguments: { text: `Tarefa via Claude ${run} hoje` } });
  assert.equal(t.body.result.isError, false);
  const { page } = await phone();
  await page.goto(`${BASE}/tarefas`);
  await page.getByText(`Tarefa via Claude ${run}`).first().waitFor();
  await page.goto(`${BASE}/vida/agua`);
  await page.getByRole("button", { name: "Remover 250 ml" }).first().waitFor();
});

await test("MCP: as outras ferramentas leem e gravam de verdade", async () => {
  const call = async (name, args = {}) => {
    const r = await rpc(tokens.access_token, "tools/call", { name, arguments: args });
    assert.equal(r.body.result.isError, false, `${name}: ${r.body.result.content[0].text}`);
    const out = JSON.parse(r.body.result.content[0].text);
    assert.notEqual(out?.ok, false, `${name}: ${r.body.result.content[0].text}`);
    return out;
  };
  assert.ok((await call("list_tasks")).some((t) => t.title.includes(`Tarefa via Claude ${run}`)));
  await call("add_shopping_items", { text: `pão claude ${run}` });
  assert.ok((await call("get_shopping_list")).items.some((i) => i.name.toLowerCase().includes(`claude ${run}`)));
  await call("create_event", { text: `Jantar Claude ${run} amanhã 20h` });
  assert.ok((await call("get_agenda")).some((e) => e.title.includes(`Jantar Claude ${run}`)));
  const pre = await call("log_expense", { text: `12 café claude ${run}` });
  assert.equal(pre.needs_confirmation, true, "dinheiro só com confirm");
  await call("log_expense", { text: `12 café claude ${run}`, confirm: true });
  assert.ok((await call("get_finances_month")) !== null);
  const r = await rpc(tokens.access_token, "tools/call", { name: "get_agenda", arguments: { from: "2026-01-01", to: "2026-12-31" } });
  assert.equal(r.body.result.isError, true, "intervalo grande recusado");
});

await test("MCP: concluir, editar e excluir (com confirmação) mudam o app", async () => {
  const call = async (name, args = {}) => {
    const r = await rpc(tokens.access_token, "tools/call", { name, arguments: args });
    assert.equal(r.body.result.isError, false, `${name}: ${r.body.result.content[0].text}`);
    return JSON.parse(r.body.result.content[0].text);
  };
  const task = (await call("list_tasks")).find((t) => t.title.includes(`Tarefa via Claude ${run}`));
  await call("update_task", { task_id: task.task_id, title: `Tarefa editada ${run}`, time: "18:30" });
  await call("complete_task", { task_id: task.task_id });
  assert.ok((await call("list_tasks", { include_done: true })).some((t) => t.title === `Tarefa editada ${run}` && t.status === "done" && t.time === "18:30"));
  const pre = await call("delete_task", { task_id: task.task_id });
  assert.equal(pre.needs_confirmation, true);
  assert.match(pre.action, new RegExp(`Tarefa editada ${run}`));
  assert.ok((await call("list_tasks", { include_done: true })).some((t) => t.task_id === task.task_id), "sem confirm não apaga");
  await call("delete_task", { task_id: task.task_id, confirm: true });
  assert.ok(!(await call("list_tasks", { include_done: true })).some((t) => t.task_id === task.task_id));

  const shop = await call("get_shopping_list");
  const item = shop.items.find((i) => i.name.toLowerCase().includes(`claude ${run}`));
  await call("check_shopping_item", { item_id: item.item_id });
  assert.ok(!(await call("get_shopping_list")).items.some((i) => i.item_id === item.item_id), "marcado sai dos pendentes");

  const ev = (await call("get_agenda")).find((e) => e.title.includes(`Jantar Claude ${run}`));
  await call("update_event", { event_id: ev.event_id, start_time: "21:00", end_time: "22:00", location: "Casa" });
  const ev2 = (await call("get_agenda")).find((e) => e.event_id === ev.event_id);
  assert.equal(ev2.start, "21:00");
  assert.equal(ev2.location, "Casa");
  await call("delete_event", { event_id: ev.event_id, confirm: true });

  const other = await rpc(tokens.access_token, "tools/call", { name: "delete_task", arguments: { task_id: "00000000-0000-4000-8000-000000000000" } });
  assert.equal(other.body.result.isError, true, "id que não é da pessoa: não encontrado");
  assert.ok((await call("get_habits")) && (await call("get_water")).goal_ml > 0 && (await call("get_kitchen")) && (await call("get_couple")) && (await call("get_finance_details")).month);
  const { page } = await phone();
  await page.goto(`${BASE}/tarefas`);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.getByText(`Tarefa editada ${run}`).count(), 0, "apagada some do app");
});

await test("Renovar token: o novo vale, o antigo não", async () => {
  const r = await fetch(`${BASE}/api/oauth/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: clientId }) });
  assert.equal(r.status, 200);
  const fresh = await r.json();
  assert.equal((await rpc(tokens.access_token, "ping", {})).status, 401);
  assert.equal((await rpc(fresh.access_token, "ping", {})).status, 200);
  tokens = fresh;
});

await test("Desconectar em Ajustes corta o acesso na hora", async () => {
  const { page } = await phone();
  await page.goto(`${BASE}/ajustes`);
  await page.getByRole("button", { name: `Desconectar Teste MCP ${run}` }).click();
  await page.getByRole("button", { name: "Toque de novo" }).click();
  await page.getByRole("status").filter({ hasText: "Acesso do Claude cortado." }).waitFor();
  assert.equal((await rpc(tokens.access_token, "ping", {})).status, 401);
});

await close();
summary();
