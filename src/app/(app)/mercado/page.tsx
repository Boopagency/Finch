import { ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { NewList } from "@/features/shopping/components/new-list";
import { formatMoney } from "@/features/shopping/parse";
import { getLists, getRecentPurchases } from "@/features/shopping/server/queries";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Mercado" };
const PAY: Record<string, string> = { pix: "Pix", debito: "Débito", credito: "Crédito", dinheiro: "Dinheiro", vr: "VR", va: "VA", outro: "Outro" };

export default async function ShoppingPage() {
  const viewer = await requireViewer();
  const [{ lists, spaces }, purchases] = await Promise.all([getLists(viewer), getRecentPurchases()]);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-gutter pt-safe">
      <PageHeader title="Mercado" meta={`${lists.length} ${lists.length === 1 ? "lista" : "listas"}`} />
      <ul className="flex flex-col gap-2">
        {lists.map((l) => (
          <li key={l.id}>
            <Link prefetch href={`/mercado/${l.id}`} className="flex items-center gap-3 rounded-[22px] bg-surface p-4">
              <span className="flex flex-1 flex-col">
                <span className="flex items-center gap-2 text-[17px] font-bold">
                  {l.name}
                  {l.shared && <span className="flex items-center gap-1 rounded-full bg-lavender px-2 py-0.5 text-[11px] text-on-color"><Users className="size-3" />Nós</span>}
                </span>
                <span className="tabular text-[13px] text-ink-3">{l.pending ? `${l.pending} para comprar` : "nada pendente"}{l.total - l.pending ? ` · ${l.total - l.pending} no carrinho` : ""}</span>
              </span>
              <ChevronRight className="size-5 text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>
      <NewList spaces={spaces.map(({ id, kind, name }) => ({ id, kind, name }))} />
      {purchases.length > 0 && (
        <section aria-labelledby="compras" className="flex flex-col gap-2">
          <h2 id="compras" className="px-2 text-[13px] font-semibold text-ink-2">Últimas compras</h2>
          <ul className="flex flex-col divide-y divide-line rounded-[22px] bg-surface">
            {purchases.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col">
                  <span className="text-[15px] font-semibold">{p.store ?? "Compra"}</span>
                  <span className="text-[12px] text-ink-3">
                    {new Date(`${p.purchased_on}T12:00:00Z`).toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })} · {PAY[p.payment]} · {p.items_count} itens
                  </span>
                </span>
                <span className="tabular text-[15px] font-bold">{formatMoney(Number(p.total_cents))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
