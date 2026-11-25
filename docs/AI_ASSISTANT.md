# Assistente IA ("Finch")

## 1. Papel

O assistente consulta e age nos módulos por **ferramentas tipadas**. Números vêm sempre de funções determinísticas do backend; a IA interpreta, resume e conversa.

## 2. Arquitetura

```
Cliente  ──POST /api/ai/chat (SSE)──▶  Route handler
                                        ├─ autentica (sessão Supabase) → user_id, workspaces
                                        ├─ checa orçamento de uso (ai_usage)
                                        ├─ monta contexto mínimo (data, fuso, nomes, lente)
                                        ├─ AIProvider.stream(messages, tools)
                                        │     └─ tool_call → registry.execute(name, args, ctx)
                                        │            ├─ Zod valida args
                                        │            ├─ risco = read | write | financial | destructive
                                        │            ├─ read/write simples → executa com token do usuário (RLS)
                                        │            └─ demais → devolve "ação proposta" (card de confirmação)
                                        └─ grava ai_messages, ai_action_logs, ai_usage
```

- `AIProvider` é uma interface pequena (`stream`, `complete`) com um adaptador por fornecedor, escolhido por `AI_PROVIDER`. Só um adaptador será escrito até existir motivo para outro.
- O `ctx` (user_id, workspace permitido) vem da sessão. **Nenhum id de usuário vem do modelo.** Ids de entidades vindos do modelo são validados por RLS na execução.
- Sem SQL arbitrário. Cada ferramenta chama um serviço de domínio existente.

## 3. Ferramentas (lista inicial, cresce por módulo)

| Ferramenta | Risco | Etapa |
|---|---|---|
| `get_daily_summary` | read | 2 |
| `create_task`, `update_task`, `complete_task` | write | 2 |
| `create_event`, `create_reminder` | write | 2 |
| `log_water`, `log_habit` | write | 2 |
| `add_shopping_items` | write | 2 |
| `log_transaction` | financial (confirma) | 3 |
| `get_financial_summary`, `get_financial_projection` | read | 3 |
| `get_workout_history`, `plan_workouts` | read / write | 4 |
| `generate_meal_plan` | write (confirma) | 5 |
| `create_goal` | write | 6 |
| `generate_weekly_report` | read | 7 |
| `delete_*` | destructive (confirma) | — |

Confirmação obrigatória para: finanças, exclusões, ações em nome do parceiro, e qualquer chamada com ambiguidade (ex.: duas contas "Nubank").

## 4. Entrada

- **Texto**: campo do assistente e o campo livre do botão Registrar.
- **Parser determinístico primeiro**: padrões comuns ("500ml", "bebi 2 copos", "180 mercado crédito", "leite, ovos") são resolvidos sem IA. Só o que não casar vai para o modelo. Corta custo e latência.
- **Voz**: ditado do teclado do iOS (funciona em qualquer campo, sem custo) como caminho principal. Web Speech API é instável no PWA do iOS; não é dependência.
- **Imagens e documentos** (comprovantes, notas): enviados ao modelo com visão. O conteúdo extraído é tratado como **dado**, nunca como instrução (delimitado e com aviso no system prompt). O resultado vira ação proposta para confirmação.

## 5. Segurança

- Escopo de leitura = o que o usuário pode ver via RLS. Dados pessoais do parceiro nunca entram no contexto.
- Minimização: o modelo recebe agregados e nomes, não extratos completos, salvo quando a pergunta exige.
- Saúde: o system prompt proíbe diagnóstico e mudança de tratamento; respostas de saúde trazem a orientação de procurar um profissional.
- Toda ação executada vai para `ai_action_logs` (ferramenta, args, resultado, confirmado por quem).
- Proteção contra injeção: conteúdo de arquivos, páginas e textos do parceiro entra como dado citado; ferramentas de escrita disparadas a partir desse conteúdo exigem confirmação.

## 6. Custos

- `ai_usage` por usuário/mês; teto configurável (`AI_MONTHLY_BUDGET_CENTS`, a adicionar quando a Etapa 7 começar). Ao atingir 80 %: aviso; 100 %: só parser determinístico.
- Roteamento: modelo menor e barato para extração (comprovante, comandos curtos); modelo maior para conversa e relatórios.
- Cache de prompt para o system prompt e definições de ferramentas.
- Relatórios automáticos: cálculo determinístico + uma chamada curta para redação, no máximo uma por relatório.

## 7. Inteligência proativa

Regras SQL primeiro (contas vencendo, orçamento a 80 %, conflitos de agenda, tarefas atrasadas, despensa baixa). A IA só redige o texto do resumo, quando ativado.
