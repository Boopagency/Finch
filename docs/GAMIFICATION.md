# Gamificação: o álbum de figurinhas

> Decisão D-017: a gamificação do Finch **é** o álbum. Sem placar, sem penalidade, sem competição entre vocês.

## 1. Ideia

Como os álbuns da Copa: vocês completam juntos um álbum com figurinhas originais do Finch. Cuidar da rotina rende **pacotinhos**; abrir um pacotinho revela figurinhas; as **repetidas** podem ser trocadas entre vocês dois. Algumas figurinhas são **especiais** (brilhantes) e só saem por conquistas específicas.

## 2. Estrutura

- **Álbum do casal** (workspace "Nós") com páginas temáticas. Cada pessoa também tem seu álbum pessoal enquanto não há parceiro vinculado; ao vincular, as figurinhas coladas continuam de quem colou.
- **Páginas** (temporada 1, ~60 figurinhas): Rotina, Casa, Corpo, Dinheiro, Mesa (alimentação), Nós.
- **Figurinha**: `code` (ex.: `CASA-07`), página, nome, raridade (`comum`, `rara`, `especial`), arte (SVG próprio).
- **Página completa** → recompensa definida por vocês (ex.: "jantar fora", "um dia sem lavar louça"). Recompensas são texto livre, sem valor financeiro automático.

## 3. Como se ganha

| Fonte | Rende |
|---|---|
| Ações do dia a dia (tarefa, hábito, água na meta, treino, rotina da casa, planejamento semanal) | pontos de pacote (tabela `xp_rules`, valores do PRD) |
| A cada 100 pontos | 1 pacotinho com 3 figurinhas comuns/raras (sorteio) |
| Conquistas (ex.: 4 semanas com planejamento de domingo, 10 treinos, primeira divisão acertada) | 1 figurinha **especial** específica, nunca sorteada |
| Desafio da semana do casal | 1 pacotinho extra para cada um |

- O pacotinho é guardado até a pessoa abrir (momento de prazer: animação de rasgar e revelar).
- Sorteio **determinístico e auditável**: semente = id do pacote; o resultado é gravado ao abrir e nunca muda.
- Sem perda: nada expira, nada é tirado por ausência ou doença.

## 4. Trocas

- Repetidas ficam no "monte". Qualquer um propõe uma troca (1 por 1); o outro aceita ou recusa.
- Também dá para **dar** uma repetida de presente.
- Trocas são transacionais (função SQL) e idempotentes.

## 5. Anti-exploração

- Pontos vêm de `xp_events` com chave única `(user_id, rule_key, source_type, source_id, period_key)`. Desfazer marca `revoked_at`; refazer não concede de novo.
- Teto diário de pontos por regra (ex.: no máximo 5 tarefas contam por dia) para não premiar quebrar tarefas em pedacinhos.
- Pacotes são concedidos pelo backend a partir de `domain_events`, nunca pelo cliente.

## 6. Modelo de dados (Etapa 2)

- `sticker_pages` (season, code, name, position, reward_text)
- `stickers` (code unique, page_id, name, rarity, art_path, unlock_rule jsonb null)
- `xp_rules` (key, points, daily_cap, active)
- `xp_events` (user_id, rule_key, source_type, source_id, period_key, points, revoked_at) — unique acima
- `sticker_packs` (id, user_id, workspace_id, reason, created_at, opened_at)
- `sticker_items` (id, owner_id, sticker_id, pack_id null, pasted_at null, workspace_id) — cada cópia física
- `sticker_trades` (id, workspace_id, from_user, to_user, give_item_id, want_item_id null, status, created_at, decided_at)
- Funções: `grant_points`, `open_pack(pack_id)`, `paste_sticker(item_id)`, `propose_trade`, `answer_trade`.
- RLS: álbum do casal visível para os dois; itens não colados de cada um visíveis para ambos só no "monte" de trocas.

## 7. Arte

Figurinhas são ilustrações **originais** do Finch (objetos do dia a dia, o passarinho em situações, lugares da casa), estilo recorte com borda branca, cores da paleta Canto. Nada de imagens de terceiros. Primeira leva: 60 SVGs simples feitos para o projeto; a arte pode evoluir depois sem mudar o modelo.

## 8. Onde aparece

- **Hoje**: figurinha recém-ganha aparece como "sticker" dentro da frase do dia e pacotinhos fechados aparecem como bolha.
- **Vida → Álbum**: páginas, contagem (ex.: 23/60), monte de repetidas e trocas.
- Notificação opcional: "Você ganhou um pacotinho" (categoria Conquistas).
