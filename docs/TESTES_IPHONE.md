# Roteiro de testes no iPhone

Antes: feche o Finch e abra pelo ícone (para pegar a versão nova). Se aparecer "Nova versão · tocar para atualizar", toque.
Marque ✅ ou ❌ e me mande os ❌ com print.

## Hoje
- [ ] A frase do topo fala de água, hábitos, tarefas ou compromissos do dia (ou "em branco" se não houver nada).
- [ ] Os cartões abaixo mostram água, tarefas de hoje e novidades.

## Botão + (Registrar)
- [ ] **Água em 2 toques:** + → +300 ml. Aparece o aviso com "Desfazer". Teste o Desfazer.
- [ ] **Tarefa:** + → escreva `lavar roupa toda quarta #casa @nós` → aparece "Toda quarta · #Casa · Nós" antes de enviar → enviar.
- [ ] **Mercado:** + → `2 leite, ovos e detergente` → Adicionar.
- [ ] **Gasto:** + → `35 ifood pix` → Lançar (precisa ter uma conta cadastrada em Finanças).

## Água e hábitos (Vida → Água / Hábitos)
- [ ] Mudar a meta e o intervalo de lembretes e salvar.
- [ ] Criar um hábito com **lembrete para daqui 3 min**, fechar o app e esperar a notificação.
- [ ] Marcar o hábito; a notificação seguinte **não** deve chegar se já foi feito.
- [ ] **Modo avião** com o app aberto → registrar água → aparece "Sem conexão · 1 guardado" → desligar o modo avião → some e o total continua certo.

## Tarefas (Vida → Tarefas)
- [ ] Criar `ligar pro banco amanhã 10h` → aparece em "Próximas → Amanhã".
- [ ] Abrir uma tarefa → adicionar subtarefa → adiar para amanhã.
- [ ] Aba **Quadro**: mover uma tarefa para "Fazendo".
- [ ] Criar uma tarefa com horário daqui a 5 min → chega notificação → concluir antes de outra e ver que não repete.

## Agenda
- [ ] Escrever `dentista sexta 15h` → aparece na sexta.
- [ ] Criar dois eventos no mesmo horário → aparece "conflito".
- [ ] Ver Semana e Mês.
- [ ] Evento com "Lembrar 15 min antes" → notificação chega.

## Mercado (Vida → Mercado)
- [ ] Com a Duda (quando ela entrar): um adiciona, o outro vê aparecer **sem recarregar**.
- [ ] **Modo supermercado**: a tela não apaga; marcar itens joga para "No carrinho".
- [ ] **Finalizar compra** com Pix → "Compra registrada e lançada em Finanças" (se você tem conta corrente cadastrada). Itens não pegos vão para a próxima lista.

## Álbum (Vida → Álbum)
- [ ] Abrir o pacotinho de boas-vindas → 3 figurinhas → Colar no álbum.
- [ ] Concluir tarefas/hábitos ao longo do dia e ver a barra de pontos subir.

## Treino e Saúde (Vida → Treino / Saúde)
- [ ] Nova ficha → nome → adicionar 3 exercícios → Salvar.
- [ ] ▶ na ficha → registrar uma série (carga e reps) → aparece o descanso. Bloquear o iPhone 1 min e voltar: o tempo continua certo.
- [ ] Modo avião → registrar mais uma série → tirar do modo avião → recarregar: a série continua lá.
- [ ] Concluir treino → aparece no Histórico e em Recordes; a barra do álbum sobe.
- [ ] Saúde → peso `82,5`, sono `7h30`, humor → Salvar → card de peso e lista atualizam.

## Cozinha (Vida → Cozinha)
- [ ] Despensa → item "Arroz", tem 0,5 kg, mínimo 2 → aparece o aviso amarelo → Repor → o arroz entra na lista do Mercado.
- [ ] Receitas → nova receita com ingredientes um por linha → abrir → mudar porções → "Ingredientes para a lista".
- [ ] Cardápio → escrever o nome da receita no jantar de hoje → o Hoje mostra "Jantar de hoje".
- [ ] Mercado → pegar o arroz → Finalizar compra → a despensa sobe sozinha.

## Fotos, extrato e casa
- [ ] Saúde → Nova foto (câmera) → aparece em "Antes e agora" depois da 2ª. A Duda não vê.
- [ ] Nós → Memórias → nova memória com foto → aparece no celular da Duda.
- [ ] Finanças → Importar extrato → escolha a conta → arquivo OFX exportado do app do banco → confira categorias → Importar. Importar de novo o mesmo arquivo: tudo "já importado".
- [ ] Vida → Casa → Novo item (ex.: geladeira) com garantia e foto da nota → Manutenção com próxima data.

## Nós e Metas (Vida → Nós / Metas)
- [ ] Nós → Datas → começo do namoro (repete todo ano) → contagem de dias e anos.
- [ ] Lugares → um restaurante → "Fomos" → dar estrelas.
- [ ] Memórias → uma memória → a Duda vê no celular dela.
- [ ] Metas → meta do casal em R$ com prazo → cada um soma um valor → ao bater, fica verde e o álbum ganha pontos.

## Assistente (aba do passarinho, depois da chave de IA)
- [ ] "Como está meu dia?" → responde com suas tarefas, água e agenda de verdade.
- [ ] "Bebi 500 ml" → a água sobe no Hoje.
- [ ] "Gastei 45 no uber" → aparece um cartão; só lança ao tocar Confirmar.
- [ ] Ditado do teclado (microfone) funciona no campo.

## Finanças (Vida → Finanças)
- [ ] Cadastrar conta corrente (com saldo de hoje) e o cartão (limite, fecha, vence).
- [ ] `180 mercado crédito` → vai para o cartão, categoria Mercado.
- [ ] Novo lançamento → cartão → 3 parcelas → navegar os meses e ver 1/3, 2/3, 3/3 nas faturas certas.
- [ ] Pagar fatura → o total de **Despesas** do mês não muda.
- [ ] Receita marcada como "previsto" → não entra no Disponível até tocar ⋯ → Confirmar.
- [ ] Recorrentes → salário todo dia 5 na sua conta → volta em Finanças: aparece como previsto → ⋯ → Confirmar.
- [ ] Relatório → ver os 6 meses e as categorias → Exportar CSV abre/baixa no iPhone.
- [ ] (Com a Duda) despesa "Do casal" → os dois veem o acerto; ela **não** vê suas contas pessoais.

## Notificações gerais
- [ ] Durante o horário silencioso (Ajustes), lembretes de água não chegam.
- [ ] Notificações de conta/saúde não mostram valores na tela bloqueada.

## Fluidez e ajustes (lote de 26/11)
- [ ] Trocar de aba várias vezes: a 2ª visita abre na hora; nenhum toque "some".
- [ ] Em telas curtas (Metas, Agenda vazia), a barra de baixo fica no lugar.
- [ ] "+" → abre **sem teclado**; adicionar 2 coisas seguidas sem a janela fechar.
- [ ] Ajustes → Notificações: desligar "Água" → não chega lembrete de água; religar volta.
- [ ] Ajustes → Fotos: trocar sua foto e a foto do casal → aparecem no Hoje e em Nós.
- [ ] Treino → ficha → Excluir (dois toques); treino em andamento → Descartar.
- [ ] Ajustes → Claude → conectar no app do Claude (ver PENDÊNCIAS 1b) → "o que tenho hoje no Finch?".
- [ ] Tarefas: trocar Hoje/Próximas/Sem data/Casa na hora; criar tarefa e ela aparecer no mesmo instante.
- [ ] Agenda: Dia/Semana/Mês, setas e dias da semana trocam na hora; "Semana" aparece inteiro.
- [ ] Cozinha e Nós: abas trocam na hora. Água → Lembretes: interruptor verde e horários centralizados.
- [ ] Teste no computador com a extensão do Claude: [PROMPT_TESTE_NAVEGADOR.md](PROMPT_TESTE_NAVEGADOR.md).
