/** Coisas da casa: avisos de garantia e manutenção (datas ISO comparam como texto). */
export const KINDS: Record<string, string> = { eletro: "Eletrodoméstico", eletronico: "Eletrônico", movel: "Móvel", veiculo: "Veículo", imovel: "Imóvel", outro: "Outro" };

const plus = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export type Alert = { item_id: string; name: string; kind: "warranty" | "maintenance" | "overdue"; date: string };

/** Garantia acabando em até 30 dias; manutenção em até 7 dias ou atrasada (só a mais recente de cada item vale). */
export function homeAlerts(
  items: { id: string; name: string; warranty_until: string | null }[],
  maint: { item_id: string; done_on: string; next_on: string | null }[],
  today: string,
): Alert[] {
  const latest = new Map<string, { done_on: string; next_on: string | null }>();
  for (const m of maint) if (!latest.has(m.item_id) || m.done_on > latest.get(m.item_id)!.done_on) latest.set(m.item_id, m);
  const out: Alert[] = [];
  for (const i of items) {
    if (i.warranty_until && i.warranty_until >= today && i.warranty_until <= plus(today, 30)) out.push({ item_id: i.id, name: i.name, kind: "warranty", date: i.warranty_until });
    const next = latest.get(i.id)?.next_on;
    if (next && next < today) out.push({ item_id: i.id, name: i.name, kind: "overdue", date: next });
    else if (next && next <= plus(today, 7)) out.push({ item_id: i.id, name: i.name, kind: "maintenance", date: next });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function alertText(a: Alert): string {
  const d = new Date(`${a.date}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" }).replace(".", "");
  return a.kind === "warranty" ? `garantia acaba em ${d}` : a.kind === "overdue" ? `manutenção atrasada desde ${d}` : `manutenção em ${d}`;
}
