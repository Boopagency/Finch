# Progresso

_Atualizado em 2026-11-26. Status: `implementado` · `testado (unidade/banco/E2E)` · `validado no iPhone`._

**No ar:** https://finch-ecru.vercel.app · branch `claude/lucid-rubin-r0jdza` (produção da Vercel).
**O que depende do Jabez:** [PENDENCIAS_JABEZ.md](PENDENCIAS_JABEZ.md) · **Roteiro no iPhone:** [TESTES_IPHONE.md](TESTES_IPHONE.md)

## Módulos

| Módulo | Status | Testes |
|---|---|---|
| Fundação: login e-mail+senha, convite, espaços pessoal/Nós, RLS, perfil, ajustes | implementado; login e push **validados no iPhone do Jabez** | SQL (RLS) + E2E |
| PWA: manifest, ícones, SW (offline, push, deep link, atualização) | implementado; instalação validada no iPhone | E2E (corrigido bug de recarregar na 1ª instalação) |
| Notificações: fila, cron 1 min, silêncio, retry, relevância, planejador | implementado; push validado no iPhone (0,5 s / 1,2 s) | unidade + SQL |
| Água: 1 toque, desfazer, meta ≤ 5 L, histórico, lembretes que param na meta | testado | unidade + SQL + E2E |
| Hábitos: feito/quantidade, dias/X por semana, lembrete, consistência sem punição | testado | unidade + SQL + E2E |
| Fila offline (IndexedDB → `/api/sync`, idempotente) para água, hábitos, tarefas, mercado | testado (modo avião simulado) | unidade + E2E |
| Tarefas: recorrência, ocorrências independentes, rodízio, subtarefas, adiar, quadro, busca, adição rápida em PT | testado | unidade + SQL + E2E |
| Agenda: dia/semana/mês, eventos recorrentes e de vários dias, conflitos, lembrete antecipado, tarefas na agenda | testado | unidade + SQL + E2E |
| Mercado: listas do casal **em tempo real**, offline, corredores, modo supermercado, finalizar compra, histórico de preço | testado com 2 usuários simultâneos | unidade + SQL + E2E |
| Álbum de figurinhas: pontos por triggers, teto diário, pacotinhos, sorteio determinístico, especiais, presente e troca | testado | SQL + E2E |
| Financeiro (núcleo): contas, cartões, parcelas, faturas, previsto/realizado, divisão do casal, acerto, orçamento, lançamento rápido, compra → despesa | testado | unidade + SQL (regras da spec) + E2E |
| Treino: biblioteca (26 exercícios + próprios), fichas, execução com séries **offline**, descanso pelo relógio (sobrevive a recarregar/bloquear), histórico, recordes (1RM estimado), +30 pontos no álbum | testado | unidade + SQL + E2E (modo avião) |
| Saúde: peso, cintura, sono, humor; tendência de peso e sono médio; privado | testado | unidade + SQL + E2E |
| Cozinha: despensa com mínimo e validade, Repor → lista, receitas (porções escaláveis) → lista pulando o que tem em casa, cardápio da semana → lista; compra finalizada repõe a despensa | testado com 2 usuários | unidade + SQL + E2E |
| Nós: datas especiais com contagem (29/02 tratado) e aviso no Hoje, lugares (queremos ir/fomos com nota), memórias em linha do tempo | testado com 2 usuários | unidade + SQL + E2E |
| Metas pessoais ou do casal: soma atômica (os dois ao mesmo tempo), ritmo por semana até o prazo, +50 pontos ao bater | testado com 2 usuários | unidade + SQL + E2E |
| Finanças 2: recorrentes (salário, aluguel, assinaturas) que entram sozinhos como previsto, relatório de 6 meses e categorias vs. mês anterior, exportação CSV para Excel | testado | unidade + SQL + E2E |
| Assistente Finch (aba do passarinho, D-051): as 74 ferramentas do conector, **voz** (microfone do navegador, envia ao parar), **anexos** (foto, PDF, CSV/OFX/TXT → lê e age, ex.: comprovante vira lançamento); excluir e dinheiro só com cartão "Confirmar"; cota diária por pessoa; **falta a chave de IA (`AI_API_KEY` na Vercel)** | testado com API falsa local (laço completo até o banco) | unidade + SQL + E2E `assistant.e2e.mjs` (10) |
| Fotos: evolução corporal (privadas, antes/agora) e foto nas memórias; reduzidas no aparelho, sem localização; bucket privado com links de 1 h | testado com 2 usuários | SQL + E2E |
| Importar extrato do banco (OFX/CSV, Windows-1252): prévia, categoria sugerida, aviso de possível duplicado, reimportar não duplica | testado | unidade + E2E |
| Coisas da casa: itens com garantia e foto da nota, manutenções com próxima data; avisos no Hoje | testado com 2 usuários | unidade + SQL + E2E |
| Hoje: frase por regras com água/hábitos/tarefas/eventos; listas do dia; avisos (últimas 12 h, sem repetidos); fotos do casal no topo | testado | E2E |
| Fluidez (relato de 26/11): telas visitadas voltam na hora (cache do roteador 30 s + pré-carga das abas e blocos da Vida), atualiza ao voltar para o app, toque com resposta imediata, barra de baixo não sobe mais no iPhone, campos de data/hora/seleção não vazam, título encolhe em tela estreita | testado | E2E (iPhone 13 e SE: nenhuma tela com rolagem lateral) |
| Relatório do teste no navegador (26/11, 3º lote): excluir em dois toques em todo o app com Desfazer (tarefa, item do mercado); interruptor único (bolinha saía do trilho em Ajustes); "‹ Voltar" em 20 telas; cartões do Hoje não ficam atrás da barra; criar/apagar tarefa pela fila (< 100 ms); aviso do compromisso com o dia e "Ver"; Agenda e Finanças trocam de mês na hora; casca do app sem esperar o banco; dicas que cabem em 375 px | testado | E2E `fixes.e2e.mjs` (11) + 375 e 393 px em 25 telas; Álbum validado com o usuário B (o A bateu o teto diário de pontos com os testes) |
| Micro-interações instantâneas (relato de 26/11, 2º lote): abas de Tarefas/Cozinha/Nós, dia/semana/mês e setas da Agenda trocam no aparelho; tarefa e compromisso novos aparecem na hora; botões de salvar mostram progresso; interruptores do design no lugar das caixinhas azuis do iOS; horário centralizado nos campos | testado | E2E (19 suítes) + medição |
| "+" Registrar: abre sem teclado, continua aberto depois de adicionar (aviso dentro da janela), não bloqueia a tela de trás | testado | E2E |
| Seletor de opções novo (pílula que desliza) em Finanças, Agenda, Metas, Tarefas e formulários | testado | E2E |
| Excluir em dois toques: fichas e treinos, exercícios próprios, listas de mercado | testado | E2E |
| Notificações: escolher em Ajustes o que receber (água, hábitos, tarefas, agenda, contas, casa…); desligar apaga os avisos pendentes daquele tipo | testado (envio pulado conferido em produção) | E2E |
| Foto de perfil e foto do casal (Ajustes; aparecem no Hoje e em Nós) | testado com 2 usuários | SQL + E2E |
| **MCP para o Claude** (conector: ver o dia, tarefas, agenda, finanças e mercado; registrar água, tarefa, compromisso, gasto) com OAuth + PKCE, senha na autorização, desconectar em Ajustes | testado (migration aplicada em 26/11; descoberta e registro conferidos no site publicado) | unidade + SQL + E2E (9: OAuth completo, senha errada, PKCE errado, código de uso único, todas as ferramentas, refresh com rotação, desconectar) |
| **Conector completo** (D-050): 74 ferramentas — tarefas (concluir, editar, adiar, excluir, subtarefas), agenda (editar, excluir), água (desfazer), hábitos (marcar, criar, arquivar), mercado (marcar, tirar, outras listas, finalizar compra), finanças (detalhe do mês, lançamento completo, confirmar previsto, cancelar, acerto do casal, orçamento, contas), saúde, treino (começar, séries, terminar), Nós, metas, cozinha (despensa, receitas, cardápio → lista) e casa; excluir e dinheiro só com `confirm: true` | testado | unidade + SQL + E2E `mcp.e2e.mjs` (10, contra o Supabase de produção) |

## Números (26/11)
- `npm test`: **82** testes de unidade passando.
- `npm run test:db`: **16** suítes SQL passando (+ fotos de perfil/casal e MCP/OAuth), cada uma em banco limpo.
- `npm run test:e2e`: **123** testes em 20 suítes passando (iPhone 13/15 simulado, 2 usuários de teste, Supabase de produção).
- `lint`, `typecheck`, `build`: passando.

## Desempenho (25/11, medido no site publicado, iPhone 15 simulado)
Relato do Jabez: toques "demoram e às vezes não vão", principalmente na barra.
| | Antes | Depois |
|---|---|---|
| Resposta ao toque na barra | 1.000–1.300 ms sem nada na tela | **45–69 ms** (esqueleto pré-carregado) |
| Servidor Hoje / Tarefas / Finanças | 1.958 / 813 / 778 ms | 709 / 359 / 419 ms |
Causas e correções (25/11): sem estado de carregamento (`loading.tsx`); funções na Vercel longe do banco (agora `pdx1`, ao lado do Supabase `us-west-2`); consultas repetidas e gravação de ocorrências a cada abertura (cache por requisição; cron materializa); recarregamentos a cada sincronização (agrupados); `touch-action: manipulation`.

Lote de 26/11 (Playwright local): voltar a uma tela já vista caiu de ~810 ms para **17–25 ms**, sem ida ao servidor; resposta visual ao toque < 200 ms.

2º lote de 26/11, toque → tela mudou: abas de Tarefas 823–839 → **39–64 ms**; dia/semana/mês da Agenda 821–834 → **54–84 ms**; seta de mês da Agenda 550 → **41 ms** (dentro de ±1 mês; além disso ~400 ms); mês em Finanças 692 → **93 ms**; abas da Cozinha 411 → **57 ms** e de Nós 1.267 → **61 ms**; criar tarefa/compromisso: aparece em **65–71 ms**.

## Bugs encontrados e corrigidos pelos testes
- iPhone instalado: a barra de baixo subia a altura da barra de status em telas curtas (altura mínima do `html` no modo app).
- Janela do "+" abria com teclado (foco automático no 1º campo) e fechava ao adicionar; o aviso ficava atrás da janela e travava toques.
- Título grande vazava no iPhone SE (Recorrentes); campos de data/hora e seleção estouravam a largura no Safari.
- Estilos base fora de `@layer` ganhavam dos utilitários do Tailwind (anel de foco e campos).
- Service worker recarregava a página na 1ª instalação (apagava o login).
- Tabelas sem GRANT para a API ("permission denied") — projeto Supabase novo não expõe por padrão (D-020).
- Tempo real entrava como anônimo antes da sessão carregar (sem eventos) — agora autentica antes de assinar.
- Janela de detalhe de tarefa mostrava dados velhos após salvar subtarefa.
- Consistência de hábito contava dias antes do hábito existir.
- Fila offline: op feita durante um envio esperava o próximo gatilho; e ao reabrir o app a fila voltava fora de ordem (chave = uuid), então "apagar" podia ser aplicado antes de "adicionar" e o item reaparecia. Afetava hábitos também. Corrigido na fila (vale para todos os módulos).
- Animação de entrada das telas prendia elementos fixos (barra do chat, botões presos embaixo) no meio da tela.
- Chamadas à API sem sessão recebiam a página de login (HTML) em vez de 401; afetava a fila offline com sessão expirada.
- Apagar tarefa e tocar em Desfazer reabria a ficha da tarefa (a folha desmontava antes do evento de fechar).
- Cartão no fim do Hoje ficava atrás da barra quando a tela rolava até ele; o toque caía no ícone Hoje.
- Assistente: resposta com mais de 4.000 caracteres travava a conversa (o histórico era recusado); agora cada mensagem é cortada no limite ao enviar.
- Campo do chat perdia o que foi digitado antes da tela terminar de carregar; texto longo sem espaço vazava da bolha.
- Confirmar ou cancelar a 2ª/3ª parcela de uma compra falhava em silêncio (o validador recusava ids gerados pelo banco).
- Sugestões do mercado escondiam o que acabou de ser comprado quando havia empate de contagem.
- Finalizar compra com o mesmo item repetido na lista ("arroz" e "Arroz") dava erro no banco.
- Campos de carga/reps vazavam da tela no iPhone e cobriam o botão de registrar série.
- "1,5 l" virava dois itens; "água" sem categoria (limite de palavra sem acento no JS).

## Não feito / limitações conhecidas
- **Validação no iPhone** de tudo que veio depois do push (ver roteiro). Duda ainda não entrou.
- Abrir o app **do zero sem internet** mostra a página offline (telas não são cacheadas por conterem dados pessoais); com o app aberto, registrar offline funciona.
- Financeiro: evolução patrimonial e simulações ainda não. Recorrências são geradas ao abrir Finanças (até o mês que vem).
- Lente global Tudo/Eu/Nós (D-011): por ora cada tela tem o seletor do espaço onde faz sentido.
- Treino: substituições de exercício e RPE ainda não. Iniciar sessão precisa de internet (as séries não).
- Nós: lembrete push das datas especiais ainda não (aparecem no Hoje 7 dias antes). Fotos de documentos em PDF não (só imagem). Metas ainda não puxam valores sozinhas do financeiro/treino.
- Assistente: validado só com API falsa (sem custo). Com a chave real, testar no iPhone; leitura de comprovante por foto e relatório semanal automático ainda não.
- Artes das figurinhas usam ícones Lucide (licença ISC) em composição própria; podem ganhar ilustrações exclusivas depois.
- `npm audit` com avisos em dependências de desenvolvimento.

## Próximos passos sugeridos
1. Jabez roda o [roteiro no iPhone](TESTES_IPHONE.md) e convida a Duda.
2. Testar o treino no iPhone na academia (sinal ruim é o caso real do modo offline).
4. Colocar a chave de IA e conversar com o Finch no iPhone.
