// Recados, bichinho e edição. Dois usuários de verdade: o que A escreve aparece para B e volta.
import { A, assert, B, BASE, close, confirmTap, phone, summary, test } from "./lib.mjs";

console.log("Recados, bichinho e edição");
const run = Date.now() % 100000;
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

const { page: a } = await phone(A);
const { page: b } = await phone(B);
const recados = (p) => p.goto(`${BASE}/vida/nos?v=recados`);
const balao = (p, texto) => p.getByRole("list", { name: "Recados" }).locator("li").filter({ hasText: texto });

await test("A manda um recado e ele chega sozinho no aparelho de B (tempo real)", async () => {
  await recados(a);
  await recados(b);
  await a.getByLabel("Escreva um recado").fill(`passa no mercado? ${run}`);
  await a.getByRole("button", { name: "Enviar recado" }).click();
  await balao(a, `passa no mercado? ${run}`).waitFor();
  // sem recarregar: o realtime traz
  await balao(b, `passa no mercado? ${run}`).waitFor({ timeout: 20000 });
});

await test("B abre e o recado fica como lido para A", async () => {
  await a.reload();
  await balao(a, `passa no mercado? ${run}`).getByLabel("Lido").waitFor({ timeout: 20000 });
});

await test("Só o autor edita e apaga; editado fica marcado", async () => {
  assert.equal(await balao(b, `passa no mercado? ${run}`).getByLabel("Editar recado").count(), 0, "B não edita recado de A");
  await balao(a, `passa no mercado? ${run}`).getByLabel("Editar recado").click();
  await a.getByLabel("Editar recado").fill(`passa na farmácia? ${run}`);
  await a.getByRole("button", { name: "Salvar" }).click();
  await balao(a, `passa na farmácia? ${run}`).getByText("editado").waitFor();
  await balao(b, `passa na farmácia? ${run}`).waitFor({ timeout: 20000 });
});

await test("Recado com foto", async () => {
  await b.getByLabel("Escolher foto").setInputFiles({ name: "jantar.png", mimeType: "image/png", buffer: PNG });
  await b.getByLabel("Escreva um recado").fill(`olha o jantar ${run}`);
  await b.getByRole("button", { name: "Enviar recado" }).click();
  await balao(b, `olha o jantar ${run}`).locator("img").waitFor();
  await balao(a, `olha o jantar ${run}`).locator("img").waitFor({ timeout: 20000 });
});

await test("Recado por ler aparece no Hoje", async () => {
  await b.getByLabel("Escreva um recado").fill(`não esquece o bolo ${run}`);
  await b.getByRole("button", { name: "Enviar recado" }).click();
  await balao(b, `não esquece o bolo ${run}`).waitFor();
  await a.goto(`${BASE}/`);
  await a.getByText(/recado(s)? esperando você/).first().waitFor();
});

await test("Apagar recado some para os dois", async () => {
  await recados(a);
  await confirmTap(a, balao(a, `passa na farmácia? ${run}`).getByLabel("Apagar recado"));
  await balao(a, `passa na farmácia? ${run}`).waitFor({ state: "detached" });
  await b.reload();
  assert.equal(await balao(b, `passa na farmácia? ${run}`).count(), 0, "sumiu para os dois");
});

// ---------------------------------------------------------------- bichinho
const bichinho = (p) => p.goto(`${BASE}/vida/nos?v=bichinho`);

await test("Adotar o bichinho: escolhe a espécie e o nome", async () => {
  await bichinho(a);
  const jaTem = await a.getByRole("button", { name: /^Editar / }).count();
  if (!jaTem) {
    await a.getByRole("button", { name: /Monstrinho/ }).click();
    await a.getByRole("textbox", { name: "Nome" }).fill("Gruso");
    await a.getByRole("button", { name: "Adotar" }).click();
  }
  await a.getByRole("region", { name: /Gruso, nível/ }).waitFor();
  await bichinho(b);
  await b.getByRole("region", { name: /Gruso, nível/ }).waitFor();
});

await test("Cuidar soma amor; o mesmo mimo no mesmo dia não soma de novo (e nunca tira)", async () => {
  const amor = async (p) => Number((await p.getByRole("region", { name: /Gruso/ }).innerText()).match(/(\d+) de amor/)[1]);
  const cuidar = async (p, nome) => {
    const antes = await amor(p);
    await p.getByRole("button", { name: nome, exact: true }).click();
    await p.waitForFunction(
      ([n, t]) => /já ganhou esse mimo hoje/.test(document.body.innerText) || !document.body.innerText.includes(`${n} de amor`) || Date.now() > t,
      [antes, Date.now() + 8000],
    );
    return (await amor(p)) - antes;
  };
  const antes = await amor(a);
  let usado = null;
  for (const nome of ["Brincar", "Comidinha", "Carinho", "Mimo"]) {
    const d = await cuidar(a, nome);
    if (d > 0) { usado = { nome, ganho: d }; break; }
    assert.equal(d, 0, `${nome} já dado hoje não pode tirar amor`);
  }
  if (!usado) {
    assert.equal(await amor(a), antes, "todos os mimos já foram dados hoje: nada muda e nada é tirado");
    return;
  }
  assert.equal(await cuidar(a, usado.nome), 0, "o segundo do mesmo tipo não soma e não tira");
  await b.reload();
  assert.ok((await cuidar(b, usado.nome)) > 0, `B tem teto próprio para ${usado.nome}`);
});

await test("O bichinho está feliz depois do carinho e aparece no histórico", async () => {
  await bichinho(a);
  await a.getByText(/Gruso está (radiante|feliz)/).waitFor();
  await a.getByRole("region", { name: "Cuidados recentes" }).getByText("Brincar").first().waitFor();
});

// ---------------------------------------------------------------- edição
await test("Editar memória: troca o texto e a foto", async () => {
  await a.goto(`${BASE}/vida/nos?v=memorias`);
  await a.getByRole("button", { name: "Nova memória" }).click();
  await a.getByRole("textbox", { name: "Título" }).fill(`Piquenique ${run}`);
  await a.getByRole("textbox", { name: "Como foi" }).fill("foi bom");
  await a.getByRole("button", { name: "Guardar" }).click();
  await a.getByText(`Piquenique ${run}`).waitFor();

  await a.getByLabel(`Editar Piquenique ${run}`).click();
  await a.getByRole("textbox", { name: "Título" }).fill(`Piquenique no parque ${run}`);
  await a.getByRole("textbox", { name: "Como foi" }).fill("foi ótimo, levamos o bolo");
  await a.locator("#m-photo").setInputFiles({ name: "parque.png", mimeType: "image/png", buffer: PNG });
  await a.getByRole("button", { name: "Salvar" }).click();
  await a.getByRole("status").filter({ hasText: "Memória atualizada." }).waitFor();
  const card = a.locator("li").filter({ hasText: `Piquenique no parque ${run}` }).first();
  await card.getByText("foi ótimo, levamos o bolo").waitFor();
  await card.locator("img").waitFor();
  await b.goto(`${BASE}/vida/nos?v=memorias`);
  await b.getByText(`Piquenique no parque ${run}`).waitFor();
});

await test("Editar data especial e lugar", async () => {
  await a.goto(`${BASE}/vida/nos?v=datas`);
  await a.getByRole("button", { name: "Nova data" }).click();
  await a.getByRole("textbox", { name: "O quê" }).fill(`Viagem ${run}`);
  await a.getByRole("textbox", { name: "Quando" }).fill("2027-03-10");
  await a.getByRole("button", { name: "Guardar" }).click();
  await a.getByText(`Viagem ${run}`).waitFor();
  await a.getByLabel(`Editar Viagem ${run}`).click();
  await a.getByRole("textbox", { name: "O quê" }).fill(`Viagem para a praia ${run}`);
  await a.getByRole("button", { name: "Salvar" }).click();
  await a.getByRole("status").filter({ hasText: "Data atualizada." }).waitFor();
  await a.getByText(`Viagem para a praia ${run}`).waitFor();

  await a.goto(`${BASE}/vida/nos?v=lugares`);
  await a.getByRole("button", { name: "Novo lugar" }).click();
  await a.getByRole("textbox", { name: "Lugar" }).fill(`Cantina ${run}`);
  await a.getByRole("button", { name: "Guardar" }).click();
  await a.getByText(`Cantina ${run}`).waitFor();
  await a.getByLabel(`Editar Cantina ${run}`).click();
  await a.getByRole("textbox", { name: "Nota (opcional)" }).fill("pedir a lasanha");
  await a.getByRole("button", { name: "Salvar" }).click();
  await a.getByRole("status").filter({ hasText: "Lugar atualizado." }).waitFor();
  await a.locator("li").filter({ hasText: `Cantina ${run}` }).first().getByText("pedir a lasanha").waitFor();
});

await test("Editar meta sem perder o progresso", async () => {
  await a.goto(`${BASE}/vida/metas`);
  await a.getByRole("button", { name: "Nova meta" }).click().catch(() => {});
  await a.getByRole("textbox", { name: "Meta" }).fill(`Reserva ${run}`);
  await a.getByRole("textbox", { name: "Alvo" }).fill("1000");
  await a.getByRole("textbox", { name: "Unidade" }).fill("R$");
  await a.getByRole("button", { name: "Criar meta" }).click();
  const card = a.locator("li").filter({ hasText: `Reserva ${run}` }).first();
  await card.waitFor();
  await card.getByLabel(`Somar em Reserva ${run}`).fill("250");
  await card.getByRole("button", { name: "Somar" }).click();
  await card.getByText("250", { exact: false }).first().waitFor();
  await card.getByLabel(`Editar Reserva ${run}`).click();
  await a.getByRole("textbox", { name: "Alvo" }).fill("2000");
  await a.getByRole("button", { name: "Salvar" }).click();
  await a.getByRole("status").filter({ hasText: "Meta atualizada." }).waitFor();
  // a lista recarrega depois da action: espera o alvo novo aparecer
  await a.locator("li").filter({ hasText: `Reserva ${run}` }).first().getByText(/2\.000/).waitFor();
  const txt = (await a.locator("li").filter({ hasText: `Reserva ${run}` }).first().innerText()).replace(/\n/g, " | ");
  assert.match(txt, /250/, `o progresso continua (${txt})`);
  assert.match(txt, /2\.000|2000/, `o alvo mudou (${txt})`);
});

await test("Editar item da casa e manutenção", async () => {
  await a.goto(`${BASE}/vida/casa`);
  await a.getByRole("button", { name: "Novo item" }).click();
  await a.getByRole("textbox", { name: "Item" }).fill(`Geladeira ${run}`);
  await a.getByRole("textbox", { name: "Valor (R$)" }).fill("3499,00");
  await a.getByRole("button", { name: "Cadastrar" }).click();
  await a.getByRole("button", { name: new RegExp(`Geladeira ${run}`) }).first().click();
  await a.getByRole("button", { name: "Manutenção", exact: true }).click();
  await a.getByRole("textbox", { name: "O que foi feito" }).fill("limpeza do filtro");
  await a.getByRole("button", { name: "Salvar manutenção" }).click();
  await a.getByText("limpeza do filtro").waitFor();
  await a.getByLabel("Editar manutenção limpeza do filtro").click();
  await a.getByRole("textbox", { name: "O que foi feito" }).fill("limpeza do filtro e do motor");
  await a.getByRole("button", { name: "Salvar manutenção" }).click();
  await a.getByRole("status").filter({ hasText: "Manutenção atualizada." }).waitFor();
  await a.getByText("limpeza do filtro e do motor").waitFor();

  await a.getByRole("button", { name: `Editar Geladeira ${run}` }).click();
  await a.getByRole("textbox", { name: "Item" }).fill(`Geladeira nova ${run}`);
  await a.getByRole("button", { name: "Salvar" }).click();
  await a.getByRole("status").filter({ hasText: "atualizado." }).waitFor();
  await a.getByRole("button", { name: new RegExp(`Geladeira nova ${run}`) }).first().waitFor();
});

await test("Limpeza: apaga o que o teste criou", async () => {
  for (const [url, label] of [
    [`/vida/nos?v=memorias`, `Apagar Piquenique no parque ${run}`],
    [`/vida/nos?v=datas`, `Apagar Viagem para a praia ${run}`],
    [`/vida/nos?v=lugares`, `Apagar Cantina ${run}`],
    [`/vida/metas`, `Apagar Reserva ${run}`],
  ]) {
    await a.goto(`${BASE}${url}`);
    const botao = a.getByLabel(label).first();
    if (await botao.count()) await confirmTap(a, botao);
  }
  await a.goto(`${BASE}/vida/casa`);
  await a.getByRole("button", { name: new RegExp(`Geladeira nova ${run}`) }).first().click();
  await confirmTap(a, a.getByRole("button", { name: `Remover Geladeira nova ${run}` }));
  await a.getByRole("button", { name: new RegExp(`Geladeira nova ${run}`) }).first().waitFor({ state: "detached" });
});

await close();
summary();
