-- Rodar UMA vez no SQL Editor do Supabase (produção), depois do primeiro deploy.
-- Guarda URL e segredo no Vault e agenda o dispatcher a cada minuto.
-- Substitua os dois valores <...> antes de rodar. Não commitar valores reais.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<https://seu-app.vercel.app>', 'finch_app_url');
select vault.create_secret('<CRON_SECRET igual ao da Vercel>', 'finch_cron_secret');

select cron.schedule(
  'finch-notifications',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'finch_app_url') || '/api/cron/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'finch_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Conferir: select * from cron.job; select * from cron.job_run_details order by start_time desc limit 5;
-- Respostas HTTP: select * from net._http_response order by created desc limit 5;
