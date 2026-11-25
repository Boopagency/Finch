# O que depende de você

_Atualizado em 25/11/2026. Em ordem de prioridade. Tudo o que não está aqui eu consigo fazer sozinho._

## 1. Testar no iPhone (30 min)
Siga o [roteiro de testes no iPhone](TESTES_IPHONE.md). Me conte o que falhou ou ficou estranho (print ajuda).

## 2. Convidar a Duda (5 min, quando ela puder)
1. No seu iPhone: **Ajustes → Nós dois → Criar espaço Nós** (se ainda não existe).
2. **Gerar convite** com o e-mail dela → mande o link pelo WhatsApp.
3. Ela abre no **Safari**, cria a senha (ou usa a que você criou para ela no painel), adiciona à Tela de Início, entra e ativa os lembretes em Ajustes.
4. Os dois em **Finanças → Contas → Renda de referência** (só se quiserem dividir despesas proporcionalmente; o número é a única coisa compartilhada).

## 3. Cadastrar suas contas e cartões (10 min)
**Vida → Finanças → Contas e cartões**. Para cartão: limite, dia de fechamento e vencimento. Contas pessoais ficam só suas; marque "Do casal" só no que for conjunto.

## 4. Decisões pendentes
| Decisão | Recomendação | Por quê |
|---|---|---|
| **Backup** (D-009) | Agora que há dados financeiros reais: **Supabase Pro** (~US$ 25/mês, backup diário) | O plano grátis não faz backup e pausa após ~7 dias sem uso |
| **IA** (D-012) | Anthropic (Claude). Gerar uma chave em console.anthropic.com e colar na Vercel como `AI_API_KEY` (Sensitive) | Necessário só para a Etapa 7 (assistente) |
| **Domínio próprio** | Opcional. Se quiser, configure na Vercel e me avise para trocar a URL no Supabase (README → "Trocar URL") | Hoje `finch-ecru.vercel.app` funciona |

## 5. Opcionais de segurança (2 min cada, no painel do Supabase)
- **Authentication → Providers → Email**: confirme que "Allow new users to sign up" está **desligado**.
- **Authentication → Password security**: ligar "Leaked password protection" (exige plano Pro).

## 6. O que eu não consigo fazer daqui
- Criar/alterar o projeto na Vercel (sem permissão no time "Boop") e ver os deploys.
- Testar push e "Adicionar à Tela de Início" num iPhone real.
- Usar segredos (chaves) — por segurança eles nunca passam pela conversa.
