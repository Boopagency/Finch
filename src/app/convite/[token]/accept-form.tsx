"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { acceptInvite } from "@/features/core/server/invitations";

export function AcceptForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInvite, {});
  return (
    <form action={action} className="flex flex-col gap-4 pb-6">
      <input type="hidden" name="token" value={token} />
      <Field id="email" type="email" label="E-mail" value={email} readOnly autoComplete="username" />
      <Field id="name" name="name" label="Como quer ser chamada(o)?" autoComplete="given-name" required maxLength={60} />
      <Field
        id="password"
        name="password"
        type="password"
        label="Crie uma senha"
        hint="Mínimo de 8 caracteres. O iPhone pode guardar no app Senhas."
        autoComplete="new-password"
        minLength={8}
        required
      />
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} variant="coral" className="w-full">
        {pending ? "Entrando…" : "Aceitar e entrar"}
      </Button>
    </form>
  );
}
