# Prompt de teste no navegador (Claude in Chrome)

**Antes de colar:** abra https://finch-ecru.vercel.app no Chrome, entre com sua conta e deixe a janela estreita, do tamanho de um celular (ou DevTools → ícone de celular → iPhone 12 Pro/13). A extensão não deve digitar sua senha.

Cole o texto abaixo na extensão:

---

Você vai testar o Finch, um app pessoal (PWA) que já está aberto nesta aba e logado na minha conta: https://finch-ecru.vercel.app. A interface é em português. Quero saber se tudo está **fluido e instantâneo** e se alguma tela **quebra** no tamanho de celular.

**Regras (importante, é minha conta real):**
- Não apague nem edite nada que já existia. Só crie itens começando com `[teste]` e apague/conclua esses no final.
- Não lance dinheiro em Finanças, não mude nada em Ajustes, não troque fotos, não desconecte nada, não saia da conta.
- Se pedir senha ou login, pare e me chame.
- Excluir no app é em dois toques (o botão fica vermelho e pede "toque de novo").

**Para cada toque, classifique a resposta:** ⚡ instantâneo (a tela muda na hora) · ⏳ espera curta (< 1 s) · 🐢 lento (≥ 1 s) · ❌ não respondeu. E anote problemas visuais: texto cortado, coisas sobrepostas, rolagem para o lado, botão fora do lugar, barra de baixo mudando de posição.

**Roteiro:**
1. **Hoje** (primeira aba da barra de baixo): role a tela; toque nos cartões que levam a outras telas e volte.
2. **Barra de baixo:** troque entre as abas várias vezes (Hoje, Agenda, Vida, Finch). A segunda visita deve ser instantânea.
3. **Agenda:** toque em Dia, Semana e Mês; nas setas ‹ ›; em "Hoje"; em dias diferentes da fileira da semana e no calendário do mês. Crie `[teste] café amanhã 10h` no campo do topo: deve aparecer na hora. Abra esse evento, veja os campos (data, hora, interruptor "Dia inteiro") e apague-o (Apagar evento).
4. **Tarefas** (Vida → Tarefas ou cartão no Hoje): toque nas abas Hoje, Próximas, Sem data, Casa, Quadro e Todas. Crie `[teste] regar plantas hoje`: deve aparecer na hora. Marque como feita, use "Desfazer" no aviso, abra a tarefa, olhe a ficha e exclua.
5. **Botão + (laranja, no meio da barra):** deve abrir sem teclado. Crie `[teste] comprar pilha` no primeiro campo (tarefa) e confira que a janela continua aberta depois de adicionar. Feche. (Não use a parte de gasto.)
6. **Mercado:** abra uma lista, adicione `[teste] guardanapo`, marque e desmarque, depois remova.
7. **Vida:** abra cada bloco (Água, Hábitos, Treino, Saúde, Cozinha, Nós, Metas, Casa, Álbum, Finanças) e volte. Em **Cozinha** e **Nós**, troque as abas do seletor do topo. Em **Água**, olhe "Meta e lembretes" (horários centralizados? interruptor bonito?) sem salvar.
8. **Finanças:** use as setas de mês (‹ ›) e abra Relatório e Recorrentes. Só olhe.
9. **Ajustes** (ícone no topo do Hoje): role até o fim e só olhe se algo está quebrado.
10. **Finch** (último ícone da barra): se a conversa estiver ativa, pergunte "o que tenho hoje?". Se disser que falta a chave, tudo bem.
11. No final, confira que não sobrou nada com `[teste]` (Tarefas → Todas, Agenda, Mercado).

**Relatório que eu quero:**
- Uma tabela por tela: ação · resultado (⚡/⏳/🐢/❌) · problema visual (se houver).
- Os 5 piores problemas, do mais grave ao menos grave, com onde aconteceu e como reproduzir.
- Se viu alguma mensagem "Algo travou" ou erro, diga em qual toque.
