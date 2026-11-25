/** "180 mercado crédito", "35,90 ifood pix", "1200 notebook 10x cartão". Sem IA. */
export type ParsedExpense = { amount: number | null; description: string; payment: "card" | "checking" | "cash" | "benefit" | null; installments: number; category: string | null; income: boolean };

const CATS: [string, RegExp][] = [
  ["Mercado", /\b(mercado|supermercado|feira|hortifruti|atacad)/i],
  ["Delivery", /\b(ifood|delivery|rappi|pedido)/i],
  ["Restaurantes", /\b(restaurante|almo[cç]o|jantar|lanche|bar|caf[eé]|padaria|pizza|hamb[uú]rguer)/i],
  ["Transporte", /\b(uber|99|t[aá]xi|gasolina|combust[ií]vel|[oô]nibus|metr[oô]|estacionamento|ped[aá]gio)/i],
  ["Moradia", /\b(aluguel|condom[ií]nio|iptu)/i],
  ["Contas", /\b(luz|energia|[aá]gua|internet|g[aá]s|celular|telefone)/i],
  ["Saúde", /\b(farm[aá]cia|rem[eé]dio|m[eé]dico|consulta|exame|dentista|plano de sa[uú]de)/i],
  ["Assinaturas", /\b(netflix|spotify|assinatura|prime|disney|youtube|icloud)/i],
  ["Lazer", /\b(cinema|show|ingresso|viagem|passeio|jogo)/i],
  ["Casa", /\b(casa|m[oó]vel|limpeza|decora)/i],
  ["Compras", /\b(roupa|sapato|presente|loja|shopping|notebook|celular novo)/i],
  ["Pets", /\b(pet|ra[cç][aã]o|veterin)/i],
];

export function guessExpenseCategory(text: string): string | null {
  for (const [name, re] of CATS) if (re.test(text)) return name;
  return null;
}

export function parseExpense(input: string): ParsedExpense {
  let s = ` ${input.trim()} `;
  let amount: number | null = null;
  const m = s.match(/\s(?:r\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?=\s)/i);
  if (m) {
    const raw = m[1]!.includes(",") ? m[1]!.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(m[1]!) ? m[1]!.replace(/\./g, "") : m[1]!;
    amount = Math.round(Number(raw) * 100);
    s = s.replace(m[0], " ");
  }
  let installments = 1;
  const inst = s.match(/\s(\d{1,2})\s*x(?=\s)|\sem\s+(\d{1,2})\s*(?:x|vezes)(?=\s)/i);
  if (inst) {
    installments = Math.min(24, Math.max(1, Number(inst[1] ?? inst[2])));
    s = s.replace(inst[0], " ");
  }
  let payment: ParsedExpense["payment"] = null;
  const pay: [ParsedExpense["payment"], RegExp][] = [
    ["card", /\s(?:no\s+)?(?:cr[eé]dito|cart[aã]o)(?=\s)/i],
    ["checking", /\s(?:no\s+)?(?:pix|d[eé]bito|boleto)(?=\s)/i],
    ["cash", /\s(?:em\s+)?dinheiro(?=\s)/i],
    ["benefit", /\s(?:no\s+)?(?:vr|va|vale)(?=\s)/i],
  ];
  for (const [p, re] of pay) {
    const x = s.match(re);
    if (x) {
      payment = p;
      s = s.replace(x[0], " ");
      break;
    }
  }
  const income = /\s(?:recebi|sal[aá]rio|receita|ganhei|reembolso)(?=\s)/i.test(s);
  const description = s.replace(/\s(?:gastei|paguei|comprei|recebi|com|no|na|de|em)(?=\s)/gi, " ").replace(/\s+/g, " ").trim();
  return {
    amount,
    description: description ? description[0]!.toUpperCase() + description.slice(1) : "",
    payment,
    installments,
    category: guessExpenseCategory(description),
    income,
  };
}
