# Arquitetura

> Estado: proposta v0, aguardando aprovação.

## 1. Visão geral

```
iPhone (PWA standalone) / desktop
  ├─ Next.js (React, App Router) — UI
  ├─ Service Worker próprio — cache estático, push, deep link
  └─ IndexedDB — fila offline + dados das telas offline-first
        │  HTTPS
Vercel (Next.js)
  ├─ Server Components / Server Actions — leituras e mutações da UI
  ├─ Route Handlers /api/*
  │    ├─ /api/cron/notifications  (chamado pelo Supabase Cron, segredo)
  │    ├─ /api/cron/planner        (gera jobs, ocorrências, resumos)
  │    ├─ /api/sync                (aplica fila offline em lote)
  │    ├─ /api/push/subscribe
  │    └─ /api/ai/chat             (streaming, ferramentas tipadas)
  └─ Domínio (src/features/*/server) — regras, validação Zod
        │
Supabase
  ├─ Postgres + RLS — fonte da verdade
  ├─ Funções SQL transacionais (finanças, XP, idempotência)
  ├─ Realtime — listas, tarefas, mercado, pote
  ├─ Auth — e-mail + senha, cadastro público desligado (contas só por convite)
  ├─ Storage — buckets privados, URLs assinadas
  ├─ Cron (pg_cron + pg_net) — chama a Vercel a cada minuto
  └─ Vault — segredo do cron
        │
Provedor de IA (só pelo backend)
```

Um único app Next.js. Sem microsserviços, sem filas externas: a fila é uma tabela Postgres com `FOR UPDATE SKIP LOCKED`.

## 2. Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 16.4 (App Router, `cacheComponents` desligado, D-016) + React 19 + TypeScript strict | pedido do projeto |
| Estilo | Tailwind CSS v4 com tokens em CSS variables | tokens centralizados, dark mode por variável |
| Componentes | shadcn/ui só como ponto de partida (Dialog, Sheet, Popover), restilizado | acessibilidade pronta, visual próprio |
| Ícones | Lucide | traço consistente com a marca |
| Dados (cliente) | TanStack Query | cache, revalidação por realtime, estado offline |
| Estado local | Zustand só se aparecer estado global real (ex.: treino em execução) | evitar por padrão |
| Formulários | React Hook Form + Zod | schemas compartilhados cliente/servidor |
| Supabase | `@supabase/ssr`, `@supabase/supabase-js` | sessão em cookie |
| Datas | `date-fns` v4 + `@date-fns/tz` | fusos por usuário |
| Recorrência | `rrule` | RFC 5545, testável |
| IndexedDB | `idb` (~1 KB) | wrapper fino, sem ORM |
| Push | `web-push` (servidor) | VAPID e criptografia do payload |
| Service Worker | escrito à mão (`public/sw.js`) | controle total do ciclo de vida, sem plugin de build |
| Testes | Vitest (unidade, domínio, finanças), testes SQL de RLS em Postgres efêmero (`scripts/test-db.sh`), Playwright (fluxos críticos) | |

Bibliotecas novas só entram com justificativa em DECISIONS.md.

## 3. Organização do código

```
src/
  app/                 rotas (grupos (auth), (app)), layouts, route handlers em app/api
  components/ui/       design system (Button, Sheet, Card, ProgressRing…)
  features/<domínio>/
    components/        UI do domínio
    server/            serviços de domínio (só servidor): queries, mutations, regras
    schemas.ts         Zod
    *.test.ts
  lib/                 clientes (supabase, push, ai), utilidades de infraestrutura
  hooks/  stores/  types/  utils/
supabase/migrations/   SQL versionado
supabase/tests/        testes de RLS e funções
tests/e2e/             Playwright
```

Domínios: `core` (perfis, workspaces, convites, configurações), `tasks`, `calendar`, `finance`, `workouts`, `health` (hábitos, água, saúde), `shopping`, `meals`, `home`, `us` (relacionamento, viagens), `goals`, `gamification`, `notifications`, `assistant`.

Regras de dependência: UI chama `features/*/server` (via Server Action ou route handler). Um domínio fala com outro por função exportada do `server/` dele ou por evento de domínio, nunca importando componentes alheios.

## 4. Fluxos-chave

### 4.1 Mutação comum
Server Action → `requireViewer()` (JWT validado com `getClaims`) → valida com Zod → serviço de domínio → Supabase com o **token do usuário** (RLS ativo) → grava `domain_events` na mesma transação quando há efeito colateral → retorna → TanStack Query atualiza; o outro aparelho recebe via Realtime.

`service_role` só é usado em: cron, envio de push, aceitação de convite e processamento de eventos. Nunca em código que roda por ação direta do usuário sem checar o membro antes.

### 4.2 Eventos de domínio (outbox)
Tabela `domain_events` (id, tipo, workspace, ator, payload, processed_at). Escrita na mesma transação da mudança. O cron consome em lote e aplica efeitos: XP/sementes, (re)agendar notificações, atualizar metas vinculadas. Cada efeito é idempotente (chave única), então reprocessar é seguro.

### 4.3 Offline e sincronização
Ver §6.

### 4.4 Agenda unificada
View SQL `calendar_items` = `events` ∪ `task_occurrences` com horário ∪ lançamentos previstos com vencimento ∪ `workout_sessions` planejadas ∪ viagens. Cada linha tem `source_type` e `source_id`. Sem cópia, sem dessincronização.

## 5. Segurança

- RLS em **todas** as tabelas com dados de usuário. Funções auxiliares `is_member(workspace_id)` e `owns(row)` em `SECURITY DEFINER` com `search_path` fixo.
- Cadastro público desligado no Supabase Auth. Novos usuários só via convite (servidor cria o usuário).
- Login por **e-mail + senha** (D-004): sem envio de e-mail, compatível com o app Senhas/Face ID. Link mágico não serve no PWA do iOS. Passkeys podem vir depois.
- Segredos só em variáveis de ambiente do servidor (Vercel) e no Vault (segredo do cron). `.env*` no `.gitignore`.
- Storage: buckets privados, caminho `/{workspace_id}/{...}`, policies por membro, URLs assinadas de curta duração.
- Notificações: payload sem valores financeiros ou de saúde por padrão.
- Logout: limpa IndexedDB, caches com dados de API e cancela a subscription do aparelho (opcional).
- Exportação (JSON/CSV por domínio) e exclusão de conta (apaga workspace pessoal; sai do compartilhado).

## 6. Offline

Priorizados: mercado, água, hábitos, tarefas, execução de treino.

- Cada mutação offline vira um item em `outbox` no IndexedDB: `{ id: uuid, op, payload, created_at, attempts }`. O `id` é gerado no cliente e vira a chave primária / chave de idempotência no servidor, então reenviar não duplica.
- Sincronização ao: voltar online (`online`), abrir o app, `visibilitychange` para visível, e a cada 30 s com fila não vazia. **Não** dependemos de Background Sync (não existe no Safari).
- `/api/sync` aplica em ordem; cada op responde `ok | conflict | rejected`.
- Conflitos: campos simples usam "última escrita vence" com `updated_at`; listas de mercado tratam marcar/desmarcar por item (sem conflito real); treinos são append-only (séries não se editam em dois aparelhos ao mesmo tempo).
- Finanças offline: só registro simples de despesa, marcado como "pendente de validação" até o servidor aceitar.
- Indicador visível: "offline · 3 pendentes".

Riscos do armazenamento no navegador: o iOS pode apagar dados de sites não instalados após 7 dias sem uso; apps adicionados à tela inicial são isentos, mas o armazenamento ainda pode ser removido sob pouco espaço. Por isso a fila sincroniza agressivamente e nada vive só no aparelho.

## 7. PWA

- `app/manifest.ts`: `display: standalone`, ícones 192/512 + maskable, `apple-touch-icon` 180, cores de tema.
- `public/sw.js`: precache do shell e assets com hash; network-first para navegação com fallback offline; **não** cacheia respostas de API com dados pessoais (os dados offline ficam no IndexedDB, que é limpo no logout).
- Atualização: SW novo fica em `waiting`; o app mostra "nova versão" e envia `SKIP_WAITING` ao tocar. Versão do SW = hash do build.
- Guia de instalação no iOS (Compartilhar → Adicionar à Tela de Início) mostrado quando `display-mode` não é standalone.
- Safe areas via `env(safe-area-inset-*)`, `viewport-fit=cover`.
- Badge no ícone (Badging API, iOS 16.4+ instalado) para pendências do dia.

## 8. Infraestrutura e custos

| Serviço | Plano inicial | Observações |
|---|---|---|
| Vercel | Hobby | uso pessoal não comercial é permitido no Hobby. Cron da Vercel no Hobby é diário, por isso o agendamento usa Supabase Cron |
| Supabase | Free para começar | projeto Free pausa após ~7 dias sem atividade e **não tem backup diário**. Ver DECISIONS D-009 |
| IA | pago por uso | teto mensal configurável (AI_ASSISTANT.md) |
| GitHub | Free | repositório privado, Actions para CI |

Ambientes: `local` (Supabase CLI + Next dev), `preview` (Vercel preview + mesmo projeto Supabase de dev, se houver) e `production`. Migrations aplicadas via Supabase CLI, nunca editando o banco à mão.
