# Decisões

Formato: contexto → decisão → alternativas. `PENDENTE` = aguarda o Jabez.

**D-001 Nome: Finch.** O briefing citou "fintch" e "finch"; adotado Finch. Existe o app "Finch: Self-Care Pet" (passarinho + autocuidado). Para uso pessoal não há problema; a marca evita a mecânica de bichinho virtual. Revisar se o produto virar público.

**D-002 Um app Next.js monolítico** na Vercel + Supabase. Alternativa: Edge Functions do Supabase para o backend. Rejeitada para manter uma só base de código e linguagem de deploy.

**D-003 Service Worker escrito à mão** em vez de plugin (Serwist/next-pwa). O SW precisa de pouco (precache, fallback, push, click) e queremos controle do ciclo de atualização.

**D-004 Login por e-mail + senha** (revisado em 25/11). Link mágico não serve (no iOS abre no Safari, com armazenamento separado do app instalado). Código por e-mail também foi descartado: o e-mail embutido do Supabase só entrega para membros da organização e ~2/hora, o que exigiria um SMTP externo (5º serviço). Senha funciona com o app Senhas/Face ID do iPhone. Convite = link com token; quem abre cria a própria senha. Cadastro público desligado; contas só nascem por convite (service role no servidor). Alternativa futura: passkeys.

**D-005 Razão de partidas (ledger) no financeiro.** Torna transferência, fatura e estorno casos naturais (soma zero) e saldos auditáveis. Alternativa: tabela única de transações com flags; rejeitada por gerar exceções em cada regra.

**D-006 Workspace como fronteira de privacidade**, com `visibility = private_to_creator` como única exceção fina. Alternativa: ACL por item; rejeitada por complexidade de RLS.

**D-007 Agenda como view (`calendar_items`)**, não como cópia. Evita dessincronização.

**D-008 Fila de notificações no Postgres** (`FOR UPDATE SKIP LOCKED`), disparada por Supabase Cron a cada minuto. Cron da Vercel no Hobby é diário, insuficiente.

**D-009 Backup — PENDENTE.** Supabase Free não tem backup diário e pausa após inatividade. Opções: (a) Supabase Pro, ~US$ 25/mês, backups diários; (b) Free + GitHub Action semanal com `pg_dump` criptografado guardado como artefato privado; (c) Free sem backup até a Etapa 3. **Recomendação:** (b) até a Etapa 3, (a) quando dados financeiros reais entrarem.

**D-010 Direção visual — DECIDIDO (25/11).** Marca e personalidade: C "Canto" (pássaro-balão coral, Schibsted Grotesk). Tela Hoje no estilo C (palco escuro, frase com figurinhas, balões). Demais telas guiadas por usabilidade: fundo papel claro, cartões brancos, título único grande.

**D-011 Lente Tudo/Eu/Nós — adotada (recomendação aceita por padrão; implementação na Etapa 2).** Em vez de "trocar de ambiente", uma lente global no topo. "Tudo" é o padrão. Ao criar algo, o destino padrão segue a lente (Tudo → pessoal, exceto mercado/casa → Nós). **Recomendação:** adotar.

**D-012 Provedor de IA — PENDENTE.** Arquitetura independente de fornecedor. Recomendação: Anthropic (Claude), modelo menor para extração e maior para conversa. Precisa de chave de API.

**D-013 Mercado e gamificação básica antecipados para a Etapa 2.** Ver ROADMAP.

**D-014 Voz pelo ditado do teclado do iOS.** Zero custo, funciona em qualquer campo. Web Speech API não é confiável no PWA do iOS.

**D-015 Cadastro por câmera usa foto + IA de visão**, não leitor de código de barras (BarcodeDetector não existe no Safari).

**D-016 `cacheComponents` desligado.** O Next 16 liga por padrão; com ele toda leitura de cookie precisa de Suspense e há validação de navegação instantânea. O Finch é 100% autenticado e dinâmico, então o ganho é pequeno e o atrito, alto. Reavaliar na Etapa 8.

**D-017 Gamificação = álbum de figurinhas.** Escolha do Jabez. Substitui o "pote de sementes" e o "ninho". Detalhes em GAMIFICATION.md.

**D-018 Projeto Supabase.** Usado o projeto vazio criado em 25/11 (`rdyaddlrutewleifcety`, us-west-2). Migrations aplicadas via MCP a partir dos arquivos versionados em `supabase/migrations`.

**D-019 Testes de RLS em Postgres puro.** Docker não está disponível no ambiente do agente; `scripts/test-db.sh` sobe um Postgres efêmero com um stub mínimo do Supabase (`auth.uid()`, papéis) e roda `supabase/tests/*.test.sql`. Roda também no CI.

**D-020 Grants explícitos por tabela.** O projeto Supabase (criado em nov/2026) não concede acesso automático da API a tabelas novas. Em 25/11 isso derrubou todas as leituras do app em produção ("permission denied"). Correção: migration `api_grants` com o mínimo por papel, e o stub de testes passou a imitar esse padrão, então uma tabela sem grant agora falha no `test:db`. Pendências do linter: `pg_net` instalado no schema `public` pelo SQL do cron (inofensivo; mover para `extensions` se o linter incomodar) e proteção contra senhas vazadas (opção do Auth, disponível no plano Pro).
