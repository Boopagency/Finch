# Finch

Organização pessoal, financeira, doméstica e de vida a dois. Web App (PWA) para iPhone e desktop.

Estado real: [docs/PROGRESS.md](docs/PROGRESS.md).

## Documentação
- [PRD](docs/PRD.md) · [Arquitetura](docs/ARCHITECTURE.md) · [Banco](docs/DATABASE.md) · [Design system](docs/DESIGN_SYSTEM.md)
- [Notificações](docs/NOTIFICATIONS.md) · [Assistente IA](docs/AI_ASSISTANT.md) · [Gamificação](docs/GAMIFICATION.md)
- [Roadmap](docs/ROADMAP.md) · [Decisões](docs/DECISIONS.md) · Estudo de marca: [docs/brand/finch-identidade.html](docs/brand/finch-identidade.html)

## Desenvolvimento

Requisitos: Node 22+, PostgreSQL 16 local (só para `test:db`).

```bash
npm install
cp .env.example .env.local   # preencher
npm run dev
```

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor local |
| `npm run lint` / `npm run typecheck` | qualidade |
| `npm test` | testes de unidade (Vitest) |
| `npm run test:db` | Postgres efêmero + migrations + testes de RLS |
| `npm run build` | build de produção |

O Service Worker só registra em produção (`npm run build && npm start`).

## Primeira configuração (uma vez)

### 1. Supabase (projeto `rdyaddlrutewleifcety`)
- **Authentication → Sign In / Providers → Email**: manter e-mail ativo; **desligar "Allow new users to sign up"**; desligar "Confirm email" não é necessário (contas são criadas já confirmadas).
- **Authentication → Users → Add user → Create new user**: crie a sua conta (e-mail + senha, "Auto Confirm User" marcado). O perfil e o espaço pessoal nascem sozinhos.
- **Project Settings → API Keys**: copie a **secret key** (ou `service_role`). Ela vai só na Vercel.

### 2. Vercel
- **Add New → Project → Import `Boopagency/Finch`** (framework Next.js, sem mudar comandos).
- Variáveis (Settings → Environment Variables), produção e preview:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rdyaddlrutewleifcety.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | a publishable key (`sb_publishable_…`) |
| `SUPABASE_SERVICE_ROLE_KEY` | a secret key do passo 1 (marcar como Sensitive) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | gere com o comando abaixo |
| `VAPID_SUBJECT` | `mailto:` + um e-mail seu |
| `CRON_SECRET` | gere com o comando abaixo (Sensitive) |
| `NEXT_PUBLIC_APP_URL` | a URL final, ex. `https://finch-xxx.vercel.app` |

```bash
npx web-push generate-vapid-keys
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

- Depois de salvar as variáveis, faça **Redeploy**.

### 3. Supabase Cron
No **SQL Editor**, rode `supabase/setup/cron.sql` trocando `<https://seu-app.vercel.app>` pela URL e `<CRON_SECRET…>` pelo mesmo valor da Vercel.

### 4. iPhone
Abra a URL no Safari → Compartilhar → **Adicionar à Tela de Início** → abra pelo ícone → entre → **Ajustes → Ativar lembretes** → "Enviar teste agora" e "Testar em 2 min" (feche o app e espere).

### 5. Duda
**Ajustes → Nós dois → Criar espaço Nós → Gerar convite** com o e-mail dela → mande o link. Ela abre no Safari, cria a senha, instala e ativa os lembretes.

## Deploy
Push na `main` = produção; PRs geram preview. Migrations: aplicar os arquivos de `supabase/migrations` em ordem (Supabase CLI `db push` ou SQL Editor) e regenerar `src/types/database.ts`.
