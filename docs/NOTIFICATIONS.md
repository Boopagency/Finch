# Notificações (Web Push)

> Primeira prova técnica do projeto: push chegando com o app fechado nos dois iPhones.

## 1. Restrições reais do iOS

- Web Push só funciona com o site **adicionado à Tela de Início** (iOS/iPadOS 16.4+) e aberto como app.
- A permissão precisa ser pedida a partir de um **toque do usuário** (botão "Ativar lembretes").
- Cada aparelho/instalação tem sua própria subscription. Reinstalar o app gera outra.
- Não há push silencioso: todo push precisa mostrar uma notificação, senão o iOS pode revogar a permissão.
- Botões de ação em notificações (`actions`) não são suportados no iOS. Tocar abre o app (deep link).
- O Service Worker não fica rodando: não há timers em segundo plano. Todo lembrete com app fechado vem do servidor.
- Entrega não é garantida nem pontual. Prometemos "por volta de", nunca "exatamente".
- Badge do ícone (Badging API) disponível para apps instalados.
- Declarative Web Push (Safari 18.4+) pode simplificar o SW no futuro; avaliar depois da v1.

## 2. Arquitetura

```
Supabase Cron (pg_cron, a cada 1 min)
  └─ pg_net POST https://<app>/api/cron/notifications
        header Authorization: Bearer <CRON_SECRET lido do Vault>
Vercel route handler
  1. reivindica até N jobs: UPDATE … SET status='sending', locked_at=now()
     WHERE id IN (SELECT id FROM notification_jobs
                  WHERE status='pending' AND scheduled_for <= now()
                  ORDER BY scheduled_for LIMIT 50 FOR UPDATE SKIP LOCKED)
  2. para cada job: re-checa o estado da origem (ainda relevante?)
  3. aplica horário silencioso (adia não essenciais para o fim do silêncio)
  4. envia via web-push para cada subscription ativa do usuário
  5. 404/410 → revoga subscription; 429/5xx → retry com backoff (máx 3)
  6. grava notification_logs e notifications_inbox
```

Um planner (a cada 15 min, mesmo endpoint de cron com outro caminho) materializa jobs para as próximas 24 h a partir das regras. Mudanças nas origens (tarefa concluída, conta paga, evento reagendado) geram `domain_events` que cancelam/recriam os jobs daquela origem.

Por que 1 minuto: precisão suficiente para lembretes e baixo custo (≈ 43 mil invocações/mês, cada uma curta, dentro do Hobby da Vercel). Avaliar Edge Function do Supabase como alternativa se o limite de invocações apertar.

## 3. Tabelas

`notification_jobs`
- `id`, `user_id`, `category`, `source_type`, `source_id`
- `scheduled_for timestamptz`, `status pending|sending|sent|cancelled|failed|skipped`
- `dedupe_key text UNIQUE` (ex.: `task_occ:<id>:due-30m`) — impede duplicidade
- `attempts`, `locked_at`, `last_error`
- `payload jsonb` (título genérico, deep link) — sem dados sensíveis

Jobs presos em `sending` por mais de 5 min voltam para `pending`.

## 4. Checagem antes de enviar ("ainda faz sentido?")

| Categoria | Envia se |
|---|---|
| Água | meta do dia não atingida e dentro do horário ativo |
| Tarefa | ocorrência ainda `open` e prazo não mudou |
| Conta | entry ainda `planned` |
| Evento | evento existe e `starts_at` bate com o do job |
| Hábito | não registrado no período |
| Compra | lista ainda aberta |
| Treino/descanso | sessão ainda ativa e descanso não encerrado |

## 4.1 Implementado (25/11)

- **Planejador** (`planner.ts`), a cada chamada do cron: cria os lembretes de hoje (só horários futuros) para quem tem aparelho ativo. Água: `water_from` até `water_to` a cada `water_every_min`. Hábitos: no `reminder_time`, nos dias agendados. `dedupe_key` por horário evita duplicar.
- **Relevância** (`relevance.ts`): água só envia se a meta do dia não foi atingida e os lembretes estão ligados; hábito só se ainda está ativo, agendado e não cumprido.
- Ao mudar configurações de água ou editar/arquivar um hábito, os pendentes do usuário são apagados e o planejador recria.

## 5. Categorias e padrões

Hidratação, hábitos, treinos (+ fim de descanso, melhor esforço), tarefas, compromissos, contas a pagar, orçamentos, compras, rotinas da casa, metas, datas importantes, compromissos do casal, conquistas, resumo diário (manhã), resumo semanal (domingo à noite), avisos do app.

Privacidade na tela bloqueada: finanças e saúde usam texto genérico por padrão ("Você tem uma conta para hoje"). O usuário pode liberar detalhes por categoria.

## 6. Preferências por usuário

Categorias ligadas, horário ativo, horário silencioso, frequência (água: intervalo), antecedência (tarefas/eventos/contas), resumos, e lista de aparelhos (nome, último envio, revogar).

## 7. Deep link

`notificationclick` no SW → `clients.matchAll` → foca a janela existente e navega para `payload.url`, ou abre uma nova.

## 8. Plano da prova técnica (Etapa 0)

1. Deploy na Vercel com HTTPS, manifest e SW.
2. Instalar nos dois iPhones, pedir permissão por botão, salvar subscription.
3. Botão "enviar teste" (servidor → push) com app aberto, em segundo plano e fechado.
4. Cron do Supabase agenda um push para daqui 3 min; travar o iPhone e conferir chegada.
5. Registrar atraso médio observado em PROGRESS.md.
