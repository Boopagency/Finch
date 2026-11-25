# Progresso

_Atualizado em 2026-11-25._

## Estado atual: Etapa 0 (prova técnica) + base da Etapa 1

| Item | Status |
|---|---|
| Documentação, identidade (Canto), decisões | implementado |
| Next.js 16.4 + TS strict + Tailwind v4 + ESLint + Vitest | implementado, testado localmente |
| CI no GitHub Actions (lint, tipos, testes, build, testes de RLS) | implementado, **não executado ainda no GitHub** |
| Migrations `core`, `notifications`, `harden_helpers`, `api_grants` | aplicadas no Supabase de produção; testadas em Postgres local |
| RLS: pessoal × compartilhado × anônimo, convites, aparelhos, fila | testado localmente (17 asserções); mutação confirmou que o teste falha se a policy quebrar |
| Login e-mail + senha, proxy de sessão, `requireViewer` | **validado no iPhone do Jabez** (app instalado) |
| Convite por link (criar, aceitar criando senha, revogar, expira em 7 dias) | implementado; aceite testado só no SQL |
| Espaço "Nós" (criar), perfil, fuso, horário silencioso | implementado, não testado com usuário real |
| PWA: manifest, ícones, SW (cache estático, offline, push, deep link, atualização) | implementado; manifest e página offline conferidos localmente |
| Web Push: inscrição, aparelhos, teste imediato e agendado, dispatcher com silêncio/retry/revogação | **validado no iPhone do Jabez** (25/11): teste imediato e agendado chegaram com o app fechado. iPhone da Duda pendente |
| Rota do cron protegida por segredo | testado localmente (401 sem segredo) |
| Supabase Cron agendado | executado em 25/11; chamada ao app retornando **200** (conferido pelo Jabez em `net._http_response`) |
| Projeto na Vercel | no ar em https://finch-ecru.vercel.app (criado pelo Jabez); `/entrar` 200, cron sem segredo 401, URL e chave do Supabase conferidas no bundle |
| Hoje (palco escuro, frase por regras, balões com dados reais) | implementado; frase testada; tela não vista com login real |
| Agenda, Vida, Finch, Registrar | telas honestas de "chega na Etapa X" |

## Medições
- Push (25/11, iPhone do Jabez, app fechado): imediato enviado 0,5 s após criado; agendado enviado 1,2 s após o horário (o tique do cron caiu logo depois). Atraso esperado no pior caso: ~60 s (intervalo do cron) + entrega da Apple.

## Testes executados (25/11)
- `npm test`: 6 testes (frase do Hoje, horário silencioso) — passando.
- `npm run test:db`: migrations do zero + testes de RLS — passando.
- `npm run lint`, `npm run typecheck`, `npm run build` — passando.
- Navegador headless (tamanho iPhone 15): `/entrar`, `/offline` renderizam; `/` sem login redireciona para `/entrar`; manifest servido.

## Problemas conhecidos
- ~~25/11: em produção, toda leitura/escrita do app dava "permission denied" (tabelas sem GRANT para a API).~~ Corrigido pela migration `api_grants` no mesmo dia; teste local passou a cobrir.
- `/convite/<token>` retorna erro 500 se `SUPABASE_SERVICE_ROLE_KEY` não estiver configurada (esperado; em produção a variável existe).
- Tipos do banco (`src/types/database.ts`) foram gerados via MCP e colados; regenerar após cada migration.
- `npm audit` aponta avisos em dependências de desenvolvimento; revisar na Etapa 8.

## Próximo passo
1. ~~Configurações do Jabez~~ feito (Supabase, Vercel, Cron). Conferir `NEXT_PUBLIC_APP_URL` no primeiro convite.
2. ~~Validar no iPhone do Jabez~~ feito.
3. Convidar a Duda e repetir no iPhone dela (adiado pelo Jabez).
4. Etapa 2: tarefas + recorrência, água, hábitos, mercado, álbum.
