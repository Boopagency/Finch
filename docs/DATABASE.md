# Banco de dados

> Modelagem conceitual completa. As migrations são criadas **por módulo**, na etapa em que o módulo é implementado. Nada aqui existe no banco ainda.

## 1. Convenções

- PK `uuid` (`gen_random_uuid()`), aceitando id gerado no cliente para operações offline (idempotência).
- Toda tabela de dados de usuário tem `workspace_id` (FK) e `created_by` (FK `profiles`), `created_at`, `updated_at` (trigger).
- Dinheiro: `bigint` em centavos, nome terminando em `_cents`. Moeda fixa BRL por enquanto, coluna `currency` só em `accounts`.
- Datas "do dia" (água, hábito, ocorrência) usam `date` local do usuário + `tz` gravado no momento. Instantes usam `timestamptz`.
- Exclusão: soft delete (`deleted_at`) onde há histórico relevante (tarefas, finanças, treinos); hard delete no resto.
- Enums via `text` + `CHECK` (mais fácil de migrar que tipos `enum`).
- Índices: FK sempre indexada; índices parciais para filas (`WHERE status = 'pending'`).

## 2. Isolamento e RLS

Modelo: **o workspace é a fronteira de privacidade.**

```sql
-- auxiliar (security definer, search_path = '')
is_member(ws uuid) returns boolean   -- usuário atual é membro ativo de ws
```

Política padrão por tabela:
- `select/insert/update/delete`: `is_member(workspace_id)`.
- Exceções com visibilidade fina, por coluna `visibility`:
  - `private_to_creator`: só `created_by` lê (ex.: ideia de presente surpresa no workspace "Nós").
- Workspace pessoal tem um único membro, então "privado por padrão" sai de graça.
- Ninguém lê `workspace_members` de workspace do qual não é membro.
- Testes de RLS obrigatórios para cada tabela nova: usuário A não lê/escreve dado pessoal de B; ambos leem o compartilhado; anônimo não lê nada.

Referências entre workspaces: proibidas por FK, exceto **links explícitos** como `expense_splits.paid_from_posting_id`, onde o lado compartilhado só guarda o valor e o pagador; a partida na conta pessoal fica no workspace pessoal.

## 3. Domínios e tabelas

### Core
- `profiles` (id = auth.users.id, display_name, avatar_path, tz, locale)
- `user_settings` (user_id, home_layout jsonb, quiet_hours, theme, …)
- `workspaces` (id, kind `personal|shared`, name)
- `workspace_members` (workspace_id, user_id, role `owner|member`, reference_income_cents nullable, joined_at, left_at)
- `invitations` (id, workspace_id, token_hash, invited_email, expires_at, accepted_at, revoked_at, created_by)
- `activity_logs` (workspace_id, actor, entity, entity_id, action, diff jsonb)
- `attachments` (workspace_id, entity, entity_id, storage_path, mime, size)
- `domain_events` (id, type, workspace_id, actor, payload, created_at, processed_at, attempts)
- `idempotency_keys` (key, user_id, result jsonb, created_at) — para operações compostas

### Produtividade
- `recurrence_rules` (id, rrule text, dtstart, tz, until, rotation_members uuid[], rotation_index)
- `projects`, `tags`, `task_tags`
- `tasks` (workspace_id, title, notes, project_id, category, priority, assignee_id, start_date, due_at, est_time, recurrence_rule_id, status, completed_at)
- `task_occurrences` (task_id, occurs_on, due_at, assignee_id, status `open|done|skipped|snoozed`, snoozed_to, completed_by, completed_at) — UNIQUE(task_id, occurs_on)
- `subtasks` (task_id, title, done, position)
- `task_comments`
- `events` (workspace_id, title, starts_at, ends_at, all_day, category, recurrence_rule_id, location)
- `event_participants`
- view `calendar_items`

Ocorrências são materializadas numa janela móvel (hoje + 60 dias) pelo planner; ocorrências passadas nunca são regeradas.

### Financeiro (razão de partidas)
- `accounts` (workspace_id, owner_id, kind `checking|cash|wallet|investment|meal_benefit|food_benefit|credit_card|receivable_partner`, name, opening_balance_cents, currency, archived)
- `credit_cards` (account_id, limit_cents, closing_day, due_day)
- `categories` (workspace_id, parent_id, kind `income|expense`, name, color)
- `journal_entries` (id = chave de idempotência, workspace_id, occurred_on, description, status `planned|posted|void`, kind `expense|income|transfer|card_payment|refund|settlement|adjustment`, reversal_of)
- `postings` (entry_id, account_id, amount_cents, category_id nullable) — **SUM(amount_cents) por entry = 0** (constraint via trigger deferrable). Receita/despesa usam uma partida contra uma conta-técnica de categoria por workspace.
- `card_statements` (card_account_id, period_start, closing_on, due_on, status)
- `installment_plans` (entry_group, total_cents, count) e `installments` (plan_id, number, amount_cents, statement_id, entry_id)
- `recurring_templates` (salário, aluguel, assinaturas) → geram entries `planned`
- `expense_splits` (shared_entry_id, method `equal|income|percent|fixed`, shares jsonb, paid_by, paid_from_posting_id)
- `settlements` (workspace_id, from_user, to_user, amount_cents, entry_id)
- `budgets` (workspace_id, month, category_id, limit_cents)
- `simulations` (workspace_id, kind, params jsonb, result jsonb) — nunca tocam entries
- Funções: `fin_create_expense`, `fin_create_card_purchase(installments)`, `fin_pay_statement`, `fin_transfer`, `fin_settle`, `fin_reverse` — todas `security invoker`, transacionais, com `p_idempotency_key`.
- Views: `account_balances`, `statement_totals`, `monthly_cashflow`, `budget_vs_actual`.

Por que razão de partidas: transferência, pagamento de fatura e estorno deixam de ser casos especiais (somam zero), e saldos viram `SUM` de partidas, auditáveis. Para duas pessoas, mantemos simples: sem plano de contas contábil completo, só contas reais + contas-técnicas de categoria.

### Treinos
Implementado (migration `20261125220000_training.sql`, ver D-030): `exercises` (user_id null = biblioteca base, só leitura), `workouts` (fichas), `workout_exercises` (sets, reps, rest_s), `workout_sessions` (logged_at = início, finished_at), `workout_sets` (weight_g, reps ou duration_s, done_at; id do aparelho), `body_logs` (weight_g, waist_mm, sleep_min, mood 1–5). Tudo do próprio usuário. Planejado: fotos de evolução, substituições, RPE.
Cargas em gramas inteiras. PRs calculados por view.

### Saúde e hábitos
`habits` (kind `boolean|quantity|duration|frequency`, target, period, schedule), `habit_logs` (habit_id, local_date, value) UNIQUE(habit_id, local_date) para diários, `water_goals`, `water_logs` (amount_ml, local_date), `favorite_containers`, `health_logs` (kind, value jsonb), `medications`, `medication_logs`.

### Mercado e alimentação
`products`, `shopping_lists`, `shopping_items` (list_id, product_id, qty, unit, est_price_cents, checked_by, checked_at), `purchases` (list_id, store, total_cents, paid_by, account_id, entry_id UNIQUE) — `entry_id` único garante uma despesa por compra, `price_history`, `inventory_items`, `inventory_movements`, `recipes`, `recipe_ingredients`, `meal_plans`, `meal_plan_items`.

### Casa e Nós
`household_assets`, `maintenance_records`, `documents`, `service_contacts`, `memories`, `important_dates`, `places`, `watchlist`, `wishlist_items` (visibility), `trips`, `trip_items` (kind: reserva, roteiro, checklist).
Rotinas domésticas = `tasks` com `category = 'home'`.

### Metas e gamificação
`goals` (kind `amount|count|frequency|milestones`, target, due_on, link_rule jsonb), `goal_milestones`, `goal_contributions` (goal_id, entry_id nullable, amount), `xp_rules` (key, xp, seed_area), `xp_events` (user_id, rule_key, source_type, source_id, period_key, xp, revoked_at) **UNIQUE(user_id, rule_key, source_type, source_id, period_key)**, `achievements`, `user_achievements`, `challenges`, `reward_definitions`, `reward_redemptions`, `points_ledger`.

### Infraestrutura
`push_subscriptions` (user_id, endpoint UNIQUE, p256dh, auth, device_label, user_agent, last_success_at, revoked_at), `notification_preferences` (user_id, category, enabled, lead_minutes, active_from, active_to), `notification_jobs` (ver NOTIFICATIONS.md), `notification_logs`, `notifications_inbox`, `ai_conversations`, `ai_messages`, `ai_action_logs`, `ai_usage` (user_id, month, input_tokens, output_tokens, cost_micros).

## 4. Integridade financeira (testes obrigatórios)

1. Toda entry soma zero.
2. Parcelamento de 100,00 em 3 = 33,34 + 33,33 + 33,33.
3. Compra no dia do fechamento cai na fatura seguinte (regra configurável e testada).
4. Pagamento de fatura não altera total de despesas do mês.
5. Transferência não altera receitas nem despesas.
6. Estorno zera o efeito da original e preserva as duas.
7. Repetir chamada com a mesma chave de idempotência retorna o mesmo resultado sem nova entry.
8. Simulação não cria entry.

## 5. Migrations

- `supabase/migrations/<timestamp>_<modulo>_<descricao>.sql`, geradas pelo Supabase CLI.
- Cada migration inclui tabelas, índices, RLS e policies juntas (nunca tabela sem RLS).
- Tipos TypeScript gerados com `supabase gen types` após cada migration.
- Ordem prevista: `core` → `notifications` → `tasks/calendar` → `health` → `shopping` → `finance` → `gamification` → demais.

## 6. Backup e recuperação
Ver DECISIONS D-009. Exportação por usuário disponível no app desde a Etapa 1.
