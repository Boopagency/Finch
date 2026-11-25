"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { findValidInvite } from "./invite-lookup";

export type InviteState = { error?: string };

const acceptSchema = z.object({
  token: z.string().min(20).max(100),
  name: z.string().trim().min(1, "Diga seu nome.").max(60),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72),
});

export async function acceptInvite(_prev: InviteState, form: FormData): Promise<InviteState> {
  const parsed = acceptSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Confira os dados." };
  const { token, name, password } = parsed.data;

  const invite = await findValidInvite(token);
  if (!invite) return { error: "Esse convite expirou, foi revogado ou já foi usado. Peça um novo." };

  // cria a conta (cadastro público é desligado; só convite cria usuário)
  const admin = createServiceClient();
  const created = await admin.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name },
  });
  const alreadyExists = created.error?.code === "email_exists" || created.error?.status === 422;
  if (created.error && !alreadyExists) return { error: "Não consegui criar sua conta. Tente de novo." };

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: invite.email, password });
  if (signInError) {
    return {
      error: alreadyExists
        ? "Esse e-mail já tem conta no Finch e a senha não confere. Use a senha que você já tem."
        : "Conta criada, mas não consegui entrar. Tente entrar pela tela inicial.",
    };
  }
  const { error: acceptError } = await supabase.rpc("accept_invitation", { p_token: token });
  if (acceptError) return { error: "Não consegui aceitar o convite. Tente de novo." };
  redirect("/");
}
