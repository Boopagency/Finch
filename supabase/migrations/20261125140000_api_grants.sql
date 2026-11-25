-- Projetos Supabase novos não expõem tabelas à API por padrão.
-- Concede explicitamente o mínimo por papel; a RLS continua filtrando as linhas.
-- Regra daqui em diante: toda tabela nova declara seus grants na própria migration.

-- usuário logado
grant select on public.profiles to authenticated;                         -- update: colunas, em core
grant select, update on public.user_settings to authenticated;
grant select on public.workspaces to authenticated;                       -- update(name), em core
grant select, delete on public.workspace_members to authenticated;        -- update(reference_income_cents), em core
grant select, insert on public.invitations to authenticated;              -- update(revoked_at), em core
grant select, delete on public.push_subscriptions to authenticated;       -- insert via RPC; update colunas
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert on public.notification_jobs to authenticated;        -- update(status, read_at)
grant select on public.notification_logs to authenticated;

-- servidor (cron, envio de push, convite). Ignora RLS por definição.
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
