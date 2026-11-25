# Finch

Organização pessoal, financeira, doméstica e de vida a dois. Web App (PWA) para iPhone e desktop.

> Status: Etapa 0 (planejamento). Ainda não há código executável. Veja [docs/PROGRESS.md](docs/PROGRESS.md).

## Documentação
- [PRD](docs/PRD.md) · [Arquitetura](docs/ARCHITECTURE.md) · [Banco](docs/DATABASE.md) · [Design system](docs/DESIGN_SYSTEM.md)
- [Notificações](docs/NOTIFICATIONS.md) · [Assistente IA](docs/AI_ASSISTANT.md) · [Roadmap](docs/ROADMAP.md) · [Decisões](docs/DECISIONS.md)
- Estudo de identidade: [docs/brand/finch-identidade.html](docs/brand/finch-identidade.html)

## Configuração (prevista)
1. Node LTS, Supabase CLI.
2. `cp .env.example .env.local` e preencher.
3. `npm install` · `npx supabase start` · `npx supabase db reset` · `npm run dev`.
4. Chaves VAPID: `npx web-push generate-vapid-keys`.

## Deploy
Vercel ligada ao repositório GitHub (preview por PR, produção na `main`). Migrations aplicadas com `npx supabase db push`. Variáveis em Vercel → Settings → Environment Variables; segredo do cron também no Supabase Vault.
