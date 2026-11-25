# Design system

> Estudo visual com as três direções: [docs/brand/finch-identidade.html](brand/finch-identidade.html) (publicado como artifact privado).
> Estado: **direção recomendada B "Alpiste" + frase-resumo de C, aguardando aprovação.** Tokens abaixo assumem B.

## 1. Leitura das referências

**Referência 1 (JAMIE / MY JAR, @krisstinadiz)**
- Fundo branco puro, cartões cinza muito claros, quase sem sombra.
- Título de tela único em grotesca condensada ultra-negrito, caixa alta, centralizado ("JAMIE", "MY JAR"); subtítulo minúsculo e cinza.
- Pílulas: "Menu", seletor de semana, botão preto "Let's talk", chips de sentimento com bolinha colorida e contagem.
- Bento assimétrico: passos, sono, desenho, aniversário (azul saturado), "minhas emoções".
- Personagem 3D de massinha sobre uma forma verde orgânica: calor e personalidade num ponto só.
- Gamificação: o pote de sentimentos, bolinhas coloridas que se acumulam. Registro vira coleção visível.
- Barra inferior flutuante com avatar, coração e ícone.

**Referência 2 (Today / Saved / Chats)**
- "Today" em fundo preto, com frase longa em cinza e trechos importantes em branco, intercalada por figurinhas recortadas (livro, casaco, scooter, sorvete).
- "Saved": fundo claro com grade de papel, pastas coloridas (amarelo, azul, laranja, lilás, vermelho, verde) com fotos saindo, contagem de itens e avatar.
- "Chats": balões de fala grandes e saturados, cada um com avatar, nome, hora, prévia e contador.
- Títulos grandes em grotesca negrito, alinhados à esquerda; metadado à direita ("9 folders", "5 chats").
- Barra flutuante branca com o item ativo em pílula preta e avatar do usuário.

**Princípios extraídos**
1. Uma palavra dominante por tela.
2. Fundo neutro; cor saturada só em conteúdo com significado.
3. Formas que explicam o dado (pasta = coleção, balão = conversa, bolinha = registro).
4. Calor por objetos pontuais (personagem, figurinha), não por gradientes.
5. Navegação flutuante e discreta.
6. Registro transformado em coleção visível.

## 2. Direção proposta (B "Alpiste")

Branco e cinza-casca fazem a estrutura; preto para ações e o título; **cada área da vida tem uma cor de semente** usada em chips, barras de progresso, pontos e no pote. Título de tela em condensada caixa alta, só uma vez por tela. O resto em Geist, calmo e legível. Microinterações: semente cai no pote ao concluir algo; feedback háptico não existe na web, então a resposta é visual e sonora curta (opcional).

## 3. Tokens (rascunho)

```css
/* cores base */
--c-bg: #FFFFFF;      --c-surface: #F3F3F0;  --c-surface-2: #E9E9E4;
--c-ink: #0B0B0B;     --c-ink-2: #5E5E59;    --c-ink-3: #8A8A85;  --c-line: #E2E2DD;
/* áreas (sementes) */
--c-health: #36C46B;  --c-routine: #6FB6E8;  --c-home: #F5A68C;
--c-money: #FFB020;   --c-workout: #3B2A26;  --c-us: #E8352B;
/* semânticas (independentes das áreas) */
--c-success: #1F9D55; --c-warning: #C77700;  --c-danger: #D92D20;  --c-info: #2563EB;
/* dark */
--c-bg: #0B0B0B; --c-surface: #171716; --c-surface-2: #222220; --c-ink: #F5F5F2; …
```

- **Tipografia**: `--font-display: Archivo (wdth 62, 900, caixa alta)`; `--font-sans: Geist`. Escala: 12 / 13 / 15 (corpo) / 17 / 22 / 30 / 44 / 76 (título de tela). Números com `tabular-nums`.
- **Espaçamento** (base 4): 4, 8, 12, 16, 20, 24, 32, 48.
- **Raios**: 10 (chip), 18 (cartão), 24 (sheet), 999 (pílula).
- **Elevação**: 0 por padrão; 1 só para barra flutuante e sheets (`0 10px 30px rgb(0 0 0 / .12)`).
- **Movimento**: 150 ms (toque), 240 ms (sheet), mola curta para semente; tudo desligado com `prefers-reduced-motion`.
- **Toque**: alvo mínimo 44×44.

Fontes servidas por `next/font` (baixadas no build, sem chamada a terceiros em runtime).

## 4. Componentes

Button (primário preto, secundário casca, fantasma, destrutivo), IconButton, Pill/Segmented (lente Tudo/Eu/Nós), Input, MoneyInput (centavos, teclado numérico), Sheet (bottom sheet com arrasto), Dialog (desktop), Tile (bento), ListRow, ProgressBar, ProgressRing, SeedJar, Chip de área, EmptyState, Skeleton, ErrorState, Toast com desfazer, TabBar flutuante, Avatar/Par de avatares, gráficos (linha, barra, rosca) com tokens.

Regras: nenhum hex fora de `globals.css`/tokens; shadcn só via componentes de `components/ui` já restilizados.

## 5. Desktop
Mesma linguagem; barra vira trilho lateral, conteúdo em até 2 colunas, sheets viram painéis laterais.
