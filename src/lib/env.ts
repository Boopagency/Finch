// Leitura de variáveis com erro claro. Públicas podem ir ao cliente; o resto só no servidor.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

export const publicEnv = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  vapidPublicKey: () => process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
};

export const serverEnv = {
  serviceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
  vapidPrivateKey: () => required("VAPID_PRIVATE_KEY", process.env.VAPID_PRIVATE_KEY),
  vapidSubject: () => required("VAPID_SUBJECT", process.env.VAPID_SUBJECT),
  cronSecret: () => required("CRON_SECRET", process.env.CRON_SECRET),
  appUrl: () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
};
