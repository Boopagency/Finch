# Finch — PRD

> Estado: **rascunho v0, aguardando aprovação** das decisões em [DECISIONS.md](DECISIONS.md) (itens marcados como `PENDENTE`).

## 1. Visão

Finch é o "sistema operacional" da vida pessoal e a dois de Jabez e Duda: rotina, dinheiro, casa, corpo e relacionamento num único Web App (PWA) instalado no iPhone. Ele não espera ser aberto: **lembra, resume e registra** por vocês.

Princípios do produto:

1. **Registrar é instantâneo.** Água em 3 s, item de mercado em 5 s, despesa simples em 15 s.
2. **O Hoje mostra só o que pede atenção agora.** O resto fica a um toque.
3. **Privado por padrão, compartilhado por escolha.** Fazer parte do casal não dá acesso aos dados pessoais do outro.
4. **Um registro, muitos lugares.** Uma conta a pagar aparece na agenda, no Hoje e no orçamento sem ser duplicada.
5. **Cuidado, não cobrança.** Gamificação colaborativa, sem penalidade por descanso ou ausência.
6. **Matemática no backend, linguagem na IA.** Números vêm de cálculos determinísticos; a IA interpreta e conversa.

## 2. Usuários e escopo

- Dois usuários (iPhone, Safari/PWA standalone), mais uso eventual em desktop.
- Sem cadastro público, sem cobrança, sem landing page. O modelo de dados não assume "exatamente dois usuários" nem IDs fixos.
- Português do Brasil, BRL, sistema métrico, fuso por usuário (padrão `America/Sao_Paulo`).

## 3. Workspaces e privacidade

| Workspace | Membros | Exemplos de dados |
|---|---|---|
| Pessoal (um por usuário) | só o dono | finanças pessoais, saúde, fotos de evolução, hábitos, treinos |
| Compartilhado ("Nós") | os dois | casa, mercado, despesas divididas, agenda do casal, metas comuns, viagens, memórias |

- O vínculo é feito por **convite privado** (token de uso único, expira em 7 dias, revogável).
- Compartilhar é sempre explícito: o item é criado no workspace "Nós" ou movido para ele.
- Na interface há uma **lente** `Tudo · Eu · Nós` (ver DECISIONS D-011). "Tudo" mistura os dois workspaces que o usuário pode ver, sem nunca mostrar dados pessoais do parceiro.

## 4. Navegação

Barra flutuante com cinco destinos:

1. **Hoje** — central do dia.
2. **Agenda** — dia/semana/mês, unificando eventos e itens de outros módulos.
3. **Registrar (+)** — bottom sheet com ações rápidas e campo de texto livre ("500ml", "180 mercado crédito").
4. **Vida** — grade das áreas: Finanças, Treino, Saúde, Hábitos, Casa, Mercado, Alimentação, Nós, Metas.
5. **Finch** — assistente IA.

## 5. Módulos

Requisitos completos estão na especificação original do projeto. Este PRD registra **regras de negócio e decisões** de cada módulo; detalhes de dados em [DATABASE.md](DATABASE.md).

### 5.1 Hoje
- Frase-resumo do dia no topo, gerada por **regras** (sem IA): compromissos, contas próximas, treino, pedidos do parceiro. Máximo de 3 itens; o resto vira "e mais N".
- Blocos ordenados por urgência e momento do dia (manhã: agenda e água; noite: treino e planejamento de amanhã).
- Blocos personalizáveis: ocultar, reordenar (salvo em `user_settings.home_layout`).
- Pote de sementes da semana (gamificação, seção 6).

### 5.2 Tarefas
- Um único sistema de tarefas para tudo (casa, contas, projetos). Módulos como Casa usam tarefas com categoria, nunca um sistema paralelo.
- Recorrência por regra RRULE; cada ocorrência é uma linha própria (histórico preservado, adiar uma não afeta as outras).
- Rodízio de responsáveis: a regra guarda a lista de membros e o próximo índice; a ocorrência grava quem ficou responsável.
- Caixa de entrada = tarefas sem data e sem projeto.
- Visualizações lista e Kanban (status: a fazer, fazendo, feito).

### 5.3 Agenda
- Eventos próprios + **itens projetados** de outros módulos (ocorrências de tarefa com horário, contas a vencer, treinos planejados, viagens). A agenda lê, não copia. Editar abre o módulo de origem.
- Conflitos: sobreposição de itens com horário entre membros do mesmo workspace.
- Planejamento semanal guiado (domingo): revisar semana passada, puxar pendências, distribuir tarefas da casa.

### 5.4 Financeiro
Regras obrigatórias (todas viram testes):
- Valores em **centavos inteiros** (`bigint`). Nada de `float`.
- Modelo de **razão de partidas** (ledger): toda movimentação é um lançamento com 2+ partidas que somam zero. Ver DATABASE.md §4.
- Transferência entre contas não é receita nem despesa.
- Compra no cartão gera despesa uma vez, contra o passivo do cartão. Pagar a fatura é transferência conta → cartão.
- Parcelamento: total dividido em centavos; o resto da divisão vai para a primeira parcela. Cada parcela cai na fatura do mês correto pelo dia de fechamento.
- Previsto × realizado: lançamentos têm `status` (`previsto`, `realizado`, `cancelado`).
- Benefícios (VR/VA) são contas com tipo próprio e nunca entram em "dinheiro livre".
- Saldo disponível ≠ limite de crédito.
- Operações compostas (compra parcelada, pagamento de fatura, divisão, acerto) rodam em **funções PostgreSQL transacionais** com chave de idempotência.
- Simulações vivem em tabelas próprias e nunca tocam o razão real.
- Correções são feitas por estorno + novo lançamento, ou por edição registrada em `activity_logs`.

Divisão de despesas do casal:
- Métodos: 50/50, proporcional à renda, percentual, valores fixos.
- "Proporcional à renda" usa a **renda de referência** que cada um declara no workspace compartilhado. Nunca lê contas pessoais.
- Despesa compartilhada mora no workspace "Nós"; o pagamento pode sair de uma conta pessoal. O parceiro vê quem pagou e quanto, não de qual conta.
- Painel de acerto: devido × pago × diferença; acerto registrado como transferência entre membros.

Fora do escopo inicial: Open Finance. Importação CSV/OFX: estrutura preparada, implementação na Etapa 3+.

### 5.5 Treinos
- Biblioteca de exercícios própria (sem mídia de terceiros), fichas, divisão semanal, execução série a série com dados da última sessão ao lado.
- Execução **offline-first**: sessão inteira gravada em IndexedDB e sincronizada depois.
- Cronômetro de descanso por timestamp (`ends_at`), recalculado ao voltar ao app. Som enquanto o app está aberto. Push quando fechado é "melhor esforço" (atraso de até ~1 min).
- Evolução física: peso, medidas, fotos privadas (bucket privado, URLs assinadas).

### 5.6 Saúde, hidratação e hábitos
- Meta de água individual, copos/garrafas favoritos, lembretes em horário ativo; lembretes param quando a meta é atingida. Sem estímulo a beber além da meta.
- Hábitos: diários, semanais, quantitativos, por duração, por frequência (x vezes/semana).
- Saúde opcional (sono, humor, energia, remédios, consultas, exames, ciclo). Tudo privado; a IA não diagnostica.

### 5.7 Mercado
- Listas múltiplas, realtime entre os dois, offline-first.
- Modo supermercado: lista agrupada por categoria, toque grande para marcar, uma mão.
- Finalizar compra → (opcional) gera **uma** despesa (idempotente pela lista/compra) e entradas na despensa.

### 5.8 Alimentação
- Receitas, planejamento semanal, marmitas, custo estimado, nutrição opcional.
- Plano gera itens na lista de compras descontando a despensa.

### 5.9 Casa
- Rotinas de limpeza = tarefas recorrentes com rodízio.
- Despensa (estoque e validade), ativos (móveis, eletros, garantias), manutenções, documentos, prestadores.

### 5.10 Nós (relacionamento) e viagens
- Datas importantes, encontros, lugares, filmes/séries, desejos, presentes (com visibilidade só para quem criou, para surpresas), diário de memórias, linha do tempo.
- Viagem agrega: orçamento, despesas, eventos, tarefas, checklist e meta financeira.

### 5.11 Metas
- Tipos: valor (financeira), quantidade, frequência, etapas.
- Progresso calculado a partir de registros vinculados (contribuições, treinos concluídos, tarefas), nunca digitado à mão quando há fonte.

## 6. Gamificação

Metáfora (direção B "Alpiste", pendente de aprovação): cada ação concluída solta uma **semente** da cor da área no **pote semanal do casal**.

- **XP** (evolução, por pessoa) e **sementes** (visual coletivo) vêm do mesmo evento. **Pontos resgatáveis** ficam num razão separado, se recompensas forem ativadas.
- Valores iniciais configuráveis (`xp_rules`): tarefa 10, hábito 15, meta de água 20, treino 30, rotina doméstica 25, planejamento semanal 30, desafio semanal 75, objetivo importante 100.
- Anti-exploração: chave única por `(usuário, regra, origem, período)`. Desfazer revoga; refazer não concede de novo.
- Sem penalidade: sequências têm "dias de descanso" e pausas (doença, viagem). Nunca se perde XP.
- Sem placar entre vocês. Desafios compartilhados somam os dois.

## 7. Notificações
Ver [NOTIFICATIONS.md](NOTIFICATIONS.md).

## 8. Assistente IA
Ver [AI_ASSISTANT.md](AI_ASSISTANT.md).

## 9. Critérios de aceitação da v1

A **v1** = Etapas 0 a 3 do [ROADMAP.md](ROADMAP.md) mais a lista de mercado (puxada para a Etapa 2). Ela está pronta quando, **nos dois iPhones reais**:

1. Os dois instalam o app, fazem login por código e ficam vinculados por convite; RLS testado impede cada um de ler dados pessoais do outro.
2. Push chega com o app fechado nos dois aparelhos, respeitando horário silencioso, e para quando a atividade foi resolvida.
3. Registrar água leva ≤ 3 s a partir do Hoje; funciona offline e sincroniza sem duplicar.
4. Item adicionado ao mercado por um aparece no outro em ≤ 2 s com ambos online.
5. Tarefa recorrente semanal com rodízio gera ocorrências corretas por 8 semanas, com histórico preservado ao adiar uma.
6. Despesa simples registrada em ≤ 15 s; compra parcelada no cartão aparece nas faturas certas; pagamento de fatura não duplica despesa; testes financeiros passam.
7. Despesa compartilhada proporcional à renda mostra devido × pago × acerto corretos.
8. O Hoje mostra a frase-resumo e os blocos relevantes, e a agenda mostra contas e tarefas sem duplicação.
9. Sair da conta limpa IndexedDB e caches com dados privados.
