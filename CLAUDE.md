# Finch — instruções para o Claude Code

App PWA pessoal e do casal (Jabez e Duda). Interface em pt-BR, BRL, fuso por usuário.

Next.js 16.4: leia o guia em `node_modules/next/dist/docs/` antes de usar uma API (Proxy no lugar de middleware, `cacheComponents` desligado — D-016).

Leia antes de mudar algo: `docs/PROGRESS.md` (estado real), `docs/ROADMAP.md` (etapa atual) e o doc do domínio (`docs/DATABASE.md`, `docs/NOTIFICATIONS.md`, `docs/AI_ASSISTANT.md`, `docs/DESIGN_SYSTEM.md`, `docs/GAMIFICATION.md`). Decisões em `docs/DECISIONS.md`.

Regras inegociáveis:
- Stack: Next.js App Router + TS strict + Tailwind + Supabase + Vercel + provedor de IA. Sem Firebase, Expo, React Native.
- RLS em toda tabela com dado de usuário; nunca desligar RLS ou usar service role para contornar policy. Migration nova = tabela + índices + RLS + **GRANTs explícitos** (o projeto não expõe tabelas à API por padrão; sem grant = "permission denied") + teste.
- Dinheiro em centavos inteiros (`bigint`), razão de partidas, operações compostas em função SQL transacional com idempotência.
- Dados pessoais são privados por padrão; compartilhar é explícito (workspace "Nós").
- Segredos só no servidor. Nunca expor service role, VAPID privada, chave de IA, CRON_SECRET.
- Payload de push sem dados financeiros/saúde por padrão.
- A IA nunca recebe user_id do modelo; ações financeiras/destrutivas pedem confirmação.
- Cores, fontes, raios e espaçamentos só via tokens (`docs/DESIGN_SYSTEM.md`).
- Sem dados mockados silenciosos; demo é explicitamente marcada.
- Não declarar teste que não rodou. Atualizar `docs/PROGRESS.md` ao fim de cada entrega.
- Lógica de negócio em `src/features/<domínio>/server`, nunca em componentes.

Antes de entregar: `npm run lint && npm run typecheck && npm test && npm run test:db && npm run build`.
Após migration: aplicar no Supabase e regenerar `src/types/database.ts`.
