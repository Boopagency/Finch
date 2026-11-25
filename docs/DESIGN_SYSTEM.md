# Design system

> Estudo visual com as três direções: [docs/brand/finch-identidade.html](brand/finch-identidade.html).
> **Decidido (D-010):** marca e personalidade **Canto**; Hoje no estilo Canto; demais telas pela usabilidade. Gamificação: álbum (D-017).
> Fonte única dos tokens: `src/app/globals.css`.

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

## 2. Direção adotada

- **Marca**: o pássaro-balão coral (o finch que "canta"). A IA é a voz da marca.
- **Hoje**: palco escuro (`--stage`), título "Hoje", data com ponto coral, frase do dia em cinza com trechos importantes em claro e figurinhas coloridas no meio do texto; embaixo, folha clara com balões (novidades, coisas do casal).
- **Demais telas**: fundo papel (`--bg`), cartões brancos (`--surface`), um título grande por tela (`PageHeader`), corpo calmo em Geist. Densidade pensada para finanças e treino.
- **Cor**: neutros fazem a estrutura; as seis cores de balão marcam áreas e conteúdo, nunca decoração. Semânticas (sucesso/alerta/erro) são separadas da marca.
- **Barra flutuante**: pílula branca, item ativo em pílula preta, + coral no centro, o pássaro leva ao assistente.

## 3. Tokens

| Grupo | Tokens |
|---|---|
| Neutros | `--bg #F6F5F1`, `--surface #FFF`, `--surface-2 #EEEDE8`, `--ink #111110`, `--ink-2`, `--ink-3`, `--line` |
| Palco | `--stage #111110`, `--stage-ink #F4F3EF`, `--stage-muted #6F6E69` |
| Balões | `--coral #FF6A5C` (marca), `--sunflower #FFD02E`, `--tangerine #FF9A1F`, `--cobalt #3A6BF5`, `--lavender #C3AEF5`, `--frog #9ADB3C` |
| Semânticas | `--success`, `--warning`, `--danger`, `--focus` |
| Tipo | `--font-display` Schibsted Grotesk 600–800 (títulos, frase do Hoje), `--font-sans` Geist (texto, números `tabular`) |
| Raios | chip 10, cartão 20, sheet 28, pílula 999 |
| Sombra | só `--shadow-float` (barra e sheets) |
| Movimento | 150 ms toque, 240 ms sheet (`--ease-spring`), tudo desligado com `prefers-reduced-motion` |

Dark mode: neutros redefinidos por `prefers-color-scheme`; o palco do Hoje é escuro nos dois temas. Alvo de toque mínimo 44 px. Safe areas via utilitários `pt-safe`, `pb-safe`, `px-gutter`.

## 4. Componentes

Prontos: `Button` (primary, secondary, ghost, danger, coral), `Field`, `PageHeader`, `EmptyState`, `TabBar`, `RegisterSheet` (dialog nativo como bottom sheet), `BrandMark`, balões do Hoje.

A fazer: Pill/Segmented (lente), MoneyInput (centavos), Tile, ListRow, ProgressBar/Ring, Figurinha e Pacotinho (álbum), Skeleton, Toast com desfazer, Avatar/par de avatares, gráficos.

Regras: nenhum hex fora de `globals.css`/tokens; shadcn só via componentes de `components/ui` já restilizados.

## 5. Desktop
Mesma linguagem; barra vira trilho lateral, conteúdo em até 2 colunas, sheets viram painéis laterais.
