import { redirect } from "next/navigation";
import { Consent } from "@/features/mcp/components/consent";
import { anonClient } from "@/features/mcp/server/session";
import { requireViewer } from "@/lib/supabase/server";

export const metadata = { title: "Conectar ao Claude" };

/** Tela de autorização do OAuth (o Claude manda a pessoa para cá). */
export default async function AuthorizePage({ searchParams }: PageProps<"/oauth/authorize">) {
  await requireViewer();
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const clientId = one("client_id"), redirectUri = one("redirect_uri"), state = one("state");
  const { data: client } = clientId ? await anonClient().rpc("mcp_client", { p_id: clientId }) : { data: null };
  const known = client?.[0] && client[0].redirect_uris.includes(redirectUri);
  if (!known) {
    // sem cliente/endereço válidos não devolvemos nada a ninguém (proteção contra redirecionamento aberto)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 px-gutter">
        <h1 className="font-display text-[30px] font-extrabold">Pedido inválido</h1>
        <p className="text-[15px] text-ink-2">Esse link de conexão não é reconhecido. Tente conectar de novo pelo Claude.</p>
      </main>
    );
  }
  const fail = (error: string) => {
    const u = new URL(redirectUri);
    u.searchParams.set("error", error);
    if (state) u.searchParams.set("state", state);
    redirect(u.toString());
  };
  if (one("response_type") !== "code") fail("unsupported_response_type");
  if (one("code_challenge_method") !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(one("code_challenge"))) fail("invalid_request");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-gutter py-10 pt-safe">
      <Consent clientName={client[0]!.name} clientId={clientId} redirectUri={redirectUri} challenge={one("code_challenge")} state={state} />
    </main>
  );
}
