/** "2 leite, ovos e 1kg carne" → itens com quantidade, unidade e categoria. Sem IA. */
export type ParsedItem = { name: string; qty: number; unit: string | null; category: string };

export const CATEGORIES: [string, string][] = [
  ["hortifruti", "Hortifrúti"],
  ["padaria", "Padaria"],
  ["laticinios", "Frios e laticínios"],
  ["carnes", "Carnes"],
  ["mercearia", "Mercearia"],
  ["congelados", "Congelados"],
  ["bebidas", "Bebidas"],
  ["limpeza", "Limpeza"],
  ["higiene", "Higiene"],
  ["pet", "Pet"],
  ["outros", "Outros"],
];

const GUESS: [string, RegExp][] = [
  ["hortifruti", /\b(banana|ma[cç][aã]|laranja|lim[aã]o|tomate|alface|cebola|alho|batata|cenoura|abacate|mam[aã]o|uva|morango|abobrinha|br[oó]colis|couve|piment[aã]o|pepino|melancia|mel[aã]o|abacaxi|manga|verdura|fruta|legume|r[uú]cula|cheiro[- ]verde|gengibre)/],
  ["padaria", /\b(p[aã]o|p[aã]es|bisnaguinha|bolo|torrada|croissant|baguete)/],
  ["laticinios", /\b(leite|queijo|iogurte|manteiga|requeij[aã]o|presunto|mu[cç]arela|creme de leite|nata|ricota|peito de peru|margarina)/],
  ["carnes", /\b(carne|frango|peixe|til[aá]pia|salm[aã]o|patinho|ac[eé]m|alcatra|picanha|lingui[cç]a|bacon|costela|fil[eé]|sobrecoxa|coxa|carne mo[ií]da)/],
  ["congelados", /\b(sorvete|congelad|lasanha|pizza|hamb[uú]rguer|nuggets|pão de queijo)/],
  ["bebidas", /\b(cerveja|vinho|refrigerante|suco|[aá]gua|caf[eé]|ch[aá]|kombucha|energ[eé]tico)/],
  ["limpeza", /\b(detergente|sab[aã]o|amaciante|desinfetante|[aá]gua sanit[aá]ria|esponja|saco de lixo|multiuso|veja|lustra|alvejante|papel toalha|limpa)/],
  ["higiene", /\b(papel higi[eê]nico|shampoo|xampu|condicionador|sabonete|pasta de dente|creme dental|escova|desodorante|absorvente|fio dental|cotonete|protetor)/],
  ["pet", /\b(ra[cç][aã]o|areia|petisco|sach[eê])/],
  ["mercearia", /\b(arroz|feij[aã]o|macarr[aã]o|a[cç][uú]car|sal\b|[oó]leo|azeite|farinha|ovos?|molho|caf[eé]|aveia|granola|biscoito|bolacha|milho|ervilha|atum|sardinha|maionese|ketchup|mostarda|tempero|fermento|achocolatado|chocolate|amendoim|castanha|pipoca|vinagre)/],
];

// \b do JS não entende acentos ("água"): troca por "não precedido de letra", em modo Unicode
const GUESS_U: [string, RegExp][] = GUESS.map(([c, re]) => [c, new RegExp(re.source.replace(/\\b/g, "(?<![\\p{L}])"), "u")]);

export function guessCategory(name: string): string {
  const n = name.toLowerCase();
  // "café" e "água" de bebidas antes de mercearia; "pão de queijo" congelado antes de padaria
  if (/p[aã]o de queijo/.test(n)) return "congelados";
  for (const [cat, re] of GUESS_U) if (re.test(n)) return cat;
  return "outros";
}

export function parseItems(input: string): ParsedItem[] {
  return input
    .split(/\s*(?:(?<!\d),|,(?!\d)|;|\n|\s+e\s+)\s*/i) // vírgula decimal (1,5) não separa
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      let qty = 1;
      let unit: string | null = null;
      let name = part;
      const m = part.match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|un|dz|pct|cx)?\s+(?:de\s+)?(.+)$/i);
      if (m) {
        qty = Number(m[1]!.replace(",", "."));
        unit = m[2]?.toLowerCase() ?? null;
        name = m[3]!;
      } else {
        const t = part.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(kg|g|l|ml|un|dz|pct|cx)$/i);
        if (t) {
          name = t[1]!;
          qty = Number(t[2]!.replace(",", "."));
          unit = t[3]!.toLowerCase();
        }
      }
      name = name.trim().replace(/\s+/g, " ").slice(0, 80);
      name = name[0]!.toUpperCase() + name.slice(1);
      return { name, qty: qty > 0 && qty <= 9999 ? qty : 1, unit, category: guessCategory(name) };
    });
}

/** "R$ 12,50" / "12.5" / "1250" (centavos digitados) → centavos. */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[^\d,.]/g, "");
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

export function formatMoney(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
