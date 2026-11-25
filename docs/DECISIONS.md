# Decisões

Formato: contexto → decisão → alternativas. `PENDENTE` = aguarda o Jabez.

**D-001 Nome: Finch.** O briefing citou "fintch" e "finch"; adotado Finch. Existe o app "Finch: Self-Care Pet" (passarinho + autocuidado). Para uso pessoal não há problema; a marca evita a mecânica de bichinho virtual. Revisar se o produto virar público.

**D-002 Um app Next.js monolítico** na Vercel + Supabase. Alternativa: Edge Functions do Supabase para o backend. Rejeitada para manter uma só base de código e linguagem de deploy.

**D-003 Service Worker escrito à mão** em vez de plugin (Serwist/next-pwa). O SW precisa de pouco (precache, fallback, push, click) e queremos controle do ciclo de atualização.

**D-004 Login por e-mail + código OTP**, sem link mágico. No iOS o link abre no Safari, cujo armazenamento é separado do app instalado. Alternativa futura: passkeys.

**D-005 Razão de partidas (ledger) no financeiro.** Torna transferência, fatura e estorno casos naturais (soma zero) e saldos auditáveis. Alternativa: tabela única de transações com flags; rejeitada por gerar exceções em cada regra.

**D-006 Workspace como fronteira de privacidade**, com `visibility = private_to_creator` como única exceção fina. Alternativa: ACL por item; rejeitada por complexidade de RLS.

**D-007 Agenda como view (`calendar_items`)**, não como cópia. Evita dessincronização.

**D-008 Fila de notificações no Postgres** (`FOR UPDATE SKIP LOCKED`), disparada por Supabase Cron a cada minuto. Cron da Vercel no Hobby é diário, insuficiente.

**D-009 Backup — PENDENTE.** Supabase Free não tem backup diário e pausa após inatividade. Opções: (a) Supabase Pro, ~US$ 25/mês, backups diários; (b) Free + GitHub Action semanal com `pg_dump` criptografado guardado como artefato privado; (c) Free sem backup até a Etapa 3. **Recomendação:** (b) até a Etapa 3, (a) quando dados financeiros reais entrarem.

**D-010 Direção visual — PENDENTE.** Recomendação: B "Alpiste" + frase-resumo de C. Ver DESIGN_SYSTEM.md.

**D-011 Lente Tudo/Eu/Nós — PENDENTE.** Em vez de "trocar de ambiente", uma lente global no topo. "Tudo" é o padrão. Ao criar algo, o destino padrão segue a lente (Tudo → pessoal, exceto mercado/casa → Nós). **Recomendação:** adotar.

**D-012 Provedor de IA — PENDENTE.** Arquitetura independente de fornecedor. Recomendação: Anthropic (Claude), modelo menor para extração e maior para conversa. Precisa de chave de API.

**D-013 Mercado e gamificação básica antecipados para a Etapa 2.** Ver ROADMAP.

**D-014 Voz pelo ditado do teclado do iOS.** Zero custo, funciona em qualquer campo. Web Speech API não é confiável no PWA do iOS.

**D-015 Cadastro por câmera usa foto + IA de visão**, não leitor de código de barras (BarcodeDetector não existe no Safari).
