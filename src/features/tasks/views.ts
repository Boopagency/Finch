/** Visões da tela de Tarefas (usadas no servidor para ler ?v= e no cliente para trocar). */
export const VIEWS = [
  ["hoje", "Hoje"],
  ["proximas", "Próximas"],
  ["entrada", "Sem data"],
  ["casa", "Casa"],
  ["quadro", "Quadro"],
  ["todas", "Todas"],
] as const;
export type View = (typeof VIEWS)[number][0];
