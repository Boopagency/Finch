// Mini-runner de E2E (sem framework): Playwright do ambiente + asserts simples.
// Requer: app rodando (E2E_BASE_URL) e usuários de teste (E2E_EMAIL_A/B, E2E_PASSWORD). Nunca use contas reais.
import { createRequire } from "node:module";
// Playwright vem do ambiente (não é dependência do projeto). CJS resolve NODE_PATH/global.
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import assert from "node:assert/strict";

export const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3100";
export const PASSWORD = process.env.E2E_PASSWORD;
export const A = process.env.E2E_EMAIL_A ?? "e2e-a@finch.test";
export const B = process.env.E2E_EMAIL_B ?? "e2e-b@finch.test";
if (!PASSWORD) throw new Error("Defina E2E_PASSWORD");
export { assert };

const results = [];
export async function test(name, fn) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    console.log(`  ✓ ${name} (${Date.now() - t0} ms)`);
  } catch (e) {
    results.push({ name, ok: false, err: e });
    console.log(`  ✗ ${name}\n    ${String(e?.message ?? e).split("\n").slice(0, process.env.E2E_VERBOSE ? 60 : 6).join("\n    ")}`);
  }
}
export function summary() {
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passaram`);
  if (failed.length) process.exitCode = 1;
}

let browser;
export async function phone(email = A) {
  browser ??= await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 15"], locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(`${BASE}/entrar`);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${BASE}/`);
  return { ctx, page };
}
export async function close() {
  await browser?.close();
}
export async function shot(page, name) {
  if (process.env.E2E_SHOTS) await page.screenshot({ path: `${process.env.E2E_SHOTS}/${name}.png` });
}
