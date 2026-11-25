"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Escuta mudanças da lista (o outro aparelho) e recarrega os dados. RLS vale no realtime. */
export function ListRealtime({ listId }: { listId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let t: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let cancelled = false;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => router.refresh(), 250);
    };
    // o realtime precisa do token do usuário ANTES de assinar; senão entra como anônimo e a RLS bloqueia
    const { data: auth } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) void supabase.realtime.setAuth(session.access_token);
    });
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase
        .channel(`list:${listId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "shopping_items", filter: `list_id=eq.${listId}` }, refresh)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "shopping_lists", filter: `id=eq.${listId}` }, refresh)
        // ao confirmar a assinatura, recarrega uma vez: cobre o que mudou entre o carregamento e a conexão
        .subscribe((status) => status === "SUBSCRIBED" && refresh());
    });
    return () => {
      cancelled = true;
      clearTimeout(t);
      auth.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [listId, router]);
  return null;
}
