import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** Cliente com o token do usuário: toda consulta passa pela RLS. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(publicEnv.supabaseUrl(), publicEnv.supabaseKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component: o proxy renova a sessão.
        }
      },
    },
  });
}

/**
 * Service role: ignora RLS. Só para cron, envio de push e criação de usuário por convite.
 * Nunca usar em resposta direta a uma ação do usuário sem checar autorização antes.
 */
export function createServiceClient() {
  return createAdminClient<Database>(publicEnv.supabaseUrl(), serverEnv.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Viewer = { id: string; email: string; name: string; tz: string };

/** Usuário atual validado (getClaims verifica a assinatura do JWT). Redireciona se não houver. */
export const requireViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/entrar");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, tz")
    .eq("id", claims.sub)
    .single();
  return {
    id: claims.sub,
    email: String(claims.email ?? ""),
    name: profile?.display_name || "você",
    tz: profile?.tz || "America/Sao_Paulo",
  };
});
