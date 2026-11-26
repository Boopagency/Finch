"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";

/** Só caminhos internos (nada de //outro-site). */
const safeNext = (n?: string) => (n && /^\/(?![\/\\])[^\s\\]*$/.test(n) ? n : "/");

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")).trim().toLowerCase(),
      password: String(form.get("password")),
    });
    if (error) {
      setPending(false);
      setError("E-mail ou senha não conferem.");
      return;
    }
    router.replace(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 pb-6">
      <Field id="email" name="email" type="email" label="E-mail" autoComplete="username" inputMode="email" required />
      <Field id="password" name="password" type="password" label="Senha" autoComplete="current-password" required />
      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-[13px] text-ink-3">O Finch é só para convidados. Recebeu um link? Abra ele direto.</p>
    </form>
  );
}
