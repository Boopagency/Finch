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
| Hoje: frase por regras com água/hábitos/tarefas/eventos; listas do dia; avisos | testado | E2E |

## Números (25/11)
- `npm test`: **45** testes de unidade passando.
- `npm run test:db`: **7** suítes SQL (RLS, saúde, tarefas, agenda, mercado, álbum, financeiro) passando, cada uma em banco limpo.
- `npm run test:e2e`: **47** testes de ponta a ponta passando (iPhone 15 simulado, 2 usuários de teste, Supabase de produção).
- `lint`, `typecheck`, `build`: passando.

## Bugs encontrados e corrigidos pelos testes
- Service worker recarregava a página na 1ª instalação (apagava o login).
- Tabelas sem GRANT para a API ("permission denied") — projeto Supabase novo não expõe por padrão (D-020).
- Tempo real entrava como anônimo antes da sessão carregar (sem eventos) — agora autentica antes de assinar.
- Janela de detalhe de tarefa mostrava dados velhos após salvar subtarefa.
- Consistência de hábito contava dias antes do hábito existir.
- "1,5 l" virava dois itens; "água" sem categoria (limite de palavra sem acento no JS).

## Não feito / limitações conhecidas
- **Validação no iPhone** de tudo que veio depois do push (ver roteiro). Duda ainda não entrou.
- Abrir o app **do zero sem internet** mostra a página offline (telas não são cacheadas por conterem dados pessoais); com o app aberto, registrar offline funciona.
- Financeiro: importação CSV/OFX, relatórios avançados (evolução patrimonial, projeções), simulações e recorrências financeiras automáticas (salário/aluguel) ainda não; despesas recorrentes podem ser lançadas como "previsto".
- Lente global Tudo/Eu/Nós (D-011): por ora cada tela tem o seletor do espaço onde faz sentido.
- Etapas 4–8 (treinos, saúde detalhada, casa/despensa/alimentação, viagens/memórias, assistente IA) não iniciadas.
- Artes das figurinhas usam ícones Lucide (licença ISC) em composição própria; podem ganhar ilustrações exclusivas depois.
- `npm audit` com avisos em dependências de desenvolvimento.

## Próximos passos sugeridos
1. Jabez roda o [roteiro no iPhone](TESTES_IPHONE.md) e convida a Duda.
2. Etapa 4: treinos (fichas, execução offline com cronômetro por timestamp, histórico, PRs) e evolução física.
3. Financeiro 2: recorrências (salário, aluguel, assinaturas), relatórios e importação CSV/OFX.
4. Etapa 5: despensa ligada ao mercado, rotinas da casa, receitas e plano alimentar → lista.
