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

**D-021 Saúde é do usuário, não do workspace.** `water_logs`, `habits` e `habit_logs` usam `user_id` como fronteira (RLS `user_id = auth.uid()`), sem `workspace_id`: são dados sensíveis que nunca serão compartilhados. Hábitos compartilhados do casal, se vierem, serão outra tabela no workspace "Nós".

**D-022 Fila offline genérica.** Escritas rápidas passam por `src/lib/outbox.ts` (IndexedDB) → `POST /api/sync`. Cada op tem id do aparelho que vira a PK do registro (`upsert ... ignoreDuplicates`), então reenvio não duplica. A UI junta servidor + fila por id (`mergeWater`, `mergeHabitLogs`, reaplicando as ops em ordem). Limitação: abrir o app do zero sem internet mostra a página offline (o HTML não é cacheado por conter dados pessoais); com o app já aberto, registrar offline funciona.

**D-023 Lembretes de água pulados no silêncio.** Lembretes de água que caem no horário silencioso são descartados, não adiados (senão chegariam vários juntos ao fim do silêncio). Hábitos com horário escolhido continuam sendo adiados.

**D-024 Razão simplificada no financeiro (revisa D-005).** Partidas só em contas reais. Transferência e pagamento de fatura têm duas partidas que somam zero; despesa/receita/estorno têm uma partida e a categoria fica no lançamento. Garante as regras da especificação (testadas em `supabase/tests/finance.test.sql`) sem contas-técnicas de categoria. Lançamentos só entram por `fin_record` (security definer, idempotente pelo id do aparelho); o app não tem permissão de inserir partidas diretamente.

**D-025 Competência do cartão = mês da fatura.** Parcelas e compras no crédito contam no mês da fatura em que caem (fechamento no dia ou depois → fatura seguinte). Limite do cartão é consumido pelo total parcelado.

**D-026 Agenda montada no servidor em TypeScript (revisa D-007).** Em vez de uma view SQL, `getAgenda` expande eventos (recorrência, vários dias) e lê tarefas datadas do próprio módulo. Continua sem cópia de dados.

**D-027 Álbum individual com progresso do casal.** Cada um completa o próprio álbum (permite trocas, como no álbum de verdade); o app mostra também o total colado pelos dois juntos.

**D-028 Testes E2E contra produção com usuários isolados.** Sem Docker no ambiente, os testes de ponta a ponta usam o Supabase de produção com dois usuários `@finch.test` (RLS isola). Script para criar/apagar em `tests/e2e/README.md`.

**D-029 Região das funções = região do banco.** `vercel.json` fixa `pdx1` (Oregon) porque o Supabase está em `us-west-2`. Cada tela faz várias consultas; a viagem servidor↔banco pesa mais que a do iPhone↔servidor. Se um dia o banco mudar para São Paulo, mudar para `gru1`.

**D-030 Treino simples e offline primeiro.** Fichas são listas de exercícios (séries × reps × descanso), sem dias/ciclos por ora. Carga em gramas inteiras. Recorde = maior 1RM estimado (Epley, reps limitadas a 12); a primeira marca de um exercício não é chamada de recorde. Começar a sessão é online (server action); séries e conclusão vão pela fila offline (ids do aparelho). O descanso guarda o horário de término (`localStorage`), não um contador. Concluir treino com ao menos uma série dá 30 pontos (1 por dia).

**D-031 A fila offline respeita a ordem de criação.** O IndexedDB devolve pela chave (uuid); ao carregar, a fila é ordenada por `created_at`, e um envio pedido durante outro roda logo em seguida.

**D-032 Espaço da casa.** Cozinha, datas, lugares e memórias moram no espaço "Nós" quando ele existe (senão no pessoal), sem seletor: é a casa de vocês. Metas têm seletor (pessoal ou do casal). Helper único: `homeSpace` em `src/features/core/server/home-space.ts`.

**D-033 Despensa acompanha, não adivinha.** Finalizar compra só repõe itens que já estão na despensa (trigger em `purchases`); nada é criado sozinho. Receita e cardápio → lista pulam o que tem em casa acima do mínimo e o que já está pendente na lista.

**D-034 Recorrências geradas sob demanda, idempotentes.** `fin_materialize(mês)` roda ao abrir Finanças e cria, por regra, um lançamento com id `md5(regra:mês)` via `fin_record`. Reabrir não duplica, cancelado não volta, pausar/apagar a regra não mexe no histórico. Conta comum → previsto (até o mês que vem); cartão → realizado quando o dia chega. Regra que usa a conta pessoal do outro é pulada sem erro (o dono gera). Ids derivados não seguem a versão do RFC 4122: validar ids de lançamento com `z.guid()`, não `z.uuid()`.

**D-035 Assistente: Messages API com laço próprio no servidor.** `POST /api/ai/chat` roda até 5 voltas de ferramentas (`src/features/assistant`). Modelo padrão `claude-opus-5-5` com `effort: low` (conversa curta) e fallback de recusa do lado do servidor; trocável por `AI_MODEL`. Ferramentas com esquema estrito + Zod (campo extra é recusado: o modelo nunca escolhe usuário/espaço) e executadas com o token de quem pergunta (RLS). Dinheiro só vira proposta; a pessoa confirma num cartão que chama o mesmo lançamento rápido do app. Histórico fica na aba (sessionStorage), só texto, máx. 20 mensagens; nada de conversa é salvo no banco. Cota diária por pessoa em `ai_usage` (`ai_reserve`/`ai_track`). Testes E2E usam uma API falsa local (`ANTHROPIC_BASE_URL`), sem custo.

**D-036 Fotos em bucket privado por espaço.** Bucket `photos` privado (5 MB, JPEG/PNG/WebP); caminho `<espaço>/<uuid>.jpg` e RLS do Storage via `photo_space(nome)` + `is_member`. A foto é reduzida no aparelho (máx. 1600 px) e redesenhada em canvas, o que descarta EXIF (localização). Exibição por link assinado de 1 h; `cacheControl` de 60 s para uma foto apagada sair logo do CDN. Fotos de corpo só no espaço pessoal (checado na tabela).

**D-037 Importação de extrato sem duplicar.** Arquivo lido no aparelho (OFX SGML/XML ou CSV com cabeçalho; Windows-1252 detectado). Cada linha vira lançamento realizado via `fin_record` com id `md5(conta:código do banco)`: reimportar não duplica. Linhas com mesmo valor e data (±2 dias) na conta são marcadas como possível duplicado e vêm desmarcadas. No cartão, pagamentos/estornos positivos não entram (a fatura é paga pela conta).

**D-038 Fluidez antes de tudo.** Cache do roteador do Next (`experimental.staleTimes`: dinâmico 30 s, estático 90 s) + `prefetch` nas abas e blocos da Vida: voltar a uma tela é instantâneo. Para não mostrar dado velho: ações chamam `revalidatePath`/`router.refresh()` e o app atualiza ao voltar depois de 30 s em segundo plano (`SyncAgent`). Links que mudam a cada toque (dia/mês da agenda) não pré-carregam.

**D-039 Janela do "+" é de lançamentos em sequência.** Não fecha ao adicionar, não abre com teclado (foco no botão de fechar) e mostra o aviso dentro dela (fora, o `<dialog>` modal deixa tudo inerte).

**D-040 Seleção = `Segmented`.** Um componente (`src/components/ui/segmented.tsx`, `role=radiogroup`, pílula que desliza, tom por opção) para toda escolha curta; com `href` vira navegação com resposta otimista.

**D-041 Excluir em dois toques, sem janela.** `ConfirmButton`: o 1º toque arma (vermelho, 3 s), o 2º exclui. Vale para o que não tem desfazer (fichas, treinos, exercícios próprios, listas, conexões).

**D-042 Preferências de notificação por tipo.** `notification_preferences` (por pessoa e categoria; água usa `user_settings.water_reminders`). O despachante confere antes de enviar e marca "desligado em Ajustes"; desligar apaga os pendentes daquele tipo.

**D-043 MCP do Finch: OAuth próprio, RLS de sempre.** `/api/mcp` (JSON-RPC, HTTP sem estado) com OAuth 2.1: metadados RFC 8414/9728, registro dinâmico (RFC 7591, retorno só https ou localhost), código + PKCE S256. Na autorização a pessoa digita a senha: isso cria uma **sessão Supabase dedicada** que fica no servidor; o Claude recebe só um token opaco do Finch (guardado como sha-256, 1 h, refresh com rotação). Cada chamada roda com o JWT dessa sessão (`runAsBearer` em `src/lib/supabase/server.ts`), então valem as mesmas consultas, ações e RLS do app; nada de service role. Ferramentas = as do assistente + agenda/tarefas/mercado/lançamento; esquemas estritos (sem `user_id`). Desconectar em Ajustes revoga na hora. Tabelas sem GRANT: só funções `security definer` que conferem cada passo. O aviso do Supabase "anon pode executar security definer" nessas funções é esperado: são as etapas do OAuth antes do login e todas exigem o hash de um token aleatório de 256 bits. `src/types/database.ts` segue editado à mão (o gerado não sabe das colunas preenchidas por gatilho, como `workspace_id`).

**D-044 Dentro da tela, trocar de visão nunca vai ao servidor.** Abas, filtros e dias mostram dados que já vieram: Tarefas filtra no aparelho; Cozinha e Nós montam todas as abas e só mostram/escondem (`Tabs`); a Agenda carrega o mês anterior, o atual e o próximo e troca dia/semana/mês/setas no aparelho (fora disso, busca). A URL acompanha com `history.replaceState` (o Next sincroniza sem recarregar), então voltar abre na mesma visão. Setas de mês em Finanças/Relatório e links do dia a dia usam pré-carga completa. Criar tarefa e compromisso pelo campo rápido aparece na hora (`useOptimistic`; some quando a lista real chega na mesma transição; se falhar, o texto volta ao campo). Botões de enviar mostram o giro sozinhos (`useFormStatus`). Constantes usadas pelo servidor não podem morar em arquivo `"use client"` (viram referência de cliente e quebram a tela).

**D-045 Excluir é sempre em dois toques, num componente só.** `ConfirmButton` (`src/components/ui/confirm-button.tsx`): 1º toque fica vermelho com "Toque de novo para apagar" (ou cancelar/arquivar/descartar/desconectar), 2º confirma; desarma em 3 s ou com toque fora. Variante `compact` (só ícone; armado vira pílula) para linhas de lista. Vale para todo botão de apagar/remover/arquivar/cancelar do app.

**D-046 Criar e apagar tarefa (e remover item do mercado) vão pela fila.** Novas ops `task.create` (id do aparelho vira o id da tarefa; o servidor lê a frase de novo com `createTaskFromText`) e `task.delete`. A lista junta servidor + fila (`mergeTasks`): aparece/some em < 100 ms. Exclusões ficam **seguradas 5 s** na fila (`enqueue(op, { holdMs })`), a janela do "Desfazer" (`cancelPending`); a op fica gravada no aparelho e vai mesmo se o app fechar. Se o servidor recusar, a fila avisa (`onRejected`) e o item volta com mensagem de erro.

**D-047 Telas internas têm "‹ Voltar".** `PageHeader back="/tela-mãe"`: volta no histórico quando houve navegação no app desde que abriu; aberta direto ou após recarregar, vai para a tela-mãe.

**D-048 A casca do app sai antes dos dados.** O layout não espera mais o banco: os dados da janela "+" carregam num `Suspense` (a barra aparece na hora; o "+" abre quando chegam). Primeiro byte local caiu de ~400–660 ms (produção antiga, página inteira) para ~15 ms, com o esqueleto em seguida. **Casca pelo service worker: não** — o HTML do App Router referencia os arquivos do build daquele momento e traz dados pessoais; servir uma casca guardada arrisca tela de versão velha e quebra após cada deploy. O streaming resolve o mesmo problema sem esse risco.

**D-049 Agenda busca os meses vizinhos antes do toque.** `/api/agenda?from&to` (RLS da pessoa) devolve eventos e tarefas de um intervalo; a tela mantém carregados o mês anterior e o seguinte ao mostrado. Finanças: as setas trocam o título e mostram o esqueleto no toque, com os meses vizinhos pré-carregados. A barra pré-carrega Mercado e Ajustes ao abrir o app. `html { scroll-padding-bottom }` reserva a altura da barra: rolar até um elemento nunca o deixa atrás dela.

**D-050 Conector MCP cobre o app inteiro, com confirmação em dois passos.** As ferramentas ficam num registro só (`src/features/mcp/server/tools.ts`, esquema zod → JSON Schema) e chamam as mesmas ações e a mesma fila offline das telas (`applyOp` em `src/features/sync/server/apply.ts`), então RLS, idempotência e pontos do álbum valem igual. Leituras devolvem ids; para agir, o modelo usa o id. Excluir/arquivar e tudo que mexe em dinheiro exigem `confirm: true`: sem ele a ferramenta só devolve o que faria (com o nome do item, lido pela RLS — id de outra pessoa = "não encontrei"). O acerto do casal descobre a outra pessoa pelo espaço Nós (o modelo nunca escolhe usuário). Editar tarefa/compromisso muda só os campos pedidos (as ações das telas remontam a repetição). Fora do conector, de propósito: ajustes, convites, renda de referência, notificações, fotos, importar extrato e o álbum.

**D-051 Assistente do Finch = conector + voz + anexos.** O assistente usa o mesmo registro de ferramentas do conector (`callTool(..., "app")`), sem o campo `confirm` no esquema que o modelo vê: excluir e dinheiro viram um cartão "Confirmar" e quem executa é a pessoa (`confirmProposal`, validado de novo no servidor). Lista de ferramentas em cache de prompt. **Voz:** Web Speech API do navegador (pt-BR, sem chave e sem custo); o microfone só aparece onde existe, senão vale o ditado do teclado. Transcrever arquivo de áudio precisaria de outro provedor (a Messages API não recebe áudio) — fica de fora até ter. **Anexos:** até 3 por mensagem, só na mensagem em que foram enviados (depois fica o nome): foto reduzida no aparelho (1600 px, sem EXIF) → imagem; PDF até 2,8 MB → documento; CSV/OFX/TXT → texto. Total abaixo de 4,5 MB (limite do corpo na Vercel). O conteúdo dos anexos é dado, nunca instrução.

