# Roadmap

Status possíveis: `planejado` · `em desenvolvimento` · `implementado` · `testado localmente` · `validado no iPhone` · `bloqueado`.

Mudanças em relação à sequência original (justificativa em DECISIONS.md):
- **Lista de mercado** sobe para a Etapa 2 (uso diário compartilhado, ótima prova de realtime + offline, baixo risco).
- **Álbum de figurinhas** (gamificação) entra na Etapa 2 em vez da 6: dá vida ao app cedo e é barato sobre `domain_events`.
- **Parser determinístico do Registrar** entra na Etapa 2; IA conversacional continua na 7.

## Etapa 0 — Planejamento e prova técnica
| Item | Aceite |
|---|---|
| Documentação e identidade | aprovadas pelo Jabez |
| Next.js + TS strict + Tailwind + lint + Vitest + CI no GitHub | `build`, `lint`, `test` verdes no CI |
| Supabase (projeto, CLI, primeira migration `core`) | migration aplica do zero |
| Vercel ligada ao GitHub | deploy de preview por PR, produção na `main` |
| Login por e-mail + senha | login no iPhone instalado |
| PWA instalável | abre standalone nos dois iPhones |
| Web Push | push de teste chega com app fechado nos dois — ✅ Jabez (25/11), Duda pendente |
| Supabase Cron → Vercel | push agendado chega; atraso medido — ✅ (25/11) |

## Etapa 1 — Fundação
Perfis, onboarding (nome, foto, fuso, meta de água), workspaces, convite (criar/aceitar/expirar/revogar), RLS + testes, design system base, navegação, Hoje (estrutura), configurações, infraestrutura de notificações (preferências, aparelhos, inbox), exportação e exclusão de conta.
**Aceite:** os dois vinculados, testes de RLS cobrindo pessoal × compartilhado, preferências de push funcionando.

## Etapa 2 — Rotina diária
Tarefas (+ subtarefas, projetos, etiquetas), recorrência com ocorrências e rodízio, agenda (dia/semana/mês, `calendar_items`), hábitos, água, **mercado**, Registrar (sheet + parser), notificações dessas categorias, offline (fila + sync), álbum de figurinhas (pontos, pacotinhos, trocas), frase-resumo do Hoje com itens reais.
**Aceite:** critérios 3, 4, 5 e 8 da v1 (PRD §9).
**Status (25/11):** concluída e testada (unidade, SQL, E2E). Falta validação no iPhone.

## Etapa 3 — Financeiro
Contas, categorias, razão de partidas, receitas/despesas, recorrentes, cartões, faturas, parcelas, divisão e acerto, orçamentos, projeção de saldo, relatórios, compra do mercado → despesa, exportação CSV. Importação CSV/OFX: estrutura.
**Aceite:** testes de DATABASE.md §4 passando; critérios 6 e 7 da v1. **Fim da v1.**
**Status (25/11):** núcleo implementado e testado (contas, cartões, parcelas, faturas, divisão, acerto, orçamento, compra → despesa). Faltam: recorrências financeiras, relatórios avançados, simulações, importação CSV/OFX.

## Etapa 4 — Treinos e saúde ✅
Biblioteca, fichas, execução offline, cronômetro por timestamp, histórico, PRs, evolução física com fotos privadas, registros de saúde.

## Etapa 5 — Casa e alimentação ✅
Despensa, rotinas domésticas (sobre tarefas), ativos, manutenções, documentos, receitas, plano alimentar → lista.

## Etapa 6 — Vida a dois e metas ✅
Metas vinculadas, viagens, memórias, datas, lugares, desejos, conquistas, desafios, recompensas.

## Etapa 7 — IA ✅ (assistente com ferramentas; falta a chave; fotos de comprovante e relatório automático depois)
Assistente com ferramentas, imagens/comprovantes, relatórios automáticos, sugestões proativas. Conector MCP para o Claude (D-043): pronto, aguarda a migration.

## Etapa 8 — Refinamento (em andamento: lote de fluidez de 26/11 — D-038 a D-042)
Revisão de UX, animações, performance, acessibilidade, segurança, validação em aparelhos.
