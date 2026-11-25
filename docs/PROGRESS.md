# Progresso

_Atualizado em 2026-11-25 (fim da sessão longa). Status: `implementado` · `testado (unidade/banco/E2E)` · `validado no iPhone`._

**No ar:** https://finch-ecru.vercel.app · branch `claude/lucid-rubin-r0jdza` (produção da Vercel).
**O que depende do Jabez:** [PENDENCIAS_JABEZ.md](PENDENCIAS_JABEZ.md) · **Roteiro no iPhone:** [TESTES_IPHONE.md](TESTES_IPHONE.md)

## Módulos

| Módulo | Status | Testes |
|---|---|---|
| Fundação: login e-mail+senha, convite, espaços pessoal/Nós, RLS, perfil, ajustes | implementado; login e push **validados no iPhone do Jabez** | SQL (RLS) + E2E |
| PWA: manifest, ícones, SW (offline, push, deep link, atualização) | implementado; instalação validada no iPhone | E2E (corrigido bug de recarregar na 1ª instalação) |
| Notificações: fila, cron 1 min, silêncio, retry, relevância, planejador | implementado; push validado no iPhone (0,5 s / 1,2 s) | unidade + SQL |
| Água: 1 toque, desfazer, meta ≤ 5 L, histórico, lembretes que param na meta | testado | unidade + SQL + E2E |
| Hábitos: feito/quantidade, dias/X por semana, lembrete, consistência sem punição | testado | unidade + SQL + E2E |
| Fila offline (IndexedDB → `/api/sync`, idempotente) para água, hábitos, tarefas, mercado | testado (modo avião simulado) | unidade + E2E |
| Tarefas: recorrência, ocorrências independentes, rodízio, subtarefas, adiar, quadro, busca, adição rápida em PT | testado | unidade + SQL + E2E |
| Agenda: dia/semana/mês, eventos recorrentes e de vários dias, conflitos, lembrete antecipado, tarefas na agenda | testado | unidade + SQL + E2E |
| Mercado: listas do casal **em tempo real**, offline, corredores, modo supermercado, finalizar compra, histórico de preço | testado com 2 usuários simultâneos | unidade + SQL + E2E |
| Álbum de figurinhas: pontos por triggers, teto diário, pacotinhos, sorteio determinístico, especiais, presente e troca | testado | SQL + E2E |
| Financeiro (núcleo): contas, cartões, parcelas, faturas, previsto/realizado, divisão do casal, acerto, orçamento, lançamento rápido, compra → despesa | testado | unidade + SQL (regras da spec) + E2E |
| Treino: biblioteca (26 exercícios + próprios), fichas, execução com séries **offline**, descanso pelo relógio (sobrevive a recarregar/bloquear), histórico, recordes (1RM estimado), +30 pontos no álbum | testado | unidade + SQL + E2E (modo avião) |
| Saúde: peso, cintura, sono, humor; tendência de peso e sono médio; privado | testado | unidade + SQL + E2E |
| Cozinha: despensa com mínimo e validade, Repor → lista, receitas (porções escaláveis) → lista pulando o que tem em casa, cardápio da semana → lista; compra finalizada repõe a despensa | testado com 2 usuários | unidade + SQL + E2E |
| Nós: datas especiais com contagem (29/02 tratado) e aviso no Hoje, lugares (queremos ir/fomos com nota), memórias em linha do tempo | testado com 2 usuários | unidade + SQL + E2E |
| Metas pessoais ou do casal: soma atômica (os dois ao mesmo tempo), ritmo por semana até o prazo, +50 pontos ao bater | testado com 2 usuários | unidade + SQL + E2E |
| Finanças 2: recorrentes (salário, aluguel, assinaturas) que entram sozinhos como previsto, relatório de 6 meses e categorias vs. mês anterior, exportação CSV para Excel | testado | unidade + SQL + E2E |
| Assistente Finch (aba do passarinho): conversa, resumo do dia, finanças do mês, cria tarefa, registra água, põe itens no mercado; dinheiro só com cartão de confirmação; cota diária por pessoa; **falta a chave de IA** | testado com API falsa local (laço completo até o banco) | unidade + SQL + E2E |
| Hoje: frase por regras com água/hábitos/tarefas/eventos; listas do dia; avisos | testado | E2E |

## Números (25/11)
- `npm test`: **66** testes de unidade passando.
- `npm run test:db`: **12** suítes SQL (RLS, saúde, tarefas, agenda, mercado, álbum, financeiro, recorrências, treinos, cozinha, nós e metas, uso da IA) passando, cada uma em banco limpo.
- `npm run test:e2e`: **86** testes de ponta a ponta (12 suítes) passando (iPhone 15 simulado, 2 usuários de teste, Supabase de produção).
- `lint`, `typecheck`, `build`: passando.

## Desempenho (25/11, medido no site publicado, iPhone 15 simulado)
Relato do Jabez: toques "demoram e às vezes não vão", principalmente na barra.
| | Antes | Depois |
|---|---|---|
| Resposta ao toque na barra | 1.000–1.300 ms sem nada na tela | **45–69 ms** (esqueleto pré-carregado) |
| Servidor Hoje / Tarefas / Finanças | 1.958 / 813 / 778 ms | 709 / 359 / 419 ms |
Causas e correções: sem estado de carregamento (`loading.tsx`); funções na Vercel longe do banco (agora `pdx1`, ao lado do Supabase `us-west-2`); consultas repetidas e gravação de ocorrências a cada abertura (cache por requisição; cron materializa); recarregamentos a cada sincronização (agrupados); `touch-action: manipulation`.

## Bugs encontrados e corrigidos pelos testes
- Service worker recarregava a página na 1ª instalação (apagava o login).
- Tabelas sem GRANT para a API ("permission denied") — projeto Supabase novo não expõe por padrão (D-020).
- Tempo real entrava como anônimo antes da sessão carregar (sem eventos) — agora autentica antes de assinar.
- Janela de detalhe de tarefa mostrava dados velhos após salvar subtarefa.
- Consistência de hábito contava dias antes do hábito existir.
- Fila offline: op feita durante um envio esperava o próximo gatilho; e ao reabrir o app a fila voltava fora de ordem (chave = uuid), então "apagar" podia ser aplicado antes de "adicionar" e o item reaparecia. Afetava hábitos também. Corrigido na fila (vale para todos os módulos).
- Animação de entrada das telas prendia elementos fixos (barra do chat, botões presos embaixo) no meio da tela.
- Chamadas à API sem sessão recebiam a página de login (HTML) em vez de 401; afetava a fila offline com sessão expirada.
- Campo do chat perdia o que foi digitado antes da tela terminar de carregar; texto longo sem espaço vazava da bolha.
- Confirmar ou cancelar a 2ª/3ª parcela de uma compra falhava em silêncio (o validador recusava ids gerados pelo banco).
- Sugestões do mercado escondiam o que acabou de ser comprado quando havia empate de contagem.
- Finalizar compra com o mesmo item repetido na lista ("arroz" e "Arroz") dava erro no banco.
- Campos de carga/reps vazavam da tela no iPhone e cobriam o botão de registrar série.
- "1,5 l" virava dois itens; "água" sem categoria (limite de palavra sem acento no JS).

## Não feito / limitações conhecidas
- **Validação no iPhone** de tudo que veio depois do push (ver roteiro). Duda ainda não entrou.
- Abrir o app **do zero sem internet** mostra a página offline (telas não são cacheadas por conterem dados pessoais); com o app aberto, registrar offline funciona.
- Financeiro: importação de extrato (CSV/OFX), evolução patrimonial e simulações ainda não. Recorrências são geradas ao abrir Finanças (até o mês que vem).
- Lente global Tudo/Eu/Nós (D-011): por ora cada tela tem o seletor do espaço onde faz sentido.
- Treino: fotos de evolução (Storage privado), substituições de exercício e RPE ainda não. Iniciar sessão precisa de internet (as séries não).
- Nós: fotos nas memórias e lembrete push das datas especiais ainda não (aparecem no Hoje 7 dias antes). Metas ainda não puxam valores sozinhas do financeiro/treino.
- Assistente: validado só com API falsa (sem custo). Com a chave real, testar no iPhone; leitura de comprovante por foto e relatório semanal automático ainda não.
- Artes das figurinhas usam ícones Lucide (licença ISC) em composição própria; podem ganhar ilustrações exclusivas depois.
- `npm audit` com avisos em dependências de desenvolvimento.

## Próximos passos sugeridos
1. Jabez roda o [roteiro no iPhone](TESTES_IPHONE.md) e convida a Duda.
2. Testar o treino no iPhone na academia (sinal ruim é o caso real do modo offline).
4. Colocar a chave de IA e conversar com o Finch no iPhone.
