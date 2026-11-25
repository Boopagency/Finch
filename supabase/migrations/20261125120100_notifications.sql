-- Finch · notificações: subscriptions, preferências, fila de jobs, logs.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text not null default 'iPhone' check (char_length(device_label) <= 40),
  user_agent text,
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  revoked_at timestamptz
);
create index push_subscriptions_user on public.push_subscriptions (user_id) where revoked_at is null;

create table public.notification_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  enabled boolean not null default true,
  lead_minutes int check (lead_minutes between 0 and 10080),
  show_details boolean not null default false, -- detalhes na tela bloqueada (finanças/saúde)
  primary key (user_id, category)
);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  source_type text,
  source_id uuid,
  scheduled_for timestamptz not null,
  essential boolean not null default false, -- essenciais ignoram horário silencioso
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'cancelled', 'failed', 'skipped')),
  dedupe_key text unique,
  title text not null check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 240),
  url text not null default '/' check (url like '/%'),
  attempts int not null default 0,
  locked_at timestamptz,
  last_error text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notification_jobs_due on public.notification_jobs (scheduled_for) where status = 'pending';
create index notification_jobs_user on public.notification_jobs (user_id, created_at desc);
create index notification_jobs_source on public.notification_jobs (source_type, source_id) where status = 'pending';

create table public.notification_logs (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.notification_jobs(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  status_code int,
  error text,
  created_at timestamptz not null default now()
);
create index notification_logs_job on public.notification_logs (job_id);

-- registra (ou transfere) a subscription do aparelho para o usuário atual
create or replace function public.register_push_subscription(
  p_endpoint text, p_p256dh text, p_auth text, p_label text, p_user_agent text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  if p_endpoint !~ '^https://' then raise exception 'invalid endpoint'; end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(coalesce(nullif(p_label, ''), 'iPhone'), 40), left(p_user_agent, 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        device_label = excluded.device_label, user_agent = excluded.user_agent, revoked_at = null
  returning id into v_id;
  return v_id;
end $$;

-- dispatcher: reivindica jobs vencidos com trava (só service_role)
create or replace function public.claim_notification_jobs(p_limit int default 50)
returns setof public.notification_jobs
language plpgsql security definer set search_path = '' as $$
begin
  -- jobs presos em "sending" há mais de 5 min voltam para a fila
  update public.notification_jobs set status = 'pending', locked_at = null
   where status = 'sending' and locked_at < now() - interval '5 minutes';

  return query
  update public.notification_jobs j
     set status = 'sending', locked_at = now(), attempts = j.attempts + 1
   where j.id in (
     select id from public.notification_jobs
      where status = 'pending' and scheduled_for <= now()
      order by scheduled_for
      limit p_limit
      for update skip locked
   )
  returning j.*;
end $$;

alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.notification_logs enable row level security;

create policy subs_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy subs_update on public.push_subscriptions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy subs_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy prefs_all on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy jobs_select on public.notification_jobs for select to authenticated
  using (user_id = (select auth.uid()));
create policy jobs_insert on public.notification_jobs for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'pending');
create policy jobs_update on public.notification_jobs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy logs_select on public.notification_logs for select to authenticated
  using (exists (select 1 from public.notification_jobs j where j.id = job_id and j.user_id = (select auth.uid())));

revoke all on public.push_subscriptions, public.notification_preferences, public.notification_jobs, public.notification_logs from anon;
revoke insert on public.push_subscriptions from authenticated;
revoke update on public.push_subscriptions from authenticated;
grant update (device_label, revoked_at) on public.push_subscriptions to authenticated;
revoke update on public.notification_jobs from authenticated;
grant update (status, read_at) on public.notification_jobs to authenticated;
revoke insert, update, delete on public.notification_logs from authenticated;

revoke execute on function public.register_push_subscription(text, text, text, text, text) from public, anon;
grant execute on function public.register_push_subscription(text, text, text, text, text) to authenticated;
revoke execute on function public.claim_notification_jobs(int) from public, anon, authenticated;
grant execute on function public.claim_notification_jobs(int) to service_role;
